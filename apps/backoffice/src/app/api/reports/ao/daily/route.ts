import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { AODailyReport, AOActivityEntry, ApiResponse } from '@/shared/types';

const AO_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  PROSPEK: 'Draft Prospek',
  SURVEY_AGUNAN: 'Survei Lapangan',
  VERIFIKASI: 'Review Komite',
  BOOKING: 'Booking Pencairan',
  REALISASI: 'Pencairan',
  POTONGAN_TITIPAN: 'Titipan Muka',
};

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<AODailyReport>>> {
  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const branchCode = searchParams.get('branchCode');
    const aoId = searchParams.get('aoId');

    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch branch info
    const branch = branchCode
      ? await prisma.branch.findUnique({ where: { code: branchCode } })
      : null;

    const activities = await prisma.aOActivity.findMany({
      where: {
        activityDate: { gte: startOfDay, lte: endOfDay },
        ...(aoId && { aoId }),
        ...(branchCode && {
          ao: { branch: { code: branchCode } },
        }),
      },
      include: {
        ao: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: [{ activityDate: 'asc' }, { createdAt: 'asc' }],
    });

    const totalProspek = activities.filter((a) => a.activityType === 'PROSPEK').length;
    const totalSurvei = activities.filter((a) => a.activityType === 'SURVEY_AGUNAN').length;
    const totalVerifikasi = activities.filter((a) => a.activityType === 'VERIFIKASI').length;
    const totalBooking = activities.filter((a) => a.activityType === 'BOOKING').length;
    const totalRealisasi = activities.filter((a) => a.activityType === 'REALISASI').length;
    const conversionRate = totalProspek > 0
      ? Math.round((totalBooking / totalProspek) * 10000) / 100
      : 0;

    const totalNominalRealisasi = activities
      .filter((a) => a.activityType === 'REALISASI')
      .reduce((acc, a) => acc + Number(a.nominalRealisasi ?? 0), 0);

    const totalTitipanMuka = activities
      .filter((a) => a.activityType === 'POTONGAN_TITIPAN')
      .reduce((acc, a) => acc + Number(a.nominalTitipanMuka ?? 0), 0);

    const activityEntries: AOActivityEntry[] = activities.map((a) => ({
      id: a.id,
      aoId: a.aoId,
      aoName: a.ao.name,
      activityDate: a.activityDate.toISOString(),
      activityType: a.activityType as any,
      activityTypeLabel: AO_ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType,
      prospekName: a.prospekName ?? undefined,
      prospekNominalPengajuan: a.prospekNominalPengajuan ? Number(a.prospekNominalPengajuan) : undefined,
      nominalRealisasi: a.nominalRealisasi ? Number(a.nominalRealisasi) : undefined,
      nominalTitipanMuka: a.nominalTitipanMuka ? Number(a.nominalTitipanMuka) : undefined,
      accountNumber: a.accountNumber ?? undefined,
      status: a.status,
      catatan: a.catatan ?? undefined,
      latitude: a.latitude ? Number(a.latitude) : undefined,
      longitude: a.longitude ? Number(a.longitude) : undefined,
      photoUrls: a.photoUrls,
    }));

    const report: AODailyReport = {
      reportDate: date,
      branchCode: branch?.code ?? 'ALL',
      branchName: branch?.name ?? 'Semua Cabang',
      summary: {
        totalProspek,
        totalSurvei,
        totalVerifikasi,
        totalBooking,
        totalRealisasi,
        conversionRate,
        totalNominalRealisasi,
        totalTitipanMuka,
      },
      activities: activityEntries,
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[AO Daily Report]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil laporan harian AO' },
      { status: 500 }
    );
  }
}
