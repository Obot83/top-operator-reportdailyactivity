'use client';

import React from 'react';
import { CreditCard, Calendar, Receipt, Sparkles } from 'lucide-react';
import {
  resolveLoanProductDetail,
  formatRupiahId,
  formatPercentId,
  type LoanProductDetail,
} from '@/lib/client-products';

interface DetailPinjamanDebiturProps {
  lead: any;
}

export function DetailPinjamanDebitur({ lead }: DetailPinjamanDebiturProps) {
  const detail: LoanProductDetail = resolveLoanProductDetail(lead);

  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5 shadow-2xs">
      {/* ── BAGIAN A: Header Identitas Paket / Produk & Sorotan Utama (Clear & Normal) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                {detail.badgeId}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/60">
                {detail.categoryLabel}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight pt-0.5">
              {detail.title}
            </h4>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-flex items-center gap-1.5 self-start sm:self-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Detail Pinjaman Debitur</span>
          </span>
        </div>

        {/* Dua Kartu Sorotan Utama (Grid 2 Kolom Berdampingan) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Kartu 1 — Plafon Pinjaman */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors hover:bg-slate-50">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Plafon Pinjaman
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-0.5">
                {detail.plafonFormatted}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          {/* Kartu 2 — Angsuran */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between transition-colors hover:bg-slate-50">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Angsuran
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-slate-900 block mt-0.5">
                {detail.angsuranFormatted}
              </span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ── BAGIAN B: Parameter & Komponen Potongan (Proporsional & Ringkas) ── */}
      <div>
        {detail.isUmi ? (
          // Layout grid untuk Produk UMI (5 kolom)
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {/* 1. Tenor & Tipe */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Tenor & Tipe
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.tenorTipe}
              </span>
            </div>

            {/* 2. Suku Bunga */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Suku Bunga
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.sukuBungaFormatted}
              </span>
            </div>

            {/* 3. UTJ (Uang Tanggung Jawab) */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                UTJ (Tanggung Jawab)
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.utjFormatted}
              </span>
            </div>

            {/* 4. Tabungan Wajib */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Tabungan Wajib
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.tabunganWajibFormatted}
              </span>
            </div>

            {/* 5. Tabungan Pokok */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Tabungan Pokok
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.tabunganPokokFormatted}
              </span>
            </div>
          </div>
        ) : (
          // Layout grid untuk Produk Sertifikat (3 kolom)
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Tenor & Tipe */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Tenor & Tipe
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.tenorTipe}
              </span>
            </div>

            {/* 2. Suku Bunga */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Suku Bunga
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.sukuBungaFormatted}
              </span>
            </div>

            {/* 3. Tipe Bunga */}
            <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                Tipe Bunga
              </span>
              <span className="text-xs font-bold text-slate-900 font-mono block mt-0.5">
                {detail.tipeBungaFormatted}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── BAGIAN C: Rincian Manajemen Biaya (Tabel Bersih & Rapi) ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Rincian Manajemen Biaya</span>
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/70">
            {detail.costManagements.length} Item
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse text-xs min-w-[420px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 w-16">Kode</th>
                <th className="py-2 px-3">Nama Biaya</th>
                <th className="py-2 px-3 w-40">Tipe / Jenis</th>
                <th className="py-2 px-3 text-right w-36">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {detail.costManagements.length > 0 ? (
                detail.costManagements.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3">
                      <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                        {item.id}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60 uppercase">
                        {item.type} · {item.jenis}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {item.jenis === 'NOMINAL'
                        ? formatRupiahId(item.value)
                        : formatPercentId(item.value)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-slate-400 italic">
                    Tidak ada rincian biaya untuk produk ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
