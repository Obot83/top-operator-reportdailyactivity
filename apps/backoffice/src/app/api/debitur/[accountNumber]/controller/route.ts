import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import type {
  DebiturControllerData,
  RiskScore,
  VisitLogEntry,
  PTPTrackingData,
  ApiResponse,
  DebtorCustomerDetail,
  DebtorSpouseDetail,
  DebtorGuarantorDetail,
  DebtorCollateralDetail,
  DebtorCollateralFile,
  DebtorCreditCapacity,
  DebtorOtherContractItem,
} from '@/shared/types';

function categorizeAgunanFile(f: any): { category: DebtorCollateralFile['category']; categoryLabel: string } {
  const name = String(f.name || '').toUpperCase();
  const notes = String(f.notes || '').toUpperCase();

  if (
    name.includes('SHM') ||
    name.includes('SHGB') ||
    notes.includes('SHM') ||
    notes.includes('SHGB') ||
    notes.includes('SERTIFIKAT') ||
    name === 'DOC_AGUNAN' ||
    name === 'DOC_PDF'
  ) {
    return { category: 'SERTIFIKAT', categoryLabel: 'Dokumen Sertifikat & Legalitas (SHM/SHGB)' };
  }
  if (
    name.includes('DEPAN') ||
    name.includes('KANAN') ||
    name.includes('KIRI') ||
    name.includes('BELAKANG') ||
    name.includes('JALAN') ||
    name.includes('MIRING') ||
    notes.includes('RUMAH_LUAR') ||
    notes.includes('RKO') ||
    notes.includes('TNH')
  ) {
    return { category: 'FOTO_EKSTERIOR', categoryLabel: 'Foto Tampak Luar / Eksterior Agunan' };
  }
  if (
    name.includes('DALAM') ||
    name.includes('RUANG') ||
    name.includes('KAMAR') ||
    name.includes('DAPUR') ||
    name.includes('LISTRIK') ||
    notes.includes('RUMAH_DALAM')
  ) {
    return { category: 'FOTO_INTERIOR', categoryLabel: 'Foto Tampak Dalam / Interior Agunan' };
  }
  if (name.includes('SURVEY') || f.location?.coordinates) {
    return { category: 'SURVEY_LOKASI', categoryLabel: 'Foto & Titik Koordinat Lokasi Survey Agunan' };
  }
  return { category: 'LAINNYA', categoryLabel: 'Foto Pendukung Agunan' };
}

