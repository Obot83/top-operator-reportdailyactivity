'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck2,
  Check,
  Copy,
  X,
  MapPin,
  Users,
  User,
  MessageSquareText,
  ClipboardCheck,
} from 'lucide-react';
import {
  leads,
  type Lead,
  type FlowStageInfo,
  type OfficerItem,
  type ActivityTimelineItem,
  type SalesNoteItem,
} from '@/lib/leads-sample';
import { DetailPinjamanDebitur } from './detail-pinjaman-debitur';

const TABS = [
  'Data Pemohon',
  'Data Pengajuan',
  'Data Pasangan',
  'Data Penjamin',
  'Data Agunan',
  'Credit Checking',
] as const;

type TabName = (typeof TABS)[number];

const PAGE_SIZE = 6;
const STATUS_FILTERS = ['Semua', 'Pending', 'Completed', 'Cancelled', 'Proses Survey', 'Lolos SLIK'] as const;

function rupiah(value: number) {
  return `Rp ${value.toLocaleString('en-US')}`;
}

function formatFullDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d).replace(/\./g, ':');
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d).replace(/\./g, ':');
  } catch {
    return dateStr;
  }
}

// ─── Flow Stage Badge (Clean & Subtle) ────────────────────────────────────────

function FlowStageBadge({ stage }: { stage: FlowStageInfo }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100/80 text-slate-700 border border-slate-200/70 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
      <span>{stage.name}</span>
    </span>
  );
}

// ─── 6-Step Pipeline Visual Function ──────────────────────────────────────────

function getPipelineSteps(lead: Lead) {
  const s = lead.rawStatus;
  const stage = lead.flowStage.code;

  // Step 1: Input Leads
  const s1 = {
    title: '1. Input Leads',
    desc: s.lead === 'WAITING' ? 'Masih input data' : 'Mandatory data lengkap',
    status: s.lead === 'WAITING' ? ('active' as const) : ('passed' as const),
  };

  // Step 2: Cek SLIK / CBI
  let s2Status: 'passed' | 'failed' | 'active' | 'upcoming' = 'upcoming';
  let s2Desc = 'Belum dicek';
  if (s.credit_checking === 'DONE' || s.credit_checking === 'PASSED') {
    s2Status = 'passed';
    s2Desc = 'Lolos SLIK / CBI';
  } else if (s.credit_checking === 'REJECT' || s.credit_checking === 'NOT PASSED') {
    s2Status = 'failed';
    s2Desc = 'Tidak lolos kriteria';
  } else if (s.lead === 'RESPONSE' && !s.credit_checking) {
    s2Status = 'active';
    s2Desc = 'Menunggu cek SLIK';
  }

  // Step 3: Survei Lapangan
  let s3Status: 'passed' | 'failed' | 'active' | 'upcoming' = 'upcoming';
  let s3Desc = 'Belum survei';
  if (s.survey === 'DONE' || s.survey === 'PASSED') {
    s3Status = 'passed';
    s3Desc = 'Survei selesai (DONE)';
  } else if (s.survey === 'CANCELED' || stage === 'SURVEY_CANCELED') {
    s3Status = 'failed';
    s3Desc = 'Survei dibatalkan';
  } else if (s.survey === 'SCHEDULED' || s.survey === 'RESCHEDULED' || s.survey === 'WAITING') {
    s3Status = 'active';
    s3Desc = 'Sedang proses survei';
  }

  // Step 4: Proses Rekomendasi CA
  let s4Status: 'passed' | 'failed' | 'active' | 'upcoming' = 'upcoming';
  let s4Desc = 'Menunggu survei selesai';
  if (s3Status === 'failed' || s2Status === 'failed') {
    s4Status = 'failed';
    s4Desc = 'Dibatalkan pada tahap sebelumnya';
  } else if (
    s.pengajuan === 'PROSES' ||
    s.pengajuan === 'COMPLETED' ||
    stage === 'KOMITE_REVIEW' ||
    stage === 'PENGAJUAN_COMPLETED'
  ) {
    s4Status = 'passed';
    s4Desc = 'Rekomendasi CA disetujui';
  } else if (s3Status === 'passed') {
    s4Status = 'active';
    s4Desc = 'Analisis kapasitas & DSR';
  }

  // Step 5: Review Komite (Memorandum Kaops / KC)
  let s5Status: 'passed' | 'failed' | 'active' | 'upcoming' = 'upcoming';
  let s5Desc = 'Menunggu rekomendasi CA';
  if (s.pengajuan === 'COMPLETED' || stage === 'PENGAJUAN_COMPLETED') {
    s5Status = 'passed';
    s5Desc = 'Approval Komite / KC disetujui';
  } else if (s.pengajuan === 'TOLAK' || stage === 'KOMITE_REJECTED') {
    s5Status = 'failed';
    s5Desc = 'Ditolak komite / KC';
  } else if (s.pengajuan === 'PROSES' || stage === 'KOMITE_REVIEW') {
    s5Status = 'active';
    s5Desc = 'Review memorandum Kaops/KC';
  } else if (s4Status === 'failed') {
    s5Status = 'failed';
    s5Desc = 'Tidak diteruskan ke komite';
  }

  // Step 6: Selesai Pengajuan
  let s6Status: 'passed' | 'failed' | 'active' | 'upcoming' = 'upcoming';
  let s6Desc = 'Belum pengajuan';
  if (stage === 'PENGAJUAN_COMPLETED' || s.pengajuan === 'COMPLETED') {
    s6Status = 'passed';
    s6Desc = 'Selesai & masuk core system';
  } else if (s5Status === 'failed') {
    s6Status = 'failed';
    s6Desc = 'Pengajuan ditolak';
  } else if (s5Status === 'active') {
    s6Status = 'upcoming';
    s6Desc = 'Menunggu putusan komite';
  }

  return [
    s1,
    { title: '2. Cek SLIK / CBI', desc: s2Desc, status: s2Status },
    { title: '3. Survei Lapangan', desc: s3Desc, status: s3Status },
    { title: '4. Proses Rekomendasi CA', desc: s4Desc, status: s4Status },
    { title: '5. Review Komite', desc: s5Desc, status: s5Status },
    { title: '6. Selesai Pengajuan', desc: s6Desc, status: s6Status },
  ];
}

