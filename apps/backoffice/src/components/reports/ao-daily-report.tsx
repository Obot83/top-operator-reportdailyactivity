'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatRupiah, formatDateTime } from '@/lib/formatters';

function todayLocal() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

type Activity = {
  id: string;
  aoName?: string;
  activityDate?: string;
  activityType?: string;
  activityTypeLabel?: string;
  prospekName?: string;
  accountNumber?: string;
  nominalRealisasi?: number;
  prospekNominalPengajuan?: number;
  nominalTitipanMuka?: number;
  status?: string | null;
  catatan?: string;
  latitude?: number;
  photoUrls?: unknown;
};

type Officer = {
  id: string;
  name: string;
};

type Report = {
  reportDate: string;
  branchName?: string;
  summary: {
    totalProspek: number;
    totalSurvei: number;
    totalVerifikasi: number;
    totalBooking: number;
    totalRealisasi: number;
    conversionRate: number;
    totalNominalRealisasi: number;
    totalTitipanMuka: number;
  };
  activities: Activity[];
};

export function AoDailyReport() {
  const [date, setDate] = useState(todayLocal);
  const [aoId, setAoId] = useState('');

  const officersQuery = useQuery({
    queryKey: ['ao-officers'],
    queryFn: async (): Promise<Officer[]> => {
      const res = await fetch('/api/reports/ao/officers');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat daftar AO');
      return json.data;
    },
  });

  const query = useQuery({
    queryKey: ['ao-daily', date, aoId],
    enabled: Boolean(aoId),
    queryFn: async (): Promise<Report> => {
      const res = await fetch(`/api/reports/ao/daily?date=${date}&aoId=${encodeURIComponent(aoId)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat laporan');
      return json.data;
    },
  });

  const summary = query.data?.summary;
  const activities = query.data?.activities ?? [];
  const bookingByAo = bookingSummary(activities);
  const selectedAo = officersQuery.data?.find((officer) => officer.id === aoId);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily AO Activity Report</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Pilih AO terlebih dahulu untuk menampilkan aktivitas hariannya. {selectedAo ? `${selectedAo.name}. ` : ''}{query.data?.branchName ?? 'Semua cabang'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground" htmlFor="ao-picker">
            Pilih AO
          </label>
          <select
            id="ao-picker"
            value={aoId}
            onChange={(event) => setAoId(event.target.value)}
            className="h-9 min-w-44 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Pilih AO</option>
            {(officersQuery.data ?? []).map((officer) => (
              <option key={officer.id} value={officer.id}>{officer.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          />
          <button
            type="button"
            disabled={!query.data}
            onClick={() => query.data && downloadAoCsv(query.data)}
            className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-40"
          >
            Unduh rekap
          </button>
        </div>
      </div>

      {officersQuery.error && <p className="text-sm text-destructive">{(officersQuery.error as Error).message}</p>}
      {!aoId && <p className="text-sm text-muted-foreground">Pilih AO untuk menampilkan data.</p>}
      {query.isLoading && <p className="text-sm text-muted-foreground">Memuat laporan…</p>}
      {query.error && <p className="text-sm text-destructive">{(query.error as Error).message}</p>}

      {summary && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Pipeline</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Draft Prospek" value={String(summary.totalProspek)} />
              <Stat label="Survei Lapangan" value={String(summary.totalSurvei)} />
              <Stat label="Review Komite" value={String(summary.totalVerifikasi)} />
              <Stat label="Pencairan" value={String(summary.totalRealisasi)} />
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Booking pencairan harian</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Booking" value={String(summary.totalBooking)} />
              <Stat label="Konversi ke booking" value={`${summary.conversionRate}%`} />
              <Stat label="Nominal pencairan" value={formatRupiah(summary.totalNominalRealisasi)} />
              <Stat label="Titipan muka" value={formatRupiah(summary.totalTitipanMuka)} />
            </div>
            {bookingByAo.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">AO</th>
                      <th className="px-3 py-2 font-medium">Booking</th>
                      <th className="px-3 py-2 font-medium">Pencairan</th>
                      <th className="px-3 py-2 font-medium">Nominal pencairan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingByAo.map((row) => (
                      <tr key={row.name} className="border-b last:border-0">
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.booking}</td>
                        <td className="px-3 py-2">{row.pencairan}</td>
                        <td className="px-3 py-2 font-mono">{formatRupiah(row.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {query.data && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Waktu</th>
                <th className="px-3 py-2 font-medium">AO</th>
                <th className="px-3 py-2 font-medium">Aktivitas</th>
                <th className="px-3 py-2 font-medium">Nama / rekening</th>
                <th className="px-3 py-2 font-medium">Nominal</th>
                <th className="px-3 py-2 font-medium">Check-in</th>
                <th className="px-3 py-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {query.data.activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    Tidak ada aktivitas pada tanggal ini.
                  </td>
                </tr>
              ) : query.data.activities.map((activity) => (
                <tr key={activity.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{activity.activityDate ? formatDateTime(activity.activityDate) : '-'}</td>
                  <td className="px-3 py-2">{activity.aoName ?? selectedAo?.name ?? '-'}</td>
                  <td className="px-3 py-2">{activity.activityTypeLabel ?? '-'}</td>
                  <td className="px-3 py-2">{activity.prospekName ?? activity.accountNumber ?? '-'}</td>
                  <td className="px-3 py-2 font-mono">
                    {formatRupiah(activity.nominalRealisasi ?? activity.prospekNominalPengajuan ?? activity.nominalTitipanMuka ?? 0)}
                  </td>
                  <td className="px-3 py-2">{checkInLabel(activity)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{activity.catatan ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function checkInLabel(activity: Activity) {
  const photos = Array.isArray(activity.photoUrls) ? activity.photoUrls.length : 0;
  const gps = activity.latitude != null;
  if (!gps && photos === 0) return '-';
  return [gps ? 'GPS' : null, photos > 0 ? `Foto ${photos}` : null].filter(Boolean).join(' · ');
}

function bookingSummary(activities: Activity[]) {
  const rows = new Map<string, { name: string; booking: number; pencairan: number; nominal: number }>();
  for (const activity of activities) {
    if (activity.activityType !== 'BOOKING' && activity.activityType !== 'REALISASI') continue;
    const name = activity.aoName ?? 'Tanpa nama';
    const current = rows.get(name) ?? { name, booking: 0, pencairan: 0, nominal: 0 };
    if (activity.activityType === 'BOOKING') current.booking += 1;
    if (activity.activityType === 'REALISASI') {
      current.pencairan += 1;
      current.nominal += activity.nominalRealisasi ?? 0;
    }
    rows.set(name, current);
  }
  return Array.from(rows.values());
}

function downloadAoCsv(report: Report) {
  const header = ['Waktu', 'AO', 'Aktivitas', 'Nama / rekening', 'Nominal', 'Check-in', 'Catatan'];
  const rows = report.activities.map((activity) => [
    activity.activityDate ? formatDateTime(activity.activityDate) : '-',
    activity.aoName ?? '-',
    activity.activityTypeLabel ?? '-',
    activity.prospekName ?? activity.accountNumber ?? '-',
    String(activity.nominalRealisasi ?? activity.prospekNominalPengajuan ?? activity.nominalTitipanMuka ?? 0),
    checkInLabel(activity),
    activity.catatan ?? '-',
  ]);
  downloadCsv(`daily-ao-${report.reportDate}.csv`, [header, ...rows]);
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
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
