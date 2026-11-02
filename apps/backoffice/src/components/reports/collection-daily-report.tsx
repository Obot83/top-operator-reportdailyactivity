'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatRupiah } from '@/lib/formatters';

function todayLocal() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

type Task = {
  id: string;
  accountNumber: string;
  debiturName: string;
  statusBayar?: string;
  statusBayarLabel: string;
  totalTagihan: number;
  dpd: number;
};

const DPD_BUCKETS = ['1–7', '8–14', '15–21', '22–30', '>30'] as const;

function dpdBucket(dpd: number) {
  if (dpd <= 0) return 'Lancar';
  if (dpd <= 7) return '1–7';
  if (dpd <= 14) return '8–14';
  if (dpd <= 21) return '15–21';
  if (dpd <= 30) return '22–30';
  return '>30';
}

function hasilKunjungan(status?: string) {
  if (status === 'SUDAH_BAYAR') return 'Bayar Tunai';
  if (status === 'JANJI_BAYAR') return 'Janji Bayar';
  if (status === 'TIDAK_BISA_BAYAR') return 'Gagal Temui';
  if (status === 'SUDAH_DIKUNJUNGI') return 'Sudah Dikunjungi';
  return 'Belum Dikunjungi';
}

type Collector = {
  collectorId: string;
  collectorName: string;
  tasks: Task[];
  totals: {
    totalDebitur: number;
    sudahBayar: number;
    belumDikunjungi: number;
    janjieBayar: number;
    totalRealisasi: number;
    tagihanPokok: number;
    tagihanBunga: number;
  };
};

type Report = {
  reportDate: string;
  periodeTagih: string;
  collectorSummaries: Collector[];
  grandTotal: {
    totalDebitur: number;
    sudahBayar: number;
    belumDikunjungi: number;
    totalRealisasi: number;
  };
};

export function CollectionDailyReport() {
  const [date, setDate] = useState(todayLocal);
  const query = useQuery({
    queryKey: ['collection-daily', date],
    queryFn: async (): Promise<Report> => {
      const res = await fetch(`/api/reports/collection/daily?date=${date}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat laporan');
      return json.data;
    },
  });

  const total = query.data?.grandTotal;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Collection Activity Report</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Daftar tagihan harian, hasil kunjungan, dan penerimaan. Rekonsiliasi kas harian tetap di CBS.
            {query.data ? ` Periode ${query.data.periodeTagih}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={!query.data}
            onClick={() => query.data && downloadCollectionCsv(query.data)}
            className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-40"
          >
            Unduh rekap
          </button>
        </div>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Memuat laporan…</p>}
      {query.error && <p className="text-sm text-destructive">{(query.error as Error).message}</p>}

      {query.data && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Hasil kunjungan</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Debitur" value={String(total?.totalDebitur ?? 0)} />
              <Stat label="Bayar tunai" value={String(countHasil(query.data, 'SUDAH_BAYAR'))} />
              <Stat label="Janji bayar" value={String(countHasil(query.data, 'JANJI_BAYAR'))} />
              <Stat label="Gagal temui" value={String(countHasil(query.data, 'TIDAK_BISA_BAYAR'))} />
              <Stat label="Belum dikunjungi" value={String(total?.belumDikunjungi ?? 0)} />
              <Stat label="Penerimaan" value={formatRupiah(total?.totalRealisasi ?? 0)} />
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Bucket DPD</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {DPD_BUCKETS.map((bucket) => (
                <Stat key={bucket} label={bucket === '>30' ? '> 30 hari' : `${bucket} hari`} value={String(countBucket(query.data, bucket))} />
              ))}
            </div>
          </section>
        </>
      )}

      {query.data?.collectorSummaries.map((collector) => (
        <section key={collector.collectorId} className="overflow-hidden rounded-lg border">
          <div className="border-b bg-muted/30 px-4 py-2">
            <h2 className="text-sm font-semibold">{collector.collectorName}</h2>
            <p className="text-xs text-muted-foreground">
              {collector.totals.totalDebitur} debitur · realisasi {formatRupiah(collector.totals.totalRealisasi)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Rekening</th>
                  <th className="px-3 py-2 font-medium">Debitur</th>
                  <th className="px-3 py-2 font-medium">Bucket DPD</th>
                  <th className="px-3 py-2 font-medium">Tagihan</th>
                  <th className="px-3 py-2 font-medium">Hasil kunjungan</th>
                </tr>
              </thead>
              <tbody>
                {collector.tasks.map((task) => (
                  <tr key={task.id} className="border-t">
                    <td className="px-3 py-2 font-mono">{task.accountNumber}</td>
                    <td className="px-3 py-2">{task.debiturName}</td>
                    <td className="px-3 py-2">{dpdBucket(task.dpd)} · {task.dpd} hari</td>
                    <td className="px-3 py-2 font-mono">{formatRupiah(task.totalTagihan)}</td>
                    <td className="px-3 py-2">{hasilKunjungan(task.statusBayar)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}

function countHasil(report: Report, status: string) {
  return report.collectorSummaries.reduce(
    (sum, collector) => sum + collector.tasks.filter((task) => task.statusBayar === status).length,
    0,
  );
}

function countBucket(report: Report, bucket: (typeof DPD_BUCKETS)[number]) {
  return report.collectorSummaries.reduce(
    (sum, collector) => sum + collector.tasks.filter((task) => dpdBucket(task.dpd) === bucket).length,
    0,
  );
}

function downloadCollectionCsv(report: Report) {
  const header = ['Kolektor', 'Rekening', 'Debitur', 'Bucket DPD', 'DPD', 'Tagihan', 'Hasil kunjungan'];
  const rows = report.collectorSummaries.flatMap((collector) => collector.tasks.map((task) => [
    collector.collectorName,
    task.accountNumber,
    task.debiturName,
    dpdBucket(task.dpd),
    String(task.dpd),
    String(task.totalTagihan),
    hasilKunjungan(task.statusBayar),
  ]));
  const body = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daily-collection-${report.reportDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