// ─── POP-UP MODAL (Clean, Clear, Minimalist) ──────────────────────────────────

function DetailStatusFlowModal({
  lead,
  onClose,
}: {
  lead: Lead;
  onClose: () => void;
}) {
  const [copiedRef, setCopiedRef] = useState(false);

  // Esc key & body scroll lock
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = origOverflow;
    };
  }, [onClose]);

  const handleCopyReference = (ref: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const officersList: OfficerItem[] = lead.officers?.length
    ? lead.officers
    : [
        {
          nama_ao: lead.aoName || '-',
          username: lead.aoId || '-',
          cabang: lead.branch || 'Depok Sertifikat',
          keterangan: 'Input Data Pemohon',
        },
        {
          nama_ao: lead.aoName || '-',
          username: lead.aoId || '-',
          cabang: lead.branch || 'Depok Sertifikat',
          keterangan: 'Pengecekan SLIK',
        },
        {
          nama_ao: lead.aoName || '-',
          username: lead.aoId ? `${lead.aoId.replace(/_(sur|col)$/i, '')}_sur` : '-',
          cabang: lead.branch || 'Depok Sertifikat',
          keterangan: 'Survey',
        },
      ];

  const activitiesTimelineList: ActivityTimelineItem[] = lead.activitiesTimeline?.length
    ? lead.activitiesTimeline
    : [
        {
          jenis_aktivitas: 'Input Leads',
          waktu_pencatatan: lead.tanggalLeads,
          waktu_selesai: lead.sla?.start_time || lead.tanggalLeads,
          sla: '< 1m',
        },
        {
          jenis_aktivitas: 'Cek SLIK',
          waktu_pencatatan: lead.sla?.start_time || lead.tanggalLeads,
          waktu_selesai: lead.sla?.end_time || null,
          sla: lead.sla?.status === 'RUNNING' ? 'Sedang Berjalan' : lead.sla?.formatted || '-',
        },
        {
          jenis_aktivitas: 'Survey',
          waktu_pencatatan: lead.lastUpdate || null,
          waktu_selesai: lead.sla?.end_time || null,
          sla: lead.sla?.status === 'COMPLETED' ? 'Selesai' : '-',
        },
      ];

  const salesNotesList: SalesNoteItem[] = lead.salesNotes?.length
    ? lead.salesNotes
    : [
        {
          nama_user: `${lead.aoName} (${lead.aoId})`,
          catatan:
            lead.detail.keterangan !== '-'
              ? lead.detail.keterangan
              : `Aplikasi pengajuan ${lead.nama} telah tercatat dalam sistem.`,
          waktu: lead.lastUpdate,
        },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-flow-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Top Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200/60">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3
                id="modal-flow-title"
                className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate"
              >
                Detail Status & Flow Pengajuan Real
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono text-slate-400 font-medium">
                  ID: {lead.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyReference(lead.id)}
                  className="text-slate-400 hover:text-slate-700 transition inline-flex items-center gap-1 text-[10px]"
                  title="Salin Referensi ID"
                >
                  {copiedRef ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedRef ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition"
            aria-label="Tutup pop-up"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Scrollable Body (Clean & Clear) ── */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Profile Card & Badges */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Nama Debitur / ID Leads
              </span>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {lead.nama}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <FlowStageBadge stage={lead.flowStage} />

                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                  {lead.applicationType.type === 'REPEAT_ORDER'
                    ? `RO #${lead.applicationType.counter || 1}`
                    : 'Pengajuan Baru'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Card Detail Pinjaman Debitur (Berdasarkan Struktur client_product) ── */}
          <DetailPinjamanDebitur lead={lead} />

          {/* ── Visual Flow Pipeline / Stepper ── */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-slate-500" />
                <span>Progress Alur Pengajuan Sistem</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Tahap: <span className="font-semibold text-slate-800">{lead.flowStage.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {getPipelineSteps(lead).map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border text-center flex flex-col justify-between transition min-h-[72px] ${
                    step.status === 'passed'
                      ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                      : step.status === 'active'
                      ? 'bg-slate-50/90 border-slate-300 text-slate-900 ring-1 ring-slate-200'
                      : step.status === 'failed'
                      ? 'bg-rose-50/40 border-rose-200 text-slate-800'
                      : 'bg-slate-50/40 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {step.status === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {step.status === 'active' && <Clock className="w-3.5 h-3.5 text-slate-700" />}
                    {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                    {step.status === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    <span
                      className={`font-semibold text-[11px] leading-tight ${
                        step.status === 'passed' ? 'text-emerald-900' : ''
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] leading-tight ${
                      step.status === 'passed' ? 'text-emerald-700/80 font-medium' : 'text-slate-500'
                    }`}
                  >
                    {step.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Informasi SLA Pengajuan ── */}
          {lead.sla && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>SLA Pengajuan</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      lead.sla.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : lead.sla.status === 'RUNNING'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>
                    {lead.sla.status === 'COMPLETED'
                      ? 'SLA Selesai'
                      : lead.sla.status === 'RUNNING'
                      ? 'SLA Berjalan'
                      : 'SLA Berhenti (Batal)'}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Mulai Step Pengajuan
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block mt-1">
                    {lead.sla.start_time ? formatDateTime(lead.sla.start_time) : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Waktu pembuatan berkas pengajuan
                  </span>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Stop SLA (Status Complete)
                  </span>
                  <span className="text-xs font-semibold text-slate-800 block mt-1">
                    {lead.sla.is_complete && lead.sla.end_time
                      ? formatDateTime(lead.sla.end_time)
                      : lead.sla.status === 'RUNNING'
                      ? 'Menunggu Pengajuan Complete'
                      : lead.sla.end_time
                      ? formatDateTime(lead.sla.end_time)
                      : '-'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {lead.sla.is_complete
                      ? 'SLA berhenti di approval memorandum KC'
                      : lead.sla.status === 'RUNNING'
                      ? 'Timer SLA masih terus berjalan'
                      : 'Proses pengajuan dihentikan'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Total Durasi SLA
                  </span>
                  <span className="text-sm font-bold text-slate-900 block mt-0.5">
                    {lead.sla.formatted_long || lead.sla.formatted}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                    {lead.sla.description}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── 3 Tabel Spesifikasi: Petugas AO, Aktivitas & Waktu, Catatan ── */}
          <div className="space-y-4">
            {/* Card: Petugas AO & Aktivitas Waktu */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Petugas Account Officer & Timeline Aktivitas</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {officersList.length} Petugas Terkait
                </span>
              </div>

              {/* Sub-tabel 1: Petugas Account Officer */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Daftar Petugas Account Officer</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs min-w-[460px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Nama AO</th>
                        <th className="py-2.5 px-3">Username</th>
                        <th className="py-2.5 px-3">Cabang</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {officersList.map((off, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {off.nama_ao}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                              {off.username}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{off.cabang}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                              {off.keterangan}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-tabel 2: Aktivitas & Waktu */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px] uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Aktivitas & Waktu Real Time</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Jenis Aktivitas</th>
                        <th className="py-2.5 px-3">Waktu Pencatatan</th>
                        <th className="py-2.5 px-3">Waktu Selesai</th>
                        <th className="py-2.5 px-3">SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activitiesTimelineList.map((act, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {act.jenis_aktivitas}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {formatFullDateTime(act.waktu_pencatatan)}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {formatFullDateTime(act.waktu_selesai)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                              {act.sla}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card: Catatan & Keterangan Petugas */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <MessageSquareText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Catatan & Keterangan Petugas</span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  {salesNotesList.length} Catatan
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse text-xs min-w-[460px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-1/4">Nama User / Petugas</th>
                      <th className="py-2.5 px-3 w-1/2">Catatan / Keterangan</th>
                      <th className="py-2.5 px-3 w-1/4 whitespace-nowrap">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesNotesList.length > 0 ? (
                      salesNotesList.map((n, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors align-top">
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {n.nama_user}
                          </td>
                          <td className="py-2 px-3 text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {n.catatan}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {formatFullDateTime(n.waktu)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                          Tidak ada catatan dari petugas untuk aktivitas ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/80 bg-slate-50/60 shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Status: <span className="font-semibold text-slate-700">{lead.status}</span> • Tahap: <span className="font-semibold text-slate-700">{lead.flowStage.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Daftar Leads Page (Clean, Professional, Clear) ───────────────────────

export function DaftarLeads() {
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [modalLead, setModalLead] = useState<Lead | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('Semua');
  const [page, setPage] = useState(1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number>();

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setPanelWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [detailLead]);

  if (detailLead) {
    return <LeadDetailView lead={detailLead} onBack={() => setDetailLead(null)} />;
  }

  const filtered = leads.filter((lead) => {
    const keyword = query.trim().toLowerCase();
    const matchesQuery =
      !keyword ||
      [
        lead.nama,
        lead.id,
        lead.nik,
        lead.noHp,
        lead.aoName,
        lead.aoId,
        lead.kategori,
        lead.flowStage.name,
        lead.status,
      ].some((value) => value.toLowerCase().includes(keyword));

    let matchesFilter = true;
    if (filter === 'Semua') {
      matchesFilter = true;
    } else if (filter === 'Pending' || filter === 'Completed' || filter === 'Cancelled') {
      matchesFilter = lead.status === filter;
    } else if (filter === 'Proses Survey') {
      matchesFilter = lead.actionLead === 'Proses Survey' || lead.flowStage.code === 'SURVEY_IN_PROGRESS';
    } else if (filter === 'Lolos SLIK') {
      matchesFilter = lead.statusCredit === 'PASSED' || lead.flowStage.code === 'SLIK_PASSED';
    }

    return matchesQuery && matchesFilter;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-6 sm:px-6 space-y-4">
      {/* ── Top Header (Clean & Minimalist) ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <nav className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <span>Operasional & Pipeline</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-semibold">Daftar Leads</span>
          </nav>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">List Leads</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Daftar aplikasi pengajuan calon debitur yang masuk dari sales lapangan untuk proses credit checking & survei.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, NIK, ID..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Status:</span>
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as (typeof STATUS_FILTERS)[number]);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-slate-400 focus:outline-none"
            >
              {STATUS_FILTERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ── Table Card (Clean Monochrome Borders, Clear Typography) ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
        <div ref={scrollerRef} className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-xs text-left">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Last Update</th>
                <th className="px-3 py-3 whitespace-nowrap">AO</th>
                <th className="px-3 py-3 whitespace-nowrap">Nama Debitur / ID Leads</th>
                <th className="px-3 py-3 whitespace-nowrap">NIK / No Handpone</th>
                <th className="px-3 py-3 whitespace-nowrap">Pengajuan</th>
                <th className="px-3 py-3 whitespace-nowrap">Tipe / Produk</th>
                <th className="px-3 py-3 whitespace-nowrap">Tanggal Pengajuan</th>
                <th className="px-3 py-3 whitespace-nowrap">Last Proses</th>
                <th className="px-3 py-3 whitespace-nowrap">Status</th>
                <th
                  className="px-3 py-3 whitespace-nowrap"
                  title="SLA: Dihitung dari Step Pengajuan sampai dengan Pengajuan Status Complete"
                >
                  SLA Pengajuan
                </th>
                <th className="w-20 px-3 py-3 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((lead) => {
                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* 1. Last Update */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">
                      {lead.lastUpdate}
                    </td>

                    {/* 2. AO */}
                    <td className="px-3 py-3 min-w-[130px]">
                      <div className="font-semibold text-slate-800 text-xs">{lead.aoName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">({lead.aoId})</div>
                    </td>

                    {/* 3. Nama Debitur / ID Leads */}
                    <td className="px-3 py-3 min-w-[150px]">
                      <div className="font-semibold uppercase text-slate-900 text-xs">{lead.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{lead.id}</div>
                    </td>

                    {/* 4. NIK / No Handpone */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-slate-800 font-mono text-xs">{lead.diri.noKtp || lead.nik}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{lead.diri.noHp || lead.noHp}</div>
                    </td>

                    {/* 5. Pengajuan */}
                    <td className="px-3 py-3 font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap text-xs">
                      {rupiah(lead.nominalPengajuan)}
                    </td>

                    {/* 6. Tipe / Produk (Clear Typography, No Clutter Badges) */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 text-xs">{lead.kategori}</div>
                      <div className="text-[11px] text-slate-400">
                        {lead.applicationType.type === 'REPEAT_ORDER'
                          ? `RO #${lead.applicationType.counter || 1}`
                          : 'Pengajuan Baru'}
                      </div>
                    </td>

                    {/* 7. Tanggal Pengajuan */}
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600 font-mono text-[11px]">
                      {lead.detail.tglPengajuan}
                    </td>

                    {/* 8. Last Proses (Subtle Slate Pill) */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <FlowStageBadge stage={lead.flowStage} />
                    </td>

                    {/* 9. Status (Clean Dot + Text) */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            lead.status === 'Completed'
                              ? 'bg-emerald-500'
                              : lead.status === 'Cancelled'
                              ? 'bg-rose-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span>{lead.status}</span>
                      </div>
                    </td>

                    {/* 10. SLA Pengajuan (Clear Text & Duration) */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {lead.sla ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{lead.sla.formatted}</span>
                          {lead.sla.status === 'RUNNING' && (
                            <span className="text-[10px] text-slate-400 font-sans">(Berjalan)</span>
                          )}
                          {lead.sla.status === 'CANCELLED' && (
                            <span className="text-[10px] text-slate-400 font-sans">(Batal)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>

                    {/* 11 & 12. Aksi Buttons */}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-0.5 text-slate-400">
                        {/* Button Detail Kaca Pembesar */}
                        <button
                          type="button"
                          aria-label={`Detail formulir pengajuan ${lead.nama}`}
                          title="Detail Pengajuan (Kaca Pembesar)"
                          className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700 transition"
                          onClick={() => setDetailLead(lead)}
                        >
                          <Search className="h-4 w-4" />
                        </button>

                        {/* Button tanda chevron: Membuka Pop Up Modal */}
                        <button
                          type="button"
                          aria-label={`Pop-up Detail Status & Flow Pengajuan Real ${lead.nama}`}
                          title="Detail Status & Flow Pengajuan Real"
                          className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700 transition"
                          onClick={() => setModalLead(lead)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination (Clean & Simple) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 bg-white">
          <p>
            {filtered.length === 0
              ? 'Tidak ada leads'
              : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} dari ${filtered.length} leads`}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Halaman sebelumnya"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: pageCount }, (_, index) => {
              const number = index + 1;
              const active = number === safePage;
              return (
                <button
                  key={number}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setPage(number)}
                  className={`h-7 min-w-7 rounded-md px-1.5 text-xs font-medium transition ${
                    active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {number}
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Halaman berikutnya"
              disabled={safePage === pageCount}
              onClick={() => setPage(safePage + 1)}
              className="rounded-md p-1.5 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE POP-UP MODAL (Detail Status & Flow Pengajuan Real) ── */}
      {modalLead && (
        <DetailStatusFlowModal
          lead={modalLead}
          onClose={() => setModalLead(null)}
        />
      )}
    </main>
  );
}

// ─── Existing Lead Detail View (Kaca Pembesar) — Dipertahankan ──────────────────

function LeadDetailView({ lead, onBack }: { lead: Lead; onBack: () => void }) {
  const [tab, setTab] = useState<TabName>('Data Pemohon');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <div>
        <div className="px-6 pb-2 pt-5">
          <h2 id="lead-detail-title" className="text-xl font-bold tracking-tight text-slate-900">Detail Leads</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            <button type="button" className="hover:text-slate-600" onClick={onBack}>Leads</button>
            <span className="px-0.5">›</span>
            <span className="text-slate-500">Detail Leads</span>
          </p>
        </div>

        <div className="flex border-b border-slate-200 px-4" role="tablist">
          {TABS.map((name) => {
            const active = tab === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(name)}
                className={`relative px-3 py-3 text-center text-xs sm:text-sm transition ${
                  active ? 'font-semibold text-slate-900' : 'text-slate-500 hover:text-slate-700 font-medium'
                }`}
              >
                {name}
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-slate-900" />}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5" role="tabpanel">
          <div className="rounded-xl bg-white px-5 py-5 shadow-xs border border-slate-200/80 sm:px-6">
            {tab === 'Data Pemohon' && <DataPemohonPanel lead={lead} />}
            {tab === 'Data Pengajuan' && (
              <Section title="Data Pengajuan" subtitle="ID leads, tenor, sales, dan keterangan pengajuan.">
                <DetailRow label="ID Leads">{lead.id}</DetailRow>
                <DetailRow label="Tanggal Leads">{lead.tanggalLeads}</DetailRow>
                <DetailRow label="Tgl Pengajuan">{lead.detail.tglPengajuan}</DetailRow>
                <DetailRow label="Tenor">{lead.detail.tenor}</DetailRow>
                <DetailRow label="Nama Sales">{lead.detail.namaSales}</DetailRow>
                <DetailRow label="SoA">{lead.detail.soa}</DetailRow>
                <DetailRow label="Status Data">{lead.detail.statusData}</DetailRow>
                <DetailRow label="Keterangan">{lead.detail.keterangan}</DetailRow>
              </Section>
            )}
            {tab === 'Data Pasangan' && (
              <Section title="Data Pasangan" subtitle="Nama, NIK, pekerjaan, dan nomor HP pasangan.">
                {lead.pasangan ? (
                  <>
                    <DetailRow label="Nama">{lead.pasangan.nama}</DetailRow>
                    <DetailRow label="NIK">{lead.pasangan.nik}</DetailRow>
                    <DetailRow label="Pekerjaan">{lead.pasangan.pekerjaan}</DetailRow>
                    <DetailRow label="No HP">{lead.pasangan.noHp}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data pasangan.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Data Penjamin' && (
              <Section title="Data Penjamin" subtitle="Nama, hubungan, dan kontak penjamin.">
                {lead.penjamin ? (
                  <>
                    <DetailRow label="Nama">{lead.penjamin.nama}</DetailRow>
                    <DetailRow label="Hubungan">{lead.penjamin.hubungan}</DetailRow>
                    <DetailRow label="NIK">{lead.penjamin.nik}</DetailRow>
                    <DetailRow label="No HP">{lead.penjamin.noHp}</DetailRow>
                    <DetailRow label="Alamat">{lead.penjamin.alamat}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data penjamin.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Data Agunan' && (
              <Section title="Data Agunan" subtitle="Jenis, deskripsi, dan nilai agunan.">
                {lead.agunan ? (
                  <>
                    <DetailRow label="Jenis Agunan">{lead.agunan.jenis}</DetailRow>
                    <DetailRow label="Deskripsi">{lead.agunan.deskripsi}</DetailRow>
                    <DetailRow label="Perkiraan Nilai">{lead.agunan.nilai}</DetailRow>
                    <DetailRow label="Atas Nama">{lead.agunan.atasNama}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data agunan.</EmptyNote>
                )}
              </Section>
            )}
            {tab === 'Credit Checking' && (
              <Section title="Credit Checking" subtitle="Hasil SLIK dan catatan pemeriksaan.">
                {lead.creditChecking ? (
                  <>
                    <DetailRow label="Hasil SLIK">{lead.creditChecking.hasilSlik}</DetailRow>
                    <DetailRow label="Kolektibilitas">{lead.creditChecking.kolektibilitas}</DetailRow>
                    <DetailRow label="Tanggal Checking">{lead.creditChecking.tanggal}</DetailRow>
                    <DetailRow label="Catatan">{lead.creditChecking.catatan}</DetailRow>
                  </>
                ) : (
                  <EmptyNote>Tidak ada data credit checking.</EmptyNote>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function DataPemohonPanel({ lead }: { lead: Lead }) {
  const diri = lead.diri;
  const alamat = diri.alamatKtp;
  return (
    <div className="space-y-8">
      <Section title="Data Diri Pemohon" subtitle="Nama, KTP, No HP, Pekerjaan dll.">
        <DetailRow label="Jenis Leads">{diri.jenisLeads}</DetailRow>
        <DetailRow label="No KTP">{diri.noKtp}</DetailRow>
        <DetailRow label="Nama">{diri.nama}</DetailRow>
        <DetailRow label="Foto KTP">
          <KtpPhoto src={diri.fotoKtp} nama={diri.nama} />
        </DetailRow>
        <DetailRow label="No HP">{diri.noHp}</DetailRow>
        <DetailRow label="Jenis Kelamin">{diri.jenisKelamin}</DetailRow>
        <DetailRow label="Tempat Lahir">{diri.tempatLahir}</DetailRow>
        <DetailRow label="Tanggal Lahir">{diri.tanggalLahir}</DetailRow>
        <DetailRow label="Agama">{diri.agama}</DetailRow>
        <DetailRow label="Status Pernikahan">{diri.statusPernikahan}</DetailRow>
        <DetailRow label="Pekerjaan">{diri.pekerjaan}</DetailRow>
        <DetailRow label="Nama Ibu Kandung">{diri.namaIbuKandung}</DetailRow>
        <DetailRow label="Warga Negara">{diri.wargaNegara}</DetailRow>
        <DetailRow label="Tujuan Pinjaman">{diri.tujuanPinjaman}</DetailRow>
      </Section>
      <Section title="Alamat Sesuai KTP" subtitle="Provinsi, Kota, Kecamatan, Kelurahan">
        <DetailRow label="Provinsi">{alamat.provinsi}</DetailRow>
        <DetailRow label="Kota">{alamat.kota}</DetailRow>
        <DetailRow label="Kecamatan">{alamat.kecamatan}</DetailRow>
        <DetailRow label="Kelurahan">{alamat.kelurahan}</DetailRow>
        <DetailRow label="RT / RW">{alamat.rtRw}</DetailRow>
        <DetailRow label="Kodepos">{alamat.kodepos}</DetailRow>
        <DetailRow label="Alamat Lengkap">{alamat.alamatLengkap}</DetailRow>
      </Section>
    </div>
  );
}

function KtpPhoto({ src, nama }: { src?: string; nama: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-36 w-full max-w-[360px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-400">
        Foto KTP belum dilampirkan
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`Foto KTP ${nama}`}
      onError={() => setFailed(true)}
      className="mt-1 w-full max-w-[360px] rounded-sm"
    />
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7.25rem,32%)_minmax(0,1fr)] items-start gap-x-6 border-b border-slate-100 py-3">
      <dt className="text-xs text-slate-500 font-medium">{label}</dt>
      <dd className="text-xs text-slate-800">{children}</dd>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="border-b border-slate-100 py-4 text-xs text-slate-400">{children}</p>;
}
