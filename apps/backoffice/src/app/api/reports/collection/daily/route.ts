import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { CollectionDailyReport, CollectorSummary, CollectionTotals, ApiResponse } from '@/shared/types';
import { getDpdBucket, getISOWeekString } from '@/lib/helpers';

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<CollectionDailyReport>>> {
  try {
    const { searchParams } = req.nextUrl;
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const branchCode = searchParams.get('branchCode');

    // Hitung periode tagih (tahun-minggu ISO)
    const periodeTagih = getISOWeekString(new Date(date));

    const tasks = await prisma.collectionTask.findMany({
      where: {
        periodeTagih,
        ...(branchCode && {
          loanAccount: { branch: { code: branchCode } },
        }),
      },
      include: {
        officer: { select: { id: true, name: true } },
        loanAccount: {
          include: {
            debitur: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: [{ officerId: 'asc' }, { tanggalTagih: 'asc' }],
    });

    // Kelompokkan per kolektor
    const byCollector = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const existing = byCollector.get(task.officerId) ?? [];
      existing.push(task);
      byCollector.set(task.officerId, existing);
    }

    const collectorSummaries: CollectorSummary[] = [];
    const grandTotals: CollectionTotals = createEmptyTotals();

    byCollector.forEach((ctasks, collectorId) => {
      const collector = ctasks[0].officer;
      const totals = createEmptyTotals();

      const taskEntries = ctasks.map((t) => {
        const dpd = t.loanAccount.dpd;
        const dpdBucket = getDpdBucket(dpd);

        const sudahBayar = t.statusBayar === 'SUDAH_BAYAR';
        const belumDikunjungi = t.statusBayar === 'BELUM_DIKUNJUNGI';
        const janjiBayar = t.statusBayar === 'JANJI_BAYAR';

        // Akumulasi totals
        totals.totalDebitur = (totals.totalDebitur ?? 0) + 1;
        if (sudahBayar) totals.sudahBayar = (totals.sudahBayar ?? 0) + 1;
        if (belumDikunjungi) totals.belumDikunjungi = (totals.belumDikunjungi ?? 0) + 1;
        if (janjiBayar) totals.janjieBayar = (totals.janjieBayar ?? 0) + 1;
        totals.tagihanPokok = (totals.tagihanPokok ?? 0) + Number(t.tagihanPokok);
        totals.tagihanBunga = (totals.tagihanBunga ?? 0) + Number(t.tagihanBunga);
        totals.tagihanDenda = (totals.tagihanDenda ?? 0) + Number(t.tagihanDenda);
        totals.realisasiPokok += Number(t.terealisasiPokok);
        totals.realisasiBunga += Number(t.terealisasiBunga);
        totals.realisasiDenda += Number(t.terealisasiDenda);
        totals.realisasiTitipan += Number(t.terealisasiTitipan);
        totals.penerimaanWO += Number(t.penerimaanWO);
        totals.totalRealisasi +=
          Number(t.terealisasiPokok) +
          Number(t.terealisasiBunga) +
          Number(t.terealisasiDenda) +
          Number(t.terealisasiTitipan) +
          Number(t.penerimaanWO);

        return {
          id: t.id,
          accountNumber: t.accountNumber,
          debiturName: t.loanAccount.debitur.name,
          debiturPhone: t.loanAccount.debitur.phone,
          dpd,
          kolektibilitas: t.loanAccount.kolektibilitas as any,
          dpdBucket,
          tagihanPokok: Number(t.tagihanPokok),
          tagihanBunga: Number(t.tagihanBunga),
          tagihanDenda: Number(t.tagihanDenda),
          saldoTitipan: Number(t.saldoTitipanAwal),
          totalTagihan:
            Number(t.tagihanPokok) + Number(t.tagihanBunga) + Number(t.tagihanDenda),
          statusBayar: t.statusBayar,
          statusBayarLabel: getStatusLabel(t.statusBayar),
          tanggalKunjungan: t.tanggalKunjungan?.toISOString(),
        };
      });

      // Grand total
      grandTotals.totalDebitur = (grandTotals.totalDebitur ?? 0) + (totals.totalDebitur ?? 0);
      grandTotals.sudahBayar = (grandTotals.sudahBayar ?? 0) + (totals.sudahBayar ?? 0);
      grandTotals.belumDikunjungi = (grandTotals.belumDikunjungi ?? 0) + (totals.belumDikunjungi ?? 0);
      grandTotals.janjieBayar = (grandTotals.janjieBayar ?? 0) + (totals.janjieBayar ?? 0);
      grandTotals.tagihanPokok = (grandTotals.tagihanPokok ?? 0) + (totals.tagihanPokok ?? 0);
      grandTotals.tagihanBunga = (grandTotals.tagihanBunga ?? 0) + (totals.tagihanBunga ?? 0);
      grandTotals.tagihanDenda = (grandTotals.tagihanDenda ?? 0) + (totals.tagihanDenda ?? 0);
      grandTotals.realisasiPokok += totals.realisasiPokok;
      grandTotals.realisasiBunga += totals.realisasiBunga;
      grandTotals.realisasiDenda += totals.realisasiDenda;
      grandTotals.realisasiTitipan += totals.realisasiTitipan;
      grandTotals.penerimaanWO += totals.penerimaanWO;
      grandTotals.totalRealisasi += totals.totalRealisasi;

      collectorSummaries.push({
        collectorId,
        collectorName: collector.name,
        tasks: taskEntries as any,
        totals,
      });
    });

    grandTotals.cashSettlementStatus = 'PENDING';

    const report: CollectionDailyReport = {
      reportDate: date,
      periodeTagih,
      branchCode: branchCode ?? 'ALL',
      collectorSummaries,
      grandTotal: grandTotals,
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('[Collection Daily Report]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil laporan collection harian' },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────

function createEmptyTotals(): CollectionTotals {
  return {
    totalDebitur: 0,
    sudahBayar: 0,
    belumDikunjungi: 0,
    janjieBayar: 0,
    tagihanPokok: 0,
    tagihanBunga: 0,
    tagihanDenda: 0,
    realisasiPokok: 0,
    realisasiBunga: 0,
    realisasiDenda: 0,
    realisasiTitipan: 0,
    penerimaanWO: 0,
    totalRealisasi: 0,
    cashSettlementStatus: 'PENDING',
  };
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BELUM_DIKUNJUNGI: 'Belum Dikunjungi',
    SUDAH_DIKUNJUNGI: 'Sudah Dikunjungi',
    SUDAH_BAYAR: 'Sudah Bayar',
    JANJI_BAYAR: 'Janji Bayar',
    TIDAK_BISA_BAYAR: 'Tidak Bisa Bayar',
  };
  return labels[status] ?? status;
}
