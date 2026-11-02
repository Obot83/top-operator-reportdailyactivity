'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Users,
  Search,
  Building2,
  Clock,
  RotateCcw,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';
import type { DebiturAccountsResponse } from '@/app/api/debitur/accounts/route';

export function AccountList({
  title = 'Debitur Card Controller',
  description = 'Penanganan operasional debitur: profil 360°, jadwal angsuran, timeline kunjungan, dan eskalasi penagihan.',
  monitor = false,
}: {
  title?: string;
  description?: string;
  monitor?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedKolektibilitas, setSelectedKolektibilitas] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: [
      'debitur-accounts',
      searchQuery,
      selectedBranch,
      selectedCollector,
      selectedStatus,
      selectedKolektibilitas,
      page,
      limit,
    ],
    queryFn: async (): Promise<DebiturAccountsResponse> => {
      const params = new URLSearchParams({
        q: searchQuery,
        branch: selectedBranch,
        collector: selectedCollector,
        status: selectedStatus,
        kolektibilitas: selectedKolektibilitas,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/debitur/accounts?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat daftar rekening debitur');
      return json.data;
    },
    staleTime: 60 * 1000,
  });

  const accounts = data?.accounts ?? [];
  const summary = data?.summary;
  const branches = data?.branches ?? [];
  const collectors = data?.collectors ?? [];
  const pagination = data?.pagination;

  function resetFilters() {
    setSearchQuery('');
    setSelectedBranch('all');
    setSelectedCollector('all');
    setSelectedStatus('all');
    setSelectedKolektibilitas('all');
    setPage(1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live MongoDB
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Pencarian */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Cari Rekening / Debitur / No. HP
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari no. kontrak, nama debitur, CIF, HP..."
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

          {/* Kolektor Petugas */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Kolektor Lapangan
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

          {/* Status Kontrak */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <FileCheck className="h-3 w-3" /> Status Kontrak
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">Semua Status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="LUNAS">LUNAS</option>
              <option value="NON AKTIF">NON AKTIF</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedBranch !== 'all' || selectedCollector !== 'all' || selectedStatus !== 'all' || selectedKolektibilitas !== 'all') && (
          <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
            <span>Filter diterapkan pada data kontrak</span>
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
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Rekening */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Total Rekening
            </span>
            <span className="rounded-full bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-blue-950 dark:text-blue-200">
            {summary?.totalAccounts ?? 0}
            <span className="text-sm font-normal text-muted-foreground ml-1">kontrak</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Terdaftar di database operasional
          </p>
        </div>

        {/* Baki Debet Pokok */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Baki Debet Pokok
            </span>
            <span className="rounded-full bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-200 font-mono">
            {formatRupiah(summary?.totalBakiDebet ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Outstanding pokok berjalan
          </p>
        </div>

        {/* Total Plafon Penyaluran */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Plafon Penyaluran
            </span>
            <span className="rounded-full bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-purple-950 dark:text-purple-200 font-mono">
            {formatRupiah(summary?.totalPlafon ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Akumulasi pembiayaan cair
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
            Keterlambatan portofolio
          </p>
        </div>
      </section>

      {/* ── Loading / Error ─────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground space-y-2">
          <RotateCcw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Memuat data rekening debitur dari MongoDB…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {/* ── Table Kontrak Debitur ───────────────────────────── */}
      {!isLoading && !error && accounts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">No. Rekening / Kontrak</th>
                  <th className="px-4 py-3">Nama Debitur</th>
                  <th className="px-4 py-3">Kolektor Lapangan</th>
                  <th className="px-4 py-3">Cabang</th>
                  <th className="px-4 py-3 text-right">Plafon</th>
                  <th className="px-4 py-3 text-right">Baki Debet</th>
                  <th className="px-4 py-3">DPD & Kolektibilitas</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((acc) => {
                  const detailHref = monitor
                    ? `/dashboard/debitur/${encodeURIComponent(acc.accountNumber)}?mode=monitor`
                    : `/dashboard/debitur/${encodeURIComponent(acc.accountNumber)}`;

                  return (
                    <tr key={acc.accountNumber} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs text-primary">
                        <Link href={detailHref} className="hover:underline">
                          {acc.accountNumber}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{acc.contractDate}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={detailHref} className="font-semibold text-foreground hover:underline">
                          {acc.debitur.name}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono">{acc.debitur.phone}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">{acc.debitur.address}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{acc.collector.name}</span>
                        {acc.collector.id && (
                          <p className="text-[10px] text-muted-foreground font-mono">{acc.collector.id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {acc.branch.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {formatRupiah(acc.plafon)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatRupiah(acc.bakiDebetPokok)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono font-medium">
                            {acc.dpd} hari
                          </span>
                          <Badge variant={getDpdBadgeVariant(acc.dpd)} className="text-[10px] w-fit">
                            {getKolektibilitasLabel(acc.kolektibilitas)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            acc.status === 'AKTIF'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-semibold transition-colors"
                        >
                          Buka Card 360°
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground gap-3">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} dari{' '}
                  {pagination.total} kontrak debitur
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
      )}

      {/* ── Empty State ─────────────────────────────────────── */}
      {!isLoading && !error && accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">Tidak ditemukan rekening kontrak debitur</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Tidak ada kontrak yang sesuai dengan kriteria filter atau pencarian Anda.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Reset Filter
          </button>
        </div>
      )}
    </main>
  );
}
