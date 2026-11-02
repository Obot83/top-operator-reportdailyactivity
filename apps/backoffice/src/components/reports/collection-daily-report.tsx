'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Search,
  Building2,
  Clock,
  CreditCard,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';
import type { DailyCollectionData, CollectionPaymentRecord } from '@/app/api/reports/collection/daily/route';

const DPD_BUCKETS = [
  'Lancar (0)',
  'DPK 1–7 Hari',
  'DPK 8–14 Hari',
  'DPK 15–21 Hari',
  'DPK 22–30 Hari',
  'Kurang Lancar (31–60)',
  'Diragukan (61–90)',
  'Macet (>90 Hari)',
];

function getBadgeVariant(bucket: string) {
  if (bucket.includes('Lancar (0)')) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300';
  if (bucket.includes('1–7') || bucket.includes('8–14')) return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300';
  if (bucket.includes('15–21') || bucket.includes('22–30')) return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300';
  return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300';
}

export function CollectionDailyReport() {
  const [date, setDate] = useState('2026-10-01');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [activeTab, setActiveTab] = useState<'feed' | 'collectors' | 'settlement' | 'analytics'>('feed');

  // Query daily collection data
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['collection-daily', date, selectedCollector, selectedBranch, selectedBucket, searchQuery, page, limit],
    queryFn: async (): Promise<DailyCollectionData> => {
      const params = new URLSearchParams({
        date,
        collector: selectedCollector,
        branch: selectedBranch,
        bucket: selectedBucket,
        q: searchQuery,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/reports/collection/daily?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat laporan');
      return json.data;
    },
    staleTime: 60 * 1000,
  });

  const summary = data?.summary;
  const payments = data?.payments ?? [];
  const settlements = data?.settlements ?? [];
  const collectors = data?.collectors ?? [];
  const branches = data?.branches ?? [];
  const pagination = data?.pagination;

  function resetFilters() {
    setSelectedCollector('all');
    setSelectedBranch('all');
    setSelectedBucket('all');
    setSearchQuery('');
    setPage(1);
  }

  function downloadCsv() {
    if (!payments.length) return;
    const header = [
      'No. Kontrak',
      'Debitur',
      'No. HP',
      'Kolektor',
      'Cabang',
      'Waktu Bayar',
      'Tenor',
      'DPD (Hari)',
      'Bucket DPD',
      'Total Tagihan',
      'Nominal Dibayar',
      'Status Bayar',
    ];
    const rows = payments.map((p) => [
      `"${p.contract_id}"`,
      `"${p.debitur}"`,
      `"${p.no_hp}"`,
      `"${p.collector_name}"`,
      `"${p.branch_name}"`,
      `"${p.tgl_bayar}"`,
      `"${p.step_tenor}"`,
      p.telat,
      `"${p.bucket}"`,
      p.total_tagihan,
      p.nominal_dibayar,
      p.statusBayar,
    ]);
    const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-collection-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Daily Collection Activity Report</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live MongoDB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap real-time penagihan harian kolektor lapangan, realisasi angsuran, performa petugas, dan rekonsiliasi setoran kas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data?.latestActivityDate && data.latestActivityDate !== date && (
            <button
              type="button"
              onClick={() => {
                setDate(data.latestActivityDate);
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 transition-colors"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              Lihat Aktivitas Terakhir ({data.latestActivityDate})
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={!payments.length}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Tanggal */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Tanggal Tagih/Bayar
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
            />
          </div>

          {/* Kolektor */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Petugas Kolektor
            </label>
            <select
              value={selectedCollector}
              onChange={(e) => {
                setSelectedCollector(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Semua Kolektor ({collectors.length})</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cabang */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Cabang
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Semua Cabang ({branches.length})</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Bucket DPD */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Bucket DPD
            </label>
            <select
              value={selectedBucket}
              onChange={(e) => {
                setSelectedBucket(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Semua Bucket DPD</option>
              {DPD_BUCKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Debitur / Kontrak */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Cari Debitur / Kontrak
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, no kontrak, hp..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {(selectedCollector !== 'all' || selectedBranch !== 'all' || selectedBucket !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
            <span>Filter aktif diterapkan</span>
            <button
              type="button"
              onClick={resetFilters}
              className="font-medium text-primary hover:underline"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </section>

      {/* ── KPI Summary Cards ───────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Realisasi */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Total Realisasi
            </span>
            <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-200">
            {formatRupiah(summary?.totalRealisasi ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dari total tagihan {formatRupiah(summary?.totalTagihan ?? 0)}
          </p>
        </div>

        {/* Debitur Tertagih */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Debitur Tertagih
            </span>
            <span className="rounded-full bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-blue-950 dark:text-blue-200">
            {summary?.totalDebitur ?? 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">transaksi</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lunas & angsuran sebagian
          </p>
        </div>

        {/* Kolektor Aktif */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Kolektor Aktif
            </span>
            <span className="rounded-full bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-purple-950 dark:text-purple-200">
            {summary?.activeCollectors ?? 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">petugas</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mencatatkan penerimaan hari ini
          </p>
        </div>

        {/* Rata-rata DPD */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Rata-rata DPD
            </span>
            <span className="rounded-full bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-amber-950 dark:text-amber-200">
            {summary?.avgDpd ?? 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">hari</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hari keterlambatan debitur
          </p>
        </div>

        {/* Setoran Kas (Settlement) */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Setoran Kas (ST)
            </span>
            <span className="rounded-full bg-muted p-1.5 text-foreground">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
            {formatRupiah(summary?.totalSettlement ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tunai: {formatRupiah(summary?.totalSettlementCash ?? 0)} · TF: {formatRupiah(summary?.totalSettlementTf ?? 0)}
          </p>
        </div>
      </section>

      {/* ── Tabs Navigation ─────────────────────────────────── */}
      <div className="border-b border-border flex items-center gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'feed'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Log Pembayaran & Kunjungan ({pagination?.total ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('collectors')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'collectors'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Performa Kolektor ({data?.collectorSummaries?.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlement')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'settlement'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Rekap Setoran Kas ({settlements.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Grafik & Distribusi DPD
        </button>
      </div>

      {/* ── Loading / Error ─────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
          <RotateCcw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Memuat data penagihan dari database MongoDB…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────── */}
      {!isLoading && !error && payments.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">Tidak ada transaksi penagihan pada tanggal {date}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Tidak ditemukan catatan pembayaran angsuran untuk filter yang dipilih. Silakan ubah tanggal atau filter di atas.
          </p>
          {data?.latestActivityDate && data.latestActivityDate !== date && (
            <button
              type="button"
              onClick={() => {
                setDate(data.latestActivityDate);
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Clock className="h-4 w-4" />
              Buka Aktivitas Terakhir ({data.latestActivityDate})
            </button>
          )}
        </div>
      )}

      {/* ── Tab 1: Log Pembayaran & Kunjungan ───────────────── */}
      {!isLoading && !error && payments.length > 0 && activeTab === 'feed' && (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">No. Kontrak</th>
                    <th className="px-4 py-3">Debitur</th>
                    <th className="px-4 py-3">Kolektor</th>
                    <th className="px-4 py-3">Cabang</th>
                    <th className="px-4 py-3">Tenor</th>
                    <th className="px-4 py-3">DPD</th>
                    <th className="px-4 py-3 text-right">Tagihan</th>
                    <th className="px-4 py-3 text-right">Realisasi (Bayar)</th>
                    <th className="px-4 py-3">Waktu Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs">
                        <Link
                          href={`/dashboard/debitur/${encodeURIComponent(p.contract_id)}`}
                          className="text-primary hover:underline font-semibold flex items-center gap-1 group"
                          title="Buka Debitur Card Controller"
                        >
                          {p.contract_id}
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] transition-opacity">↗</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{p.debitur}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.no_hp}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{p.collector_name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.branch_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {p.step_tenor}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getBadgeVariant(
                            p.bucket
                          )}`}
                        >
                          {p.telat} hari · {p.bucket.split(' ')[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatRupiah(p.total_tagihan)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(p.nominal_dibayar)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {p.tgl_bayar}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground gap-3">
                <div className="flex items-center gap-2">
                  <span>
                    Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} dari{' '}
                    {pagination.total} transaksi
                  </span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-7 rounded border border-border bg-background px-2 text-xs"
                  >
                    <option value="10">10 / halaman</option>
                    <option value="15">15 / halaman</option>
                    <option value="25">25 / halaman</option>
                    <option value="50">50 / halaman</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-medium">
                    Halaman {page} dari {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded border border-border hover:bg-muted disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tab 2: Rekap Performa per Kolektor ───────────────── */}
      {!isLoading && !error && activeTab === 'collectors' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.collectorSummaries?.map((col) => (
              <div key={col.collectorId} className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{col.collectorName}</h3>
                    <p className="text-xs text-muted-foreground font-mono">ID: {col.collectorId}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {col.totals.totalDebitur} Debitur
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <span className="text-muted-foreground">Total Realisasi</span>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                      {formatRupiah(col.totals.totalRealisasi)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2.5">
                    <span className="text-muted-foreground">Rata-rata/Debitur</span>
                    <p className="text-sm font-bold text-foreground font-mono mt-0.5">
                      {col.totals.totalDebitur > 0
                        ? formatRupiah(Math.round(col.totals.totalRealisasi / col.totals.totalDebitur))
                        : 'Rp 0'}
                    </p>
                  </div>
                </div>

                {/* Mini list of contracts */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold text-muted-foreground">Daftar Debitur Tertagih:</p>
                  <div className="max-h-36 overflow-y-auto divide-y divide-border/60 text-xs rounded border border-border/50">
                    {col.tasks.map((t) => (
                      <div key={t.id} className="p-2 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <p className="font-medium text-foreground">{t.debiturName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{t.accountNumber}</p>
                        </div>
                        <span className="font-semibold text-emerald-600 font-mono">
                          {formatRupiah(t.nominalDibayar)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tab 3: Rekap Setoran Kas (Settlement ST) ─────────── */}
      {!isLoading && !error && activeTab === 'settlement' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Bukti Setoran Kas (Settlement Slip)</h3>
                <p className="text-xs text-muted-foreground">
                  Rekonsiliasi slip setoran kas kolektor ke cabang pada tanggal {date}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">Total Disetor:</span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatRupiah(summary?.totalSettlement ?? 0)}
                </p>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Belum ada slip setoran kas (settlement) yang diterbitkan pada tanggal {date}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">No. Bukti Setor</th>
                      <th className="px-4 py-3">Waktu Setor</th>
                      <th className="px-4 py-3">Kolektor</th>
                      <th className="px-4 py-3">Cabang</th>
                      <th className="px-4 py-3 text-center">Jumlah Kontrak</th>
                      <th className="px-4 py-3 text-right">Setoran Tunai</th>
                      <th className="px-4 py-3 text-right">Setoran Transfer</th>
                      <th className="px-4 py-3 text-right">Total Setor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                          {s.id}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          {s.date}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {s.collector_name}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                          Cabang {s.branch_id}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-xs">
                          {s.contract_count}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {formatRupiah(s.cash)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          {formatRupiah(s.tf)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(s.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Tab 4: Grafik & Analisis DPD ────────────────────── */}
      {!isLoading && !error && activeTab === 'analytics' && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Distribusi Bucket DPD */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-base">Distribusi Penagihan per Bucket DPD</h3>
              <p className="text-xs text-muted-foreground">
                Komposisi realisasi pembayaran berdasarkan hari keterlambatan debitur
              </p>
            </div>

            <div className="space-y-3">
              {summary?.by_bucket.map((b) => {
                const totalNominal = summary.totalRealisasi || 1;
                const pct = Math.round((b.nominal / totalNominal) * 100);
                return (
                  <div key={b.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{b.label}</span>
                      <span className="text-muted-foreground font-mono">
                        {b.count} debitur ({pct}%) · {formatRupiah(b.nominal)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Kolektor Penagihan */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-base">Top Kolektor Tertagih</h3>
              <p className="text-xs text-muted-foreground">
                Peringkat penerimaan angsuran tertinggi per petugas kolektor
              </p>
            </div>

            <div className="space-y-3">
              {summary?.by_collector.map((c, idx) => {
                const maxNominal = summary.by_collector[0]?.nominal || 1;
                const pct = Math.round((c.nominal / maxNominal) * 100);
                return (
                  <div key={c.collector} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {idx + 1}. {c.collector}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {c.count} debitur · {formatRupiah(c.nominal)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribusi per Cabang */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4 lg:col-span-2">
            <div>
              <h3 className="font-semibold text-base">Realisasi Penagihan per Cabang</h3>
              <p className="text-xs text-muted-foreground">
                Perbandingan nominal penerimaan kas kolektor di tiap cabang
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary?.by_branch.map((b) => (
                <div key={b.branch} className="rounded-lg border border-border/70 p-3 space-y-1 bg-muted/10">
                  <span className="text-xs font-semibold text-foreground">{b.branch}</span>
                  <p className="text-base font-bold text-primary font-mono">{formatRupiah(b.nominal)}</p>
                  <p className="text-[11px] text-muted-foreground">{b.count} transaksi angsuran</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
