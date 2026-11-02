import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import type { DebiturControllerData, RiskScore, VisitLogEntry, PTPTrackingData, ApiResponse } from '@/shared/types';

function calculateRiskScore(params: {
  dpd: number;
  kolektibilitas: string;
  isWriteOff: boolean;
  ptpTrackings: Array<{ status: string }>;
  visitLogs: Array<{ visitStatus: string }>;
}): RiskScore {
  let score = 0;
  const factors: string[] = [];

  // DPD scoring
  if (params.dpd === 0) {
    score += 5;
  } else if (params.dpd <= 7) {
    score += 20;
    factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 30) {
    score += 40;
    factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 90) {
    score += 65;
    factors.push(`DPD ${params.dpd} hari - perhatian khusus`);
  } else {
    score += 85;
    factors.push(`DPD ${params.dpd} hari - kritis`);
  }

  // WO
  if (params.isWriteOff) {
    score = 100;
    factors.push('Rekening Write-Off');
  }

  // PTP Broken
  const brokenPTP = params.ptpTrackings.filter((p) => p.status === 'BROKEN').length;
  if (brokenPTP > 2) {
    score += 15;
    factors.push(`${brokenPTP}x Janji Bayar Dilanggar`);
  } else if (brokenPTP > 0) {
    score += 8;
    factors.push(`${brokenPTP}x Janji Bayar Dilanggar`);
  }

  // Refused visit
  const refused = params.visitLogs.filter((v) => v.visitStatus === 'REFUSED').length;
  if (refused > 0) {
    score += 10;
    factors.push(`${refused}x Menolak Ditemui`);
  }

  score = Math.min(score, 100);

  return {
    score,
    label: score >= 80 ? 'KRITIS' : score >= 60 ? 'TINGGI' : score >= 30 ? 'SEDANG' : 'RENDAH',
    factors,
  };
}

