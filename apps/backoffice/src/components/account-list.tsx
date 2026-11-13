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
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  ArrowUpRight,
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
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Operasional & Penagihan</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live MongoDB
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 max-w-3xl">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCcw className={`h-3.5 w-3.5 text-slate-500 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ── KPI Summary Cards ───────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Debitur NIK */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Debitur (NIK)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200/70 bg-blue-50 text-blue-700">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {summary?.totalAccounts ?? 0}
            <span className="text-xs font-medium text-slate-500 ml-1.5">Nasabah</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Daftar unik NIK kontrak berjalan
          </p>
        </div>

        {/* Baki Debet Pokok */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Baki Debet Pokok
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200/70 bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(summary?.totalBakiDebet ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Total outstanding pokok portofolio
          </p>
        </div>

        {/* Total Plafon Penyaluran */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Plafon Penyaluran
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-200/70 bg-purple-50 text-purple-700">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(summary?.totalPlafon ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Akumulasi pembiayaan disalurkan
          </p>
        </div>

        {/* Rata-rata DPD */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Rata-rata DPD
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200/70 bg-amber-50 text-amber-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {summary?.avgDpd ?? 0}
            <span className="text-xs font-medium text-slate-500 ml-1">Hari</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Keterlambatan rata-rata portofolio
          </p>
        </div>
      </section>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Pencarian */}
          <div className="lg:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Cari Debitur / NIK / No. Kontrak
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari NIK, nama debitur, no. kontrak, CIF..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-slate-200/90 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Cabang */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Unit Kerja / Cabang
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Kolektor Penagih
            </label>
            <select
              value={selectedCollector}
              onChange={(e) => {
                setSelectedCollector(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">Semua Petugas ({collectors.length})</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Kontrak */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Status Fasilitas
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="all">Semua Status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="LUNAS">LUNAS</option>
              <option value="NON AKTIF">NON AKTIF</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedBranch !== 'all' || selectedCollector !== 'all' || selectedStatus !== 'all' || selectedKolektibilitas !== 'all') && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>Filter diterapkan pada daftar portofolio</span>
            <button
              type="button"
              onClick={resetFilters}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </section>

      {/* ── Loading / Error ─────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-slate-200/80 bg-white shadow-xs space-y-2.5">
          <RotateCcw className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-xs font-medium text-slate-500">Memuat data rekening debitur dari MongoDB…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {(error as Error).message}
        </div>
      )}

      {/* ── Table Kontrak Debitur ───────────────────────────── */}
      {!isLoading && !error && accounts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">No. Kontrak (Terbaru)</th>
                  <th className="px-4 py-3 whitespace-nowrap">Nama & Identitas Debitur</th>
                  <th className="px-4 py-3 whitespace-nowrap">Portofolio</th>
                  <th className="px-4 py-3 whitespace-nowrap">Petugas Kolektor</th>
                  <th className="px-4 py-3 whitespace-nowrap">Cabang</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Plafon Pinjaman</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Baki Debet</th>
                  <th className="px-4 py-3 whitespace-nowrap">DPD & Kolektibilitas</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => {
                  const detailHref = monitor
                    ? `/dashboard/debitur/${encodeURIComponent(acc.accountNumber)}?mode=monitor`
                    : `/dashboard/debitur/${encodeURIComponent(acc.accountNumber)}`;

                  return (
                    <tr key={acc.accountNumber} className="even:bg-slate-50/40 hover:bg-slate-50/90 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-xs text-blue-600">
                        <Link href={detailHref} className="hover:underline">
                          {acc.accountNumber}
                        </Link>
                        <p className="text-[10px] text-slate-400 font-sans">{acc.contractDate}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Link href={detailHref} className="font-semibold text-slate-900 hover:text-blue-600 hover:underline">
                            {acc.debitur.name}
                          </Link>
                          {acc.debitur.nik && acc.debitur.nik !== '-' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded w-fit">
                              <span className="text-[9px] text-slate-400 font-sans">NIK</span> {acc.debitur.nik}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">NIK belum terdaftar</span>
                          )}
                          <p className="text-[11px] text-slate-500 font-mono">{acc.debitur.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {acc.totalContracts > 1 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200/70 px-2 py-0.5 text-[11px] font-semibold text-purple-700 w-fit">
                              {acc.totalContracts} Fasilitas
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {acc.activeContractsCount} Aktif{acc.closedContractsCount > 0 ? `, ${acc.closedContractsCount} Lunas` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            1 Fasilitas
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{acc.collector.name}</span>
                        {acc.collector.id && (
                          <p className="text-[10px] text-slate-400 font-mono">{acc.collector.id}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {acc.branch.name}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatRupiah(acc.plafon)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(acc.bakiDebetPokok)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                            {acc.dpd} Hari
                          </span>
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold w-fit border ${
                              acc.dpd === 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : acc.dpd <= 30
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {getKolektibilitasLabel(acc.kolektibilitas)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                            acc.status === 'AKTIF'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors"
                        >
                          <span>Card 360°</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
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
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 gap-3">
              <div className="flex items-center gap-2">
                <span>
                  Menampilkan {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} dari{' '}
                  <strong className="text-slate-700 font-semibold">{pagination.total}</strong> kontrak
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
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
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-medium text-slate-700">
                  Halaman {page} dari {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Empty State ─────────────────────────────────────── */}
      {!isLoading && !error && accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CreditCard className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Tidak ditemukan rekening kontrak</h3>
          <p className="mx-auto max-w-md text-xs text-slate-500">
            Tidak ada kontrak debitur yang cocok dengan kata kunci pencarian atau parameter filter aktif.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 active:bg-slate-950 transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      )}
    </main>
  );
}
