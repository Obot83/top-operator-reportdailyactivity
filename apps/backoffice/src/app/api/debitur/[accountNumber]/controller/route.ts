import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { DebiturControllerData, RiskScore, VisitLogEntry, ApiResponse } from '@/shared/types';

const VISIT_STATUS_LABELS: Record<string, string> = {
  MET_DEBTOR: 'Ketemu Langsung',
  VACANT: 'Rumah / Tempat Usaha Kosong',
  REFUSED: 'Menolak Ditemui',
  THIRD_PARTY: 'Ditemui Pihak Ketiga',
  PHONE_CONTACT: 'Kontak Via Telepon',
  NO_CONTACT: 'Tidak Bisa Dihubungi',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { accountNumber: string } }
): Promise<NextResponse<ApiResponse<DebiturControllerData>>> {
  try {
    const { accountNumber } = params;

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
      return NextResponse.json({ success: false, error: 'Rekening tidak ditemukan' }, { status: 404 });
    }

    // Ambil timeline visit debitur
    const visitLogs = await prisma.debiturVisitLog.findMany({
      where: { debiturCif: loanAccount.debiturCif },
      include: {
        officer: { select: { name: true, role: true } },
      },
      orderBy: { visitTimestamp: 'desc' },
      take: 50,
    });

    // Hitung risk score
    const riskScore = calculateRiskScore({
      dpd: loanAccount.dpd,
      kolektibilitas: loanAccount.kolektibilitas,
      isWriteOff: loanAccount.isWriteOff,
      ptpTrackings: loanAccount.ptpTrackings as any,
      visitLogs,
    });

    // Active SP Level
    const activeSpLevel = loanAccount.suratPeringatan[0]?.spLevel ?? null;

    // Latest PENDING PTP
    const latestPTP = loanAccount.ptpTrackings.find((p) => p.status === 'PENDING') ?? null;

    const visitTimeline: VisitLogEntry[] = visitLogs.map((v) => ({
      id: v.id,
      visitTimestamp: v.visitTimestamp.toISOString(),
      officerName: v.officer.name,
      officerRole: v.officer.role as any,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      visitStatus: v.visitStatus as any,
      visitStatusLabel: VISIT_STATUS_LABELS[v.visitStatus] ?? v.visitStatus,
      reasonCategory: v.reasonCategory ?? undefined,
      reasonDetail: v.reasonDetail ?? undefined,
      photoUrls: Array.isArray(v.photoUrls) ? (v.photoUrls as string[]) : [],
      fieldNotes: v.fieldNotes ?? undefined,
      hasPTP: v.hasPTP,
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
        defaultLatitude: loanAccount.debitur.defaultLatitude
          ? Number(loanAccount.debitur.defaultLatitude) : undefined,
        defaultLongitude: loanAccount.debitur.defaultLongitude
          ? Number(loanAccount.debitur.defaultLongitude) : undefined,
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
            honoredDate: latestPTP.honoredDate?.toISOString(),
            catatan: latestPTP.catatan ?? undefined,
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
        honoredDate: p.honoredDate?.toISOString(),
        honoredNominal: p.honoredNominal ? Number(p.honoredNominal) : undefined,
        brokenAt: p.brokenAt?.toISOString(),
        brokenReason: p.brokenReason ?? undefined,
        catatan: p.catatan ?? undefined,
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

// ─── Risk Score Calculator ────────────────────────────

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
    score += 20; factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 30) {
    score += 40; factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 90) {
    score += 65; factors.push(`DPD ${params.dpd} hari - perhatian khusus`);
  } else {
    score += 85; factors.push(`DPD ${params.dpd} hari - kritis`);
  }

  // WO
  if (params.isWriteOff) { score = 100; factors.push('Rekening Write-Off'); }

  // PTP Broken
  const brokenPTP = params.ptpTrackings.filter((p) => p.status === 'BROKEN').length;
  if (brokenPTP > 2) { score += 15; factors.push(`${brokenPTP}x Janji Bayar Dilanggar`); }
  else if (brokenPTP > 0) { score += 8; factors.push(`${brokenPTP}x Janji Bayar Dilanggar`); }

  // Refused visit
  const refused = params.visitLogs.filter((v) => v.visitStatus === 'REFUSED').length;
  if (refused > 0) { score += 10; factors.push(`${refused}x Menolak Ditemui`); }

  score = Math.min(score, 100);

  return {
    score,
    label: score >= 80 ? 'KRITIS' : score >= 60 ? 'TINGGI' : score >= 30 ? 'SEDANG' : 'RENDAH',
    factors,
  };
}