function calculateKolektibilitas(dpd: number): 'LANCAR' | 'DPK' | 'KURANG_LANCAR' | 'DIRAGUKAN' | 'MACET' {
  if (dpd <= 0) return 'LANCAR';
  if (dpd <= 90) return 'DPK';
  if (dpd <= 120) return 'KURANG_LANCAR';
  if (dpd <= 180) return 'DIRAGUKAN';
  return 'MACET';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { accountNumber: string } }
): Promise<NextResponse<ApiResponse<DebiturControllerData>>> {
  try {
    const { accountNumber } = params;

    // ── 1. Coba cari di MongoDB collection 'contract' ───────────────
    try {
      const db = await getMongoDb();
      const contract = await db.collection<any>('contract').findOne({ _id: accountNumber });

      if (contract) {
        // Ambil data leads terkait jika ada lead_id
        let lead: any = null;
        if (contract.lead_id) {
          lead = await db.collection<any>('leads').findOne({ _id: contract.lead_id });
        }

        // Ambil riwayat pembayaran dari v_backoffice_kolektor_angsuran_tertagih_list
        const payments = await db
          .collection('v_backoffice_kolektor_angsuran_tertagih_list')
          .find({ contract_id: accountNumber })
          .sort({ tgl_bayar: -1 })
          .toArray();

        // Hitung amortisasi & baki debet
        let bakiDebetPokok = 0;
        let maxDpd = 0;
        let angsuranPokok = 0;
        let angsuranBunga = 0;
        let saldoTitipan = 0;

        if (Array.isArray(contract.amortisasi)) {
          for (const a of contract.amortisasi) {
            const pokok = Number(a.pokok) || 0;
            const pokokDibayar = Number(a.pokok_dibayar) || 0;
            if (!a.payment_date && pokok > pokokDibayar) {
              bakiDebetPokok += pokok - pokokDibayar;
            }
            if (angsuranPokok === 0 && pokok > 0) angsuranPokok = pokok;
            if (angsuranBunga === 0 && (Number(a.bunga) || 0) > 0) angsuranBunga = Number(a.bunga) || 0;
            saldoTitipan += Number(a.simpanan_wajib_dibayar) || 0;

            const telat = Number(a.hari_telat_bayar) || 0;
            if (telat > maxDpd) maxDpd = telat;
          }
        } else {
          bakiDebetPokok = Number(contract.loan?.nominal_pengajuan) || 0;
        }

        const plafon = Number(contract.loan?.nominal_pengajuan) || bakiDebetPokok;
        const tenor = Number(contract.loan?.tenor) || 30;
        const kolektibilitas = calculateKolektibilitas(maxDpd);

        // Buat timeline kunjungan dari riwayat pembayaran dan settlement
        const visitTimeline: VisitLogEntry[] = payments.map((p: any) => ({
          id: p._id ? String(p._id) : `${p.contract_id}-${p.tgl_bayar}`,
          visitTimestamp: p._payment_date ? new Date(p._payment_date).toISOString() : new Date().toISOString(),
          officerName: String(p.collector ?? contract.assign_to?.name ?? 'Kolektor Lapangan'),
          officerRole: 'KOLEKTOR',
          latitude: 0,
          longitude: 0,
          visitStatus: 'MET_DEBTOR' as any,
          visitStatusLabel: 'Pembayaran Angsuran Berhasil',
          reasonCategory: 'PENAGIHAN_BERHASIL',
          reasonDetail: `Realisasi Rp ${(Number(p.nominal_dibayar) || 0).toLocaleString('id-ID')} (Angs ${p.step_tenor || '-'})`,
          fieldNotes: `Pembayaran berhasil diterima oleh kolektor ${p.collector ?? '-'}. DPD tercatat ${p.telat ?? 0} hari.`,
          photoUrls: [],
          hasPTP: false,
        }));

        // Tambahkan janji bayar jika ada flg.janji_bayar
        const ptpHistory: PTPTrackingData[] = [];
        let latestPTP: PTPTrackingData | null = null;
        if (contract.flg?.janji_bayar) {
          const ptpItem: PTPTrackingData = {
            id: `PTP-${contract._id}`,
            accountNumber,
            targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            nominalKomitmen: angsuranPokok + angsuranBunga,
            status: 'PENDING',
            catatan: 'Janji bayar aktif dicatat oleh petugas kolektor',
            createdAt: new Date().toISOString(),
          };
          ptpHistory.push(ptpItem);
          latestPTP = ptpItem;
        }

        const riskScore = calculateRiskScore({
          dpd: maxDpd,
          kolektibilitas,
          isWriteOff: contract.status_kontrak === 'NON AKTIF' && maxDpd > 90,
          ptpTrackings: ptpHistory,
          visitLogs: visitTimeline,
        });

        const debiturName = String(contract.debitur?.name || lead?.pemohon?.name || 'Tanpa Nama');
        const phone = String(contract.debitur?.no_hp || lead?.pemohon?.phone_number || '-');
        const nik = String(lead?.pemohon?.ktp?.identity_number || '-');
        const address = [
          contract.alamat?.alamat,
          contract.alamat?.kelurahan,
          contract.alamat?.kecamatan,
          contract.alamat?.kota,
          contract.alamat?.provinsi,
        ]
          .filter(Boolean)
          .join(', ') || 'Alamat Belum Terdaftar';

        const responseData: DebiturControllerData = {
          debitur: {
            id: String(contract._id),
            cif: contract.lead_id ? String(contract.lead_id) : String(contract._id),
            name: debiturName,
            nik,
            phone,
            gender: lead?.pemohon?.ktp?.gender?.name ?? 'P',
            domisiliAddress: address,
            domisiliKecamatan: contract.alamat?.kecamatan ?? '',
            domisiliKota: contract.alamat?.kota ?? '',
            usahaAddress: contract.alamat?.alamat ?? '',
          },
          loanAccount: {
            id: String(contract._id),
            accountNumber,
            debiturCif: contract.lead_id ? String(contract.lead_id) : String(contract._id),
            debiturName,
            productName: plafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI',
            plafon,
            bakiDebetPokok,
            saldoTitipan,
            tenorMinggu: tenor,
            angsuranPokok,
            angsuranBunga,
            totalAngsuran: angsuranPokok + angsuranBunga,
            dpd: maxDpd,
            kolektibilitas,
            isWriteOff: contract.status_kontrak === 'NON AKTIF' && maxDpd > 90,
            autodebitEnabled: false,
            tanggalAkad: contract.contract_date ? new Date(contract.contract_date).toISOString() : new Date().toISOString(),
          },
          riskScore,
          activeSpLevel: maxDpd >= 90 ? 'SP3' : maxDpd >= 60 ? 'SP2' : maxDpd >= 30 ? 'SP1' : null,
          latestPTP,
          visitTimeline,
          ptpHistory,
        };

        return NextResponse.json({ success: true, data: responseData });
      }
    } catch (mongoErr) {
      console.warn('[Debitur Controller] MongoDB lookup failed, checking Prisma MySQL:', mongoErr);
    }

    // ── 2. Fallback ke Prisma MySQL ───────────────────────────────
    const loanAccount = await prisma.loanAccount.findUnique({
      where: { accountNumber },
      include: {
        debitur: true,
        ptpTrackings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        suratPeringatan: {
          orderBy: { tanggalTerbit: 'desc' },
          take: 5,
        },
      },
    });

    if (!loanAccount) {
      return NextResponse.json({ success: false, error: 'Rekening / Kontrak tidak ditemukan' }, { status: 404 });
    }

    const visitLogs = await prisma.debiturVisitLog.findMany({
      where: { debiturCif: loanAccount.debiturCif },
      include: {
        officer: { select: { name: true, role: true } },
      },
      orderBy: { visitTimestamp: 'desc' },
      take: 50,
    });

    const activeSpLevel = loanAccount.suratPeringatan[0]?.spLevel ?? null;
    const latestPTP = loanAccount.ptpTrackings.find((p) => p.status === 'PENDING') ?? null;

    const visitTimeline: VisitLogEntry[] = visitLogs.map((v) => ({
      id: v.id,
      visitTimestamp: v.visitTimestamp.toISOString(),
      officerName: v.officer.name,
      officerRole: v.officer.role as any,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      visitStatus: v.visitStatus as any,
      reasonCategory: v.reasonCategory ?? undefined,
      reasonDetail: v.reasonDetail ?? undefined,
      photoUrls: Array.isArray(v.photoUrls) ? (v.photoUrls as string[]) : [],
      fieldNotes: v.fieldNotes ?? undefined,
      hasPTP: v.hasPTP,
    }));

    const riskScore = calculateRiskScore({
      dpd: loanAccount.dpd,
      kolektibilitas: loanAccount.kolektibilitas,
      isWriteOff: loanAccount.isWriteOff,
      ptpTrackings: loanAccount.ptpTrackings as any,
      visitLogs,
    });

    const response: DebiturControllerData = {
      debitur: {
        cif: loanAccount.debitur.cif,
        nik: loanAccount.debitur.nik,
        name: loanAccount.debitur.name,
        phone: loanAccount.debitur.phone,
        gender: loanAccount.debitur.gender as any,
        domisiliAddress: loanAccount.debitur.domisiliAddress,
        domisiliKecamatan: loanAccount.debitur.domisiliKecamatan,
        domisiliKota: loanAccount.debitur.domisiliKota,
        usahaAddress: loanAccount.debitur.usahaAddress ?? undefined,
      },
      loanAccount: {
        accountNumber: loanAccount.accountNumber,
        debiturCif: loanAccount.debiturCif,
        debiturName: loanAccount.debitur.name,
        productName: loanAccount.productName,
        plafon: Number(loanAccount.plafon),
        bakiDebetPokok: Number(loanAccount.bakiDebetPokok),
        saldoTitipan: Number(loanAccount.saldoTitipan),
        tenorMinggu: loanAccount.tenorMinggu,
        angsuranPokok: Number(loanAccount.angsuranPokok),
        angsuranBunga: Number(loanAccount.angsuranBunga),
        totalAngsuran: Number(loanAccount.totalAngsuran),
        dpd: loanAccount.dpd,
        kolektibilitas: loanAccount.kolektibilitas as any,
        isWriteOff: loanAccount.isWriteOff,
        autodebitEnabled: loanAccount.autodebitEnabled,
      },
      latestPTP: latestPTP
        ? {
            id: latestPTP.id,
            accountNumber: latestPTP.accountNumber,
            targetDate: latestPTP.targetDate.toISOString(),
            nominalKomitmen: Number(latestPTP.nominalKomitmen),
            status: latestPTP.status as any,
            createdAt: latestPTP.createdAt.toISOString(),
          }
        : null,
      activeSpLevel: activeSpLevel as any,
      visitTimeline,
      ptpHistory: loanAccount.ptpTrackings.map((p) => ({
        id: p.id,
        accountNumber: p.accountNumber,
        targetDate: p.targetDate.toISOString(),
        nominalKomitmen: Number(p.nominalKomitmen),
        status: p.status as any,
        createdAt: p.createdAt.toISOString(),
      })),
      riskScore,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[Debitur Controller]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data controller debitur' },
      { status: 500 }
    );
  }
}