function isAgunanFile(f: any): boolean {
  const name = String(f.name || '').toUpperCase();
  const notes = String(f.notes || '').toUpperCase();

  // Exclude purely personal identity files
  if (name.includes('KTP_PEMOHON') || name.includes('KTP_PASANGAN') || name.includes('SLIK')) {
    return false;
  }
  if (name === 'DOC_IDENTITAS' && !notes.includes('RUMAH') && !notes.includes('AGUNAN') && !notes.includes('SERTIFIKAT')) {
    return false;
  }
  if (name.includes('FACE_IMAGE') || name.includes('PEFINDO')) {
    return false;
  }

  // Include agunan and physical inspection files
  if (
    name.includes('SHM') ||
    name.includes('SHGB') ||
    name === 'DOC_AGUNAN' ||
    name === 'DOC_MAIN-FOTO-AGUNAN' ||
    name.includes('TAMPAK') ||
    name.includes('DAPUR') ||
    name.includes('RUANG TAMU') ||
    name.includes('KAMAR') ||
    name.includes('LISTRIK') ||
    name.includes('SURVEY') ||
    notes.includes('SHM') ||
    notes.includes('SHGB') ||
    notes.includes('SERTIFIKAT') ||
    notes.includes('RMH') ||
    notes.includes('RUMAH') ||
    notes.includes('TNH') ||
    notes.includes('RKO')
  ) {
    return true;
  }
  return false;
}

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
        // Ambil data leads terkait jika ada lead_id atau cocok nama pemohon
        let lead: any = null;
        if (contract.lead_id) {
          lead = await db.collection<any>('leads').findOne({ _id: contract.lead_id });
        }
        if (!lead && contract.debitur?.name) {
          lead = await db.collection<any>('leads').findOne({ 'pemohon.name': contract.debitur.name });
        }

        const nik = String(lead?.pemohon?.ktp?.identity_number || contract.debitur?.nik || '');

        // ── Temukan Seluruh Kontrak Lainnya untuk Debitur / NIK ini ─────
        const relatedQuery: any[] = [];
        if (nik) {
          const relatedLeads = await db
            .collection('leads')
            .find({ 'pemohon.ktp.identity_number': nik }, { projection: { _id: 1 } })
            .toArray();
          const relatedLeadIds = relatedLeads.map((l) => l._id);
          if (relatedLeadIds.length > 0) {
            relatedQuery.push({ lead_id: { $in: relatedLeadIds } });
          }
        }
        if (contract.debitur?.name) {
          relatedQuery.push({ 'debitur.name': contract.debitur.name });
        }
        if (lead?.pemohon?.name && lead.pemohon.name !== contract.debitur?.name) {
          relatedQuery.push({ 'debitur.name': lead.pemohon.name });
        }
        if (contract.lead_id) {
          relatedQuery.push({ lead_id: contract.lead_id });
        }

        const rawOtherContracts = await db
          .collection<any>('contract')
          .find(relatedQuery.length > 0 ? { $or: relatedQuery } : ({ _id: accountNumber } as any))
          .sort({ contract_date: -1 })
          .toArray();

        // Hindari duplikasi jika ada query or yang tumpang tindih
        const uniqueContractMap = new Map<string, any>();
        for (const oc of rawOtherContracts) {
          uniqueContractMap.set(String(oc._id), oc);
        }
        // Pastikan kontrak saat ini masuk
        if (!uniqueContractMap.has(String(contract._id))) {
          uniqueContractMap.set(String(contract._id), contract);
        }

        const otherContracts: DebtorOtherContractItem[] = Array.from(uniqueContractMap.values())
          .map((oc: any) => {
            let ocBakiDebet = 0;
            let ocMaxDpd = 0;
            if (Array.isArray(oc.amortisasi)) {
              for (const a of oc.amortisasi) {
                const pokok = Number(a.pokok) || 0;
                const pokokDibayar = Number(a.pokok_dibayar) || 0;
                if (!a.payment_date && pokok > pokokDibayar) {
                  ocBakiDebet += pokok - pokokDibayar;
                }
                const telat = Number(a.hari_telat_bayar) || 0;
                if (telat > ocMaxDpd) ocMaxDpd = telat;
              }
            } else {
              ocBakiDebet = Number(oc.loan?.nominal_pengajuan) || 0;
            }

            const ocPlafon = Number(oc.loan?.nominal_pengajuan) || ocBakiDebet;
            const ocTenor = Number(oc.loan?.tenor) || 30;

            return {
              accountNumber: String(oc._id),
              productName: ocPlafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI',
              contractDate: oc.contract_date ? new Date(oc.contract_date).toISOString().slice(0, 10) : '-',
              plafon: ocPlafon,
              bakiDebetPokok: ocBakiDebet,
              tenor: ocTenor,
              dpd: ocMaxDpd,
              kolektibilitas: calculateKolektibilitas(ocMaxDpd),
              status: String(oc.status_kontrak ?? 'AKTIF'),
              isCurrent: String(oc._id) === accountNumber,
            };
          })
          .sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime();
          });

        // ── Data Riwayat Pembayaran & Kunjungan ────────────────────────
        const payments = await db
          .collection('v_backoffice_kolektor_angsuran_tertagih_list')
          .find({ contract_id: accountNumber })
          .sort({ tgl_bayar: -1 })
          .toArray();

        // Hitung amortisasi & baki debet kontrak aktif
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
        const resolvedNik = String(nik || '-');

        const address = [
          contract.alamat?.alamat,
          contract.alamat?.kelurahan,
          contract.alamat?.kecamatan,
          contract.alamat?.kota,
          contract.alamat?.provinsi,
        ]
          .filter(Boolean)
          .join(', ') || 'Alamat Belum Terdaftar';

        // ── 5. Data Detail Nasabah ───────────────────────────────────
        const pemohon = lead?.pemohon;
        const ktp = pemohon?.ktp;
        const domisili = pemohon?.domisili;

        let age: number | undefined = undefined;
        if (ktp?.birth_date) {
          const bDate = new Date(ktp.birth_date);
          if (!isNaN(bDate.getTime())) {
            const diffMs = Date.now() - bDate.getTime();
            age = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
          }
        }

        const ktpAddressParts = [
          ktp?.address,
          ktp?.rt ? `RT ${ktp.rt}` : '',
          ktp?.rw ? `RW ${ktp.rw}` : '',
          ktp?.subdistricts?.name || (typeof ktp?.subdistricts === 'string' ? ktp.subdistricts : ''),
          ktp?.districts,
          ktp?.city,
          ktp?.province,
          ktp?.postal_code ? `Kode Pos ${ktp.postal_code}` : '',
        ].filter(Boolean);

        const domisiliAddressParts = [
          domisili?.address || address,
          domisili?.rt ? `RT ${domisili.rt}` : '',
          domisili?.rw ? `RW ${domisili.rw}` : '',
          domisili?.subdistricts?.name || (typeof domisili?.subdistricts === 'string' ? domisili.subdistricts : ''),
          domisili?.districts,
          domisili?.city,
          domisili?.province,
          domisili?.postal_code ? `Kode Pos ${domisili.postal_code}` : '',
        ].filter(Boolean);

        const customerDetail: DebtorCustomerDetail = {
          nik: resolvedNik,
          name: debiturName,
          title: pemohon?.title?.name || undefined,
          phone,
          birthPlace: ktp?.birth_place || undefined,
          birthDate: ktp?.birth_date ? new Date(ktp.birth_date).toISOString().slice(0, 10) : undefined,
          age,
          gender:
            ktp?.gender?.name ||
            pemohon?.gender?.name ||
            (ktp?.gender?.id === 'L' ? 'Laki-laki' : ktp?.gender?.id === 'P' ? 'Perempuan' : undefined),
          religion: ktp?.religion?.name || undefined,
          maritalStatus: ktp?.marital?.name || pemohon?.marital?.name || undefined,
          dependentsCount: typeof pemohon?.jumlah_tanggungan === 'number' ? pemohon.jumlah_tanggungan : undefined,
          occupation: pemohon?.pekerjaan?.name || (typeof pemohon?.pekerjaan === 'string' ? pemohon.pekerjaan : undefined),
          motherName: pemohon?.mother_name || pemohon?.nama_gadis_ibu_kandung || undefined,
          ktpAddress: ktpAddressParts.join(', ') || undefined,
          domisiliAddress: domisiliAddressParts.join(', ') || address,
          rtRw: ktp?.rt && ktp?.rw ? `${ktp.rt} / ${ktp.rw}` : undefined,
          subdistrict: ktp?.subdistricts?.name || (typeof ktp?.subdistricts === 'string' ? ktp.subdistricts : undefined),
          district: ktp?.districts || undefined,
          city: ktp?.city || undefined,
          province: ktp?.province || undefined,
          postalCode: ktp?.postal_code ? String(ktp.postal_code) : undefined,
        };

        // ── 6. Data Pasangan ─────────────────────────────────────────
        const sp = lead?.spouse;
        const spKtp = sp?.ktp;
        const hasSpouse = Boolean(sp?.name || spKtp?.identity_number);
        const spouseAddressParts = [
          spKtp?.address,
          spKtp?.rt ? `RT ${spKtp.rt}` : '',
          spKtp?.rw ? `RW ${spKtp.rw}` : '',
          spKtp?.subdistricts?.name || (typeof spKtp?.subdistricts === 'string' ? spKtp.subdistricts : ''),
          spKtp?.districts,
          spKtp?.city,
          spKtp?.province,
        ].filter(Boolean);

        const spouse: DebtorSpouseDetail = {
          hasSpouse,
          name: sp?.name || undefined,
          nik: spKtp?.identity_number || undefined,
          birthPlace: spKtp?.birth_place || undefined,
          birthDate: spKtp?.birth_date ? new Date(spKtp.birth_date).toISOString().slice(0, 10) : undefined,
          phone: sp?.phone_number || undefined,
          occupation: sp?.pekerjaan?.name || (typeof sp?.pekerjaan === 'string' ? sp.pekerjaan : undefined),
          religion: spKtp?.religion?.name || sp?.religion?.name || undefined,
          address: spouseAddressParts.join(', ') || undefined,
        };

        // ── 7. Data Penjamin (LEC / Guarantor) ────────────────────────
        const guarantors: DebtorGuarantorDetail[] = [];
        if (Array.isArray(lead?.lec)) {
          for (const item of lead.lec) {
            const itemKtp = item.ktp;
            const addr = [
              itemKtp?.address,
              itemKtp?.rt ? `RT ${itemKtp.rt}` : '',
              itemKtp?.rw ? `RW ${itemKtp.rw}` : '',
              itemKtp?.subdistricts?.name || (typeof itemKtp?.subdistricts === 'string' ? itemKtp.subdistricts : ''),
              itemKtp?.districts,
              itemKtp?.city,
              itemKtp?.province,
            ]
              .filter(Boolean)
              .join(', ');

            guarantors.push({
              id: String(item.id || itemKtp?.identity_number || ''),
              name: String(item.name || 'Penjamin'),
              relation: String(item.relation || 'PENJAMIN / KONTAK DARURAT'),
              nik: itemKtp?.identity_number || undefined,
              phone: item.phone_number || undefined,
              occupation: item.pekerjaan?.name || (typeof item.pekerjaan === 'string' ? item.pekerjaan : undefined),
              address: addr || undefined,
              ktpPhotoUrl: item.path || undefined,
            });
          }
        }
        if (lead?.penjamin && !guarantors.some((g) => g.name === lead.penjamin.name)) {
          guarantors.push({
            name: lead.penjamin.name,
            relation: lead.penjamin.hubungan || 'PENJAMIN',
            nik: lead.penjamin.nik || undefined,
            phone: lead.penjamin.phone || lead.penjamin.no_hp || undefined,
            occupation: lead.penjamin.pekerjaan || undefined,
            address: lead.penjamin.alamat || undefined,
          });
        }

        // ── 8. Pengecekan Produk: UMI vs SERTIFIKAT ─────────────────
        const rawProductName = String(
          lead?.pengajuan?.product?.product_name ||
          contract.loan?.product_name ||
          (plafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI')
        ).toUpperCase();

        const certsList = Array.isArray(lead?.pengajuan?.product?.certificates_name)
          ? (lead.pengajuan.product.certificates_name as string[])
          : [];
        const hasCertificates = certsList.length > 0;
        const productId = String(lead?.pengajuan?.product?.id || '');

        const isCertificateProduct =
          rawProductName.includes('SERTIFIKAT') ||
          rawProductName.includes('KSP') ||
          ['006', '007', '008', '009'].includes(productId) ||
          hasCertificates;

        const isUmiProduct = !isCertificateProduct;
        const productCategory: 'UMI' | 'SERTIFIKAT' | 'LAINNYA' = isCertificateProduct
          ? 'SERTIFIKAT'
          : isUmiProduct
          ? 'UMI'
          : 'LAINNYA';

        // ── 9. Data Agunan ───────────────────────────────────────────
        // Jika produk adalah UMI: Data Agunan (Jaminan) TIDAK ADA
        // Jika produk adalah Sertifikat: Data Agunan direlasikan ke collection 'files' di MongoDB dengan relasi "ref_id": Leads ID
        const collaterals: DebtorCollateralDetail[] = [];
        const targetLeadId = String(contract.lead_id || lead?._id || '');

        if (isCertificateProduct && targetLeadId) {
          const allFiles = await db
            .collection<any>('files')
            .find({ ref_id: targetLeadId })
            .sort({ create_dtm: -1 })
            .toArray();

          const agunanFiles: DebtorCollateralFile[] = [];

          for (const f of allFiles) {
            if (isAgunanFile(f)) {
              const { category, categoryLabel } = categorizeAgunanFile(f);
              const coords = f.location?.coordinates;
              const lng = Array.isArray(coords) && typeof coords[0] === 'number' ? coords[0] : null;
              const lat = Array.isArray(coords) && typeof coords[1] === 'number' ? coords[1] : null;

              agunanFiles.push({
                id: String(f._id),
                name: String(f.name || 'Dokumen Agunan'),
                category,
                categoryLabel,
                notes: f.notes ? String(f.notes) : null,
                path: String(f.path || ''),
                from: f.from ? String(f.from) : undefined,
                latitude: lat,
                longitude: lng,
                createdAt: f.create_dtm ? new Date(f.create_dtm).toISOString() : undefined,
              });
            }
          }

          let unitName = 'Agunan Sertifikat Properti (Tanah & Bangunan)';
          let certType = certsList.join(' / ') || 'SHM / SHGB';
          let taksasi = 0;
          let loc = '';

          if (Array.isArray(contract.detail_agunan) && contract.detail_agunan.length > 0) {
            const ag0 = contract.detail_agunan[0];
            if (ag0.unit_name) unitName = ag0.unit_name;
            if (ag0.certificate_type) certType = ag0.certificate_type;
            if (ag0.taksasi) taksasi = Number(ag0.taksasi) || 0;
            if (ag0.city_province) loc = ag0.city_province;
          }

          const surveyWithGps = agunanFiles.find((af) => af.latitude && af.longitude);
          if (!loc && surveyWithGps) {
            loc = `Koordinat GPS: ${surveyWithGps.latitude}, ${surveyWithGps.longitude}`;
          }

          collaterals.push({
            unitName,
            certificateType: certType,
            taksasi: taksasi > 0 ? taksasi : undefined,
            location: loc || undefined,
            leadId: targetLeadId,
            description: `Data agunan terhubung dengan collection files MongoDB (ref_id: ${targetLeadId})`,
            files: agunanFiles,
          });
        }

        // ── 9. Kapasitas Kredit ──────────────────────────────────────
        const pengajuan = lead?.pengajuan;
        const submissionLoan =
          Number(pengajuan?.submission?.loan?.$numberDecimal || pengajuan?.submission?.loan) || plafon;
        const submissionTenor = Number(pengajuan?.submission?.tenor) || tenor;
        const submissionTenorType =
          pengajuan?.submission?.tenor_type_name || pengajuan?.product?.tenor_type || 'MINGGU';

        const surveyorRec = lead?.rekomendasi?.surveyor;
        const analystRec = lead?.rekomendasi?.credit_analyst;

        const creditCapacity: DebtorCreditCapacity = {
          plafonPengajuan: submissionLoan,
          tenorPengajuan: submissionTenor,
          tenorType: submissionTenorType,
          paketName: pengajuan?.product?.paket_name || undefined,
          loanPurpose: pengajuan?.loan_purpose?.name || undefined,
          scoringGrade:
            typeof lead?.scoring_grade === 'string'
              ? lead.scoring_grade
              : lead?.scoring_grade?.grade || undefined,
          surveyorRecommendation: surveyorRec
            ? {
                status: surveyorRec.status || undefined,
                plafon:
                  Number(surveyorRec.submission?.loan?.$numberDecimal || surveyorRec.submission?.loan) || undefined,
                tenor: Number(surveyorRec.submission?.tenor) || undefined,
                keterangan: surveyorRec.keterangan || undefined,
                officerName: surveyorRec.by || undefined,
              }
            : undefined,
          analystRecommendation: analystRec
            ? {
                status: analystRec.status || undefined,
                plafon:
                  Number(analystRec.submission?.loan?.$numberDecimal || analystRec.submission?.loan) || undefined,
                tenor: Number(analystRec.submission?.tenor) || undefined,
                keterangan: analystRec.keterangan || undefined,
                analystName: analystRec.by || undefined,
              }
            : undefined,
          angsuranEstimasi: angsuranPokok + angsuranBunga,
          saldoTitipan,
        };

        const responseData: DebiturControllerData = {
          debitur: {
            id: String(contract._id),
            cif: contract.lead_id ? String(contract.lead_id) : String(contract._id),
            name: debiturName,
            nik: resolvedNik,
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
            productName: isCertificateProduct
              ? (lead?.pengajuan?.product?.product_name || 'Pinjaman Sertifikat')
              : 'Pembiayaan Mikro UMI',
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
          customerDetail,
          spouse,
          guarantors,
          collaterals,
          creditCapacity,
          otherContracts,
          productCategory,
          isUmiProduct,
          isCertificateProduct,
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

    // Cari rekening lain di MySQL Prisma untuk debitur ini
    const prismaOtherLoans = await prisma.loanAccount.findMany({
      where: { debiturCif: loanAccount.debiturCif },
      orderBy: { tanggalAkad: 'desc' },
    });

    const otherContracts: DebtorOtherContractItem[] = prismaOtherLoans.map((pl) => ({
      accountNumber: pl.accountNumber,
      productName: pl.productName,
      contractDate: pl.tanggalAkad.toISOString().slice(0, 10),
      plafon: Number(pl.plafon),
      bakiDebetPokok: Number(pl.bakiDebetPokok),
      tenor: pl.tenorMinggu,
      dpd: pl.dpd,
      kolektibilitas: pl.kolektibilitas as any,
      status: pl.isActive ? 'AKTIF' : 'LUNAS',
      isCurrent: pl.accountNumber === accountNumber,
    }));

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
      customerDetail: {
        nik: loanAccount.debitur.nik,
        name: loanAccount.debitur.name,
        phone: loanAccount.debitur.phone ?? '-',
        domisiliAddress: loanAccount.debitur.domisiliAddress,
        district: loanAccount.debitur.domisiliKecamatan,
        city: loanAccount.debitur.domisiliKota,
      },
      spouse: { hasSpouse: false },
      guarantors: [],
      collaterals: [],
      creditCapacity: {
        plafonPengajuan: Number(loanAccount.plafon),
        tenorPengajuan: loanAccount.tenorMinggu,
        tenorType: 'MINGGU',
        angsuranEstimasi: Number(loanAccount.totalAngsuran),
        saldoTitipan: Number(loanAccount.saldoTitipan),
      },
      otherContracts,
      productCategory: 'UMI',
      isUmiProduct: true,
      isCertificateProduct: false,
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
