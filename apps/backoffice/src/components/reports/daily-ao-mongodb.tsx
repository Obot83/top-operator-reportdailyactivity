'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
  RotateCcw,
  Filter,
  Calendar,
  Search,
  FileSpreadsheet,
  Printer,
  Columns3,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  Building2,
  User,
  CreditCard,
  CalendarDays,
  FileCheck2,
  Copy,
  Check,
  Tag,
  Briefcase,
  MapPin,
  MessageSquareText,
  Repeat,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ClipboardCheck,
} from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { DetailPinjamanDebitur } from '@/components/leads/detail-pinjaman-debitur';

// ─── Types ────────────────────────────────────────────────────────────────────

type AoOfficer = {
  id: string;
  name: string;
  branch: string;
};

export type FlowStageCode =
  | 'PENGAJUAN_COMPLETED'
  | 'KOMITE_REVIEW'
  | 'SURVEY_IN_PROGRESS'
  | 'SURVEY_CANCELED'
  | 'KOMITE_REJECTED'
  | 'SLIK_PASSED'
  | 'SLIK_REJECTED'
  | 'LEADS_MANDATORY'
  | 'LEADS_INPUT';

export type FlowStageInfo = {
  code: FlowStageCode;
  name: string;
  description: string;
  badge_variant: 'completed' | 'komite' | 'survey' | 'cancelled' | 'slik_pass' | 'slik_reject' | 'draft';
};

export type ApplicationTypeInfo = {
  type: 'NEW' | 'REPEAT_ORDER';
  label: string;
  source: string;
  counter: number;
};

export type RawMongoStatus = {
  lead: string | null;
  credit_checking: string | null;
  survey: string | null;
  pengajuan: string | null;
};

export type SlaStatus = 'COMPLETED' | 'RUNNING' | 'CANCELLED' | 'NOT_STARTED';

export type SlaInfo = {
  duration_minutes: number | null;
  formatted: string;
  formatted_long: string;
  badge_label: string;
  status: SlaStatus;
  start_time: string | null;
  end_time: string | null;
  is_complete: boolean;
  description: string;
};

export type OfficerItem = {
  nama_ao: string;
  username: string;
  cabang: string;
  keterangan: string;
};

export type ActivityTimelineItem = {
  jenis_aktivitas: string;
  waktu_pencatatan: string | null;
  waktu_selesai: string | null;
  sla: string;
};

export type SalesNoteItem = {
  nama_user: string;
  catatan: string;
  waktu: string | null;
};

export type ActivityItem = {
  id: string;
  ao_id: string;
  ao_name: string;
  branch: string;
  waktu: string;
  debitur: string;
  kategori: string;
  jenis_aktivitas: string;
  referensi: string;
  hasil_aktivitas: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  flow_stage: FlowStageInfo;
  application_type: ApplicationTypeInfo;
  raw_status: RawMongoStatus;
  interpretation: string;
  follow_up: string | null;
  nominal: number;
  source: 'lead' | 'group';
  sla: SlaInfo;
  officers?: OfficerItem[];
  activities_timeline?: ActivityTimelineItem[];
  sales_notes?: SalesNoteItem[];
};

export function formatFullDateTime(val: string | null | undefined): string {
  if (!val || val === '-') return '-';
  const trimmed = String(val).trim();
  if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${day} ${month} ${year} ${hh}:${mm}:${ss}`;
}

type ChartItem = { label: string; value: number };
type BarItem = { ao_id?: string; ao_name: string; value: number };
type StageCountItem = { code: FlowStageCode; label: string; count: number; badge_variant: string };

type DailyReportData = {
  summary: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    komite_review: number;
    sedang_survey: number;
    new_loan_count: number;
    repeat_order_count: number;
    ao_aktif: number;
    prev_total: number;
    avg_sla_completed_minutes?: number;
    avg_sla_completed_formatted?: string;
    by_kategori: ChartItem[];
    by_status: ChartItem[];
    by_stage: StageCountItem[];
    by_app_type: ChartItem[];
    by_ao: BarItem[];
  };
  activities: ActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

// ─── Donut Chart (Responsive SVG, No Truncation) ──────────────────────────────

function DonutChart({
  items,
  total,
  colors,
  layout = 'side',
}: {
  items: ChartItem[];
  total: number;
  colors: Record<string, string>;
  layout?: 'side' | 'stacked';
}) {
  const size = layout === 'stacked' ? 140 : 136;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  if (layout === 'stacked') {
    return (
      <div className="flex flex-col items-center gap-4 py-2 w-full">
        {/* Grafik Donut di Atas */}
        <div className="relative shrink-0 mx-auto" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {total > 0 &&
              items.map((item, idx) => {
                const percent = item.value / total;
                const dashLength = percent * circumference;
                const strokeOffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;
                const color = colors[item.label] || '#94a3b8';

                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={strokeOffset}
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900 leading-none">{total}</span>
            <span className="text-[11px] text-slate-600 mt-1 font-bold tracking-tight">Total Data</span>
          </div>
        </div>

        {/* Status di Bawah Grafik */}
        <div className="flex flex-col gap-2 w-full pt-2 border-t border-slate-100">
          {items.length === 0 ? (
            <div className="text-xs font-semibold text-slate-500 text-center py-2">Belum ada data</div>
          ) : (
            items.map((item, idx) => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
              const color = colors[item.label] || '#94a3b8';
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100 transition hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                    <span className="text-slate-800 font-bold text-xs">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-900 font-extrabold">{item.value}</span>
                    <span className="text-slate-500 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-2 w-full">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {total > 0 &&
            items.map((item, idx) => {
              const percent = item.value / total;
              const dashLength = percent * circumference;
              const strokeOffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;
              const color = colors[item.label] || '#94a3b8';

              return (
                <circle
                  key={idx}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  fill="transparent"
                  className="transition-all duration-500"
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 leading-none">{total}</span>
          <span className="text-[11px] text-slate-600 mt-1 font-bold tracking-tight">Total Data</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full sm:flex-1 min-w-0">
        {items.length === 0 ? (
          <div className="text-xs font-semibold text-slate-500 text-center py-4">Belum ada data</div>
        ) : (
          items.map((item, idx) => {
            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            const color = colors[item.label] || '#94a3b8';
            return (
              <div key={idx} className="flex items-start justify-between text-xs gap-2 py-0.5 border-b border-slate-50 last:border-0 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs mt-0.5" style={{ backgroundColor: color }} />
                  <span className="text-slate-800 font-bold text-xs whitespace-normal leading-tight">
                    {item.label}
                  </span>
                </div>
                <div className="shrink-0 text-right pl-2">
                  <span className="font-black text-slate-900">{item.value}</span>{' '}
                  <span className="text-slate-500 font-bold text-[11px]">({pct}%)</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Bar Chart (Responsive, Interactive Filter by AO) ─────────────────────────

function AoBarChart({
  items,
  selectedAoId,
  onSelectAo,
}: {
  items: BarItem[];
  selectedAoId?: string;
  onSelectAo?: (aoId: string) => void;
}) {
  if (!items || items.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs font-semibold text-slate-500">Tidak ada data</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const displayItems = items.slice(0, 5);

  return (
    <div className="flex items-end justify-around gap-2 h-48 pt-4 pb-1 px-1 w-full">
      {displayItems.map((item, idx) => {
        const heightPct = Math.max((item.value / max) * 100, 16);
        const isSelected = selectedAoId === item.ao_id;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => item.ao_id && onSelectAo?.(isSelected ? '' : item.ao_id)}
            className={`flex flex-col items-center flex-1 h-full justify-end group min-w-0 p-1.5 rounded-xl transition cursor-pointer ${
              isSelected ? 'bg-blue-50/90 ring-2 ring-blue-500' : 'hover:bg-slate-50'
            }`}
            title={`Klik untuk filter data hanya untuk ${item.ao_name}`}
          >
            <span
              className={`text-sm font-black mb-1.5 transition ${
                isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-900 group-hover:text-blue-600'
              }`}
            >
              {item.value}
            </span>
            <div
              className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 shadow-xs ${
                isSelected ? 'bg-blue-600' : 'bg-[#3b82f6] group-hover:bg-[#1d4ed8]'
              }`}
              style={{ height: `${heightPct * 0.55}%` }}
            />
            <div className="mt-2 text-center w-full px-0.5 flex flex-col items-center">
              <span
                className={`text-[11px] font-bold leading-tight break-words text-center line-clamp-1 transition ${
                  isSelected ? 'text-blue-700 underline font-black' : 'text-slate-800 group-hover:text-blue-700'
                }`}
                title={item.ao_name}
              >
                {item.ao_name}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-0.5 font-mono truncate max-w-full">
                {item.ao_id}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Stage Badge Component ───────────────────────────────────────────────────

function FlowStageBadge({ stage }: { stage: FlowStageInfo }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    komite: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    survey: 'bg-sky-50 text-sky-700 border-sky-200/80',
    slik_pass: 'bg-teal-50 text-teal-700 border-teal-200/80',
    slik_reject: 'bg-amber-50 text-amber-700 border-amber-200/80',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200/80',
    draft: 'bg-slate-100 text-slate-700 border-slate-200/80',
  };
  const dotColors: Record<string, string> = {
    completed: 'bg-emerald-500',
    komite: 'bg-indigo-500',
    survey: 'bg-sky-500',
    slik_pass: 'bg-teal-500',
    slik_reject: 'bg-amber-500',
    cancelled: 'bg-rose-500',
    draft: 'bg-slate-400',
  };

  const style = styles[stage.badge_variant] || styles.draft;
  const dotColor = dotColors[stage.badge_variant] || dotColors.draft;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{stage.name}</span>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyAoMongoReport() {
  // Filter form states (input values)
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterAo, setFilterAo] = useState('');
  const [filterKategori, setFilterKategori] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterAppType, setFilterAppType] = useState('all');
  const [filterQ, setFilterQ] = useState('');

  // Applied filters (triggers actual query)
  const [applied, setApplied] = useState({
    startDate: '',
    endDate: '',
    ao: '',
    kategori: 'all',
    status: 'all',
    stage: 'all',
    app_type: 'all',
    q: '',
    page: 1,
    limit: 10,
  });

  // Selected item for detail modal
  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Load AO list
  const officersQuery = useQuery<AoOfficer[]>({
    queryKey: ['mongo-officers'],
    queryFn: async () => {
      const res = await fetch('/api/reports/ao/mongo-officers');
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat AO');
      return json.data;
    },
  });

  // Load Daily Report
  const reportQuery = useQuery<DailyReportData>({
    queryKey: ['mongo-daily', applied],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (applied.startDate) params.set('startDate', applied.startDate);
      if (applied.endDate) params.set('endDate', applied.endDate);
      if (applied.ao) params.set('ao', applied.ao);
      if (applied.kategori && applied.kategori !== 'all') params.set('kategori', applied.kategori);
      if (applied.status && applied.status !== 'all') params.set('status', applied.status);
      if (applied.stage && applied.stage !== 'all') params.set('stage', applied.stage);
      if (applied.app_type && applied.app_type !== 'all') params.set('app_type', applied.app_type);
      if (applied.q) params.set('q', applied.q);
      params.set('page', String(applied.page));
      params.set('limit', String(applied.limit));

      const res = await fetch(`/api/reports/ao/mongo-daily?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Gagal memuat laporan');
      return json.data;
    },
  });

  const handleFilterByAo = (aoId: string) => {
    setFilterAo(aoId);
    setApplied((prev) => ({
      ...prev,
      ao: aoId,
      page: 1,
    }));
  };

  const selectedAoInfo = officersQuery.data?.find((o) => o.id === applied.ao);
  const selectedAoName = selectedAoInfo ? selectedAoInfo.name : applied.ao;

  const handleApplyFilter = () => {
    setApplied({
      startDate: filterStartDate,
      endDate: filterEndDate,
      ao: filterAo,
      kategori: filterKategori,
      status: filterStatus,
      stage: filterStage,
      app_type: filterAppType,
      q: filterQ,
      page: 1,
      limit: applied.limit,
    });
  };

  const handleResetFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterAo('');
    setFilterKategori('all');
    setFilterStatus('all');
    setFilterStage('all');
    setFilterAppType('all');
    setFilterQ('');
    setApplied({
      startDate: '',
      endDate: '',
      ao: '',
      kategori: 'all',
      status: 'all',
      stage: 'all',
      app_type: 'all',
      q: '',
      page: 1,
      limit: 10,
    });
  };

  const handleCopyReference = (ref: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ref);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const summary = reportQuery.data?.summary ?? {
    total: 0,
    completed: 0,
    pending: 0,
    cancelled: 0,
    komite_review: 0,
    sedang_survey: 0,
    new_loan_count: 0,
    repeat_order_count: 0,
    ao_aktif: 0,
    prev_total: 0,
    by_kategori: [],
    by_status: [],
    by_stage: [],
    by_app_type: [],
    by_ao: [],
  };

  const activities = reportQuery.data?.activities ?? [];
  const pagination = reportQuery.data?.pagination ?? { page: 1, limit: 10, total: 0, total_pages: 1 };

  // Calculate percentages
  const total = summary.total;
  const pctCompleted = total > 0 ? ((summary.completed / total) * 100).toFixed(1) : '0';
  const pctKomite = total > 0 ? ((summary.komite_review / total) * 100).toFixed(1) : '0';
  const pctSurvey = total > 0 ? ((summary.sedang_survey / total) * 100).toFixed(1) : '0';
  const pctCancelled = total > 0 ? ((summary.cancelled / total) * 100).toFixed(1) : '0';

  // Export CSV handler
  const handleExportCsv = () => {
    if (activities.length === 0) return;
    const headers = [
      'No',
      'Waktu',
      'AO ID',
      'Nama AO',
      'Nama Debitur/Nama Kelompok',
      'Tipe Pengajuan',
      'Kategori',
      'Tracking Proses',
      'Status Leads (Lead/CC/Survey/Pengajuan)',
      'Status',
      'SLA Pengajuan (Step Pengajuan -> Complete)',
      'Interpretasi Data',
      'Referensi',
      'Hasil Aktivitas',
      'Nominal',
      'Cabang',
    ];

    const rows = activities.map((a, idx) => [
      idx + 1,
      formatWaktu(a.waktu),
      `"${a.ao_id}"`,
      `"${a.ao_name.replace(/"/g, '""')}"`,
      `"${a.debitur.replace(/"/g, '""')}"`,
      `"${a.application_type.label}"`,
      a.kategori,
      `"${a.flow_stage.name}"`,
      `"${a.raw_status.lead ?? '-'}|${a.raw_status.credit_checking ?? '-'}|${a.raw_status.survey ?? '-'}|${a.raw_status.pengajuan ?? '-'}"`,
      a.status,
      `"${a.sla?.formatted || '-'} (${a.sla?.status === 'COMPLETED' ? 'Selesai' : a.sla?.status === 'RUNNING' ? 'Berjalan' : a.sla?.status === 'CANCELLED' ? 'Batal' : '-'})"`,
      `"${(a.interpretation || '-').replace(/"/g, '""')}"`,
      a.referensi,
      `"${(a.hasil_aktivitas || '-').replace(/"/g, '""')}"`,
      a.nominal,
      `"${a.branch.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `daily-ao-report-${applied.startDate ? `${applied.startDate}_${applied.endDate || applied.startDate}` : 'all'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper date formatters
  function formatWaktu(iso: string) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    } catch {
      return '-';
    }
  }

  function formatShortDate(iso: string) {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${mon}/${d.getFullYear()}`;
    } catch {
      return '-';
    }
  }

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const kategoriColors: Record<string, string> = {
    'Produk UMI': '#2563eb',
    'Produk Sertifikat': '#8b5cf6',
  };

  const statusColors: Record<string, string> = {
    Completed: '#10b981',
    Pending: '#f59e0b',
    Cancelled: '#ef4444',
  };

  // Compute 6-step status pipeline for modal visual
  function getPipelineSteps(item: ActivityItem) {
    const s = item.raw_status;
    const stage = item.flow_stage.code;

    // Step 1: Input Leads
    const s1 = {
      title: '1. Input Leads',
      desc: s.lead === 'WAITING' ? 'Masih input data' : 'Mandatory data lengkap',
      status: s.lead === 'WAITING' ? 'active' : 'passed',
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

  return (
    <main className="min-h-screen bg-[#f8fafc] px-3 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <nav className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1.5">
            <span>Operasional & Monitoring</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-semibold">Daily AO Activity Report</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Daily AO Activity Report
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Live Pipeline Stream
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
            Monitoring produktivitas harian Account Officer: Input Leads, Cek SLIK Gateway, Survei Lapangan, Memorandum Komite, hingga Booking Pencairan.
          </p>
        </div>
        <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Tanggal Monitoring
          </span>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* ── Filter Card ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter Parameter Laporan
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {applied.stage !== 'all' || applied.app_type !== 'all' || applied.startDate || applied.endDate || applied.ao
              ? 'Filter Kustom Aktif'
              : 'Semua Parameter Data'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3.5 items-end">
          {/* Range Tanggal Aktivitas (Dari - Sampai) */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Range Tanggal Aktivitas
              </label>
              {(filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                placeholder="Dari"
                title="Dari Tanggal"
                className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                placeholder="Sampai"
                title="Sampai Tanggal"
                className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Account Officer (AO) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Account Officer (AO)
              </label>
              {filterAo && (
                <button
                  type="button"
                  onClick={() => setFilterAo('')}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
            <select
              value={filterAo}
              onChange={(e) => setFilterAo(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 truncate font-medium"
            >
              <option value="">Semua AO ({officersQuery.data?.length || 0})</option>
              {(officersQuery.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.id}) {o.branch ? `• ${o.branch}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tracking Proses (Flow Stage) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Tracking Proses
            </label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Tahap Pipeline</option>
              <option value="PENGAJUAN_COMPLETED">Pengajuan Completed (Approved)</option>
              <option value="KOMITE_REVIEW">Review Komite (Memorandum)</option>
              <option value="SURVEY_IN_PROGRESS">Sedang Proses Survey</option>
              <option value="SURVEY_CANCELED">Survey Dibatalkan</option>
              <option value="KOMITE_REJECTED">Ditolak Komite (Memorandum)</option>
              <option value="SLIK_PASSED">Lolos Cek SLIK (Siap Survey)</option>
              <option value="SLIK_REJECTED">Cek SLIK Ditolak</option>
              <option value="LEADS_MANDATORY">Selesai Mandatory</option>
              <option value="LEADS_INPUT">Input Data Leads (Draft)</option>
            </select>
          </div>

          {/* Tipe Pengajuan (New vs RO) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Tipe Pengajuan
            </label>
            <select
              value={filterAppType}
              onChange={(e) => setFilterAppType(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Tipe (Baru & RO)</option>
              <option value="NEW">Pengajuan Baru (New)</option>
              <option value="REPEAT_ORDER">Repeat Order (RO)</option>
            </select>
          </div>

          {/* Kategori Produk */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Kategori Produk
            </label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-3 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua Produk</option>
              <option value="produk_umi">Produk UMI (ID: 005)</option>
              <option value="produk_sertifikat">Produk Sertifikat (Non-005)</option>
            </select>
          </div>

          {/* Pencarian */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Kata Kunci
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="ID, nama nasabah, status..."
                value={filterQ}
                onChange={(e) => setFilterQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                className="w-full h-9 rounded-lg border border-slate-200/90 bg-white px-3 pr-8 text-xs text-slate-800 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap justify-between sm:justify-end items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-slate-200/80 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
          <button
            type="button"
            onClick={handleApplyFilter}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Terapkan Parameter</span>
          </button>
        </div>
      </div>

      {/* ── 5 Metric Summary Cards Sesuai Flow Real ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Card 1: Total Aktivitas */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Aktivitas</span>
            <div className="w-8 h-8 rounded-lg border border-blue-200/70 bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{summary.total}</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
              Baru: {summary.new_loan_count}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200/60">
              RO: {summary.repeat_order_count}
            </span>
          </div>
        </div>

        {/* Card 2: Pengajuan Completed */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg border border-emerald-200/70 bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{summary.completed}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              <strong className="text-emerald-700 font-semibold">{pctCompleted}%</strong> Selesai KC
            </span>
            {summary.avg_sla_completed_formatted && summary.avg_sla_completed_formatted !== '-' && (
              <span
                className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                title={`Rata-rata SLA Pengajuan Complete: ${summary.avg_sla_completed_formatted}`}
              >
                Avg: {summary.avg_sla_completed_formatted}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Review Komite */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Review Komite</span>
            <div className="w-8 h-8 rounded-lg border border-indigo-200/70 bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{summary.komite_review}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            <strong className="text-indigo-700 font-semibold">{pctKomite}%</strong> Memorandum KC
          </p>
        </div>

        {/* Card 4: Sedang Proses Survey */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proses Survey</span>
            <div className="w-8 h-8 rounded-lg border border-sky-200/70 bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{summary.sedang_survey}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            <strong className="text-sky-700 font-semibold">{pctSurvey}%</strong> Antrean survei
          </p>
        </div>

        {/* Card 5: Dibatalkan / Reject */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dibatalkan / Tolak</span>
            <div className="w-8 h-8 rounded-lg border border-rose-200/70 bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{summary.cancelled}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            <strong className="text-rose-700 font-semibold">{pctCancelled}%</strong> Reject/Batal
          </p>
        </div>
      </div>

      {/* ── 3 Charts Row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart 1: Kategori */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Aktivitas per Kategori
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Komposisi pengajuan & produk</p>
          </div>
          <DonutChart
            items={summary.by_kategori}
            total={summary.total}
            colors={kategoriColors}
            layout="stacked"
          />
        </div>

        {/* Chart 2: Status */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Aktivitas per Status
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sebaran status penyelesaian sistem</p>
          </div>
          <DonutChart
            items={summary.by_status}
            total={summary.total}
            colors={statusColors}
            layout="stacked"
          />
        </div>

        {/* Chart 3: AO Bar Chart */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Aktivitas per AO
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Top AO (Klik batang untuk filter AO)</p>
          </div>
          <AoBarChart
            items={summary.by_ao}
            selectedAoId={applied.ao}
            onSelectAo={handleFilterByAo}
          />
        </div>
      </div>

      {/* ── Table: Daftar Aktivitas ── */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Table Top Header */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Daftar Aktivitas Real Time</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {activities.length} dari {pagination.total} data aktivitas{' '}
              {applied.startDate
                ? `pada periode ${applied.startDate}${applied.endDate ? ` s/d ${applied.endDate}` : ''}`
                : '(Semua Tanggal)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel/CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Export PDF / Cetak
            </button>
          </div>
        </div>

        {/* Active AO Filter Banner */}
        {applied.ao && (
          <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-xs text-blue-900">
              <User className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Menampilkan data khusus AO: <strong className="font-extrabold">{selectedAoName}</strong>{' '}
                <span className="font-mono text-blue-700 font-bold bg-blue-100/90 px-1.5 py-0.5 rounded">
                  ({applied.ao})
                </span>
                {selectedAoInfo?.branch && (
                  <span className="text-blue-600 ml-1">• {selectedAoInfo.branch}</span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleFilterByAo('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-900 text-[11px] font-bold transition shadow-2xs"
            >
              <X className="w-3 h-3" />
              <span>Hapus Filter AO</span>
            </button>
          </div>
        )}

        {/* Table Responsive Wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 min-w-[1180px]">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3.5 w-12 text-center">No</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Waktu</th>
                <th className="py-3.5 px-3.5">AO</th>
                <th className="py-3.5 px-3.5">Nama Debitur/Nama Kelompok</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Tipe</th>
                <th className="py-3.5 px-3.5">Kategori</th>
                <th className="py-3.5 px-3.5">Tracking Proses</th>
                <th className="py-3.5 px-3.5">Status Leads</th>
                <th className="py-3.5 px-3.5">Hasil / Catatan</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th
                  className="py-3.5 px-3.5 whitespace-nowrap"
                  title="SLA: Dihitung dari Step Pengajuan sampai dengan Pengajuan Status Complete"
                >
                  SLA Pengajuan
                </th>
                <th className="py-3.5 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportQuery.isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400 text-xs">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mb-2" />
                    <p>Memuat data aktivitas real sistem...</p>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <p className="font-bold text-slate-700 text-sm">Tidak ada aktivitas ditemukan</p>
                    <p className="text-xs mt-1 text-slate-400">Coba ubah tanggal atau filter yang digunakan.</p>
                  </td>
                </tr>
              ) : (
                activities.map((item, idx) => {
                  const rowNumber = (pagination.page - 1) * pagination.limit + idx + 1;
                  return (
                    <tr key={item.id} className="even:bg-slate-50/30 hover:bg-blue-50/50 transition group">
                      {/* No */}
                      <td className="py-3.5 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      {/* Waktu (Date Time) */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-800 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs">
                          {formatFullDateTime(item.waktu)}
                        </div>
                      </td>

                      {/* AO */}
                      <td className="py-3.5 px-3.5 min-w-[140px]">
                        <button
                          type="button"
                          onClick={() => handleFilterByAo(item.ao_id)}
                          className="text-left group/ao block w-full hover:bg-blue-50/70 p-1 -m-1 rounded-lg transition"
                          title={`Klik untuk filter data khusus AO: ${item.ao_name}`}
                        >
                          <div className="font-bold text-slate-900 group-hover/ao:text-blue-600 leading-snug flex items-center gap-1">
                            <span>{item.ao_name}</span>
                            <Filter className="w-3 h-3 text-slate-300 group-hover/ao:text-blue-500 opacity-0 group-hover/ao:opacity-100 transition shrink-0" />
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">({item.ao_id})</span>
                        </button>
                      </td>

                      {/* Debitur */}
                      <td className="py-3.5 px-3.5 min-w-[160px]">
                        <span className="font-bold text-slate-800 block text-xs">
                          {item.debitur}
                        </span>
                        {item.nominal > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {formatRupiah(item.nominal)}
                          </span>
                        )}
                      </td>

                      {/* Tipe Pengajuan (New vs RO) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {item.application_type.type === 'REPEAT_ORDER' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Repeat className="w-3 h-3 shrink-0" />
                            <span>RO #{item.application_type.counter || 1}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            New
                          </span>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                            item.kategori === 'Produk UMI'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.kategori}
                        </span>
                      </td>

                      {/* Tracking Proses */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <FlowStageBadge stage={item.flow_stage} />
                      </td>

                      {/* Status Leads (Semantic Flow Indicator) */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                              item.raw_status.lead === 'RESPONSE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                            title={`Status Leads: ${item.raw_status.lead ?? 'null'}`}
                          >
                            L: {item.raw_status.lead ?? '-'}
                          </span>
                          <span className="text-slate-300">›</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                              item.raw_status.survey === 'DONE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                : item.raw_status.survey === 'CANCELED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                            title={`Status Survei: ${item.raw_status.survey ?? 'null'}`}
                          >
                            S: {item.raw_status.survey ?? '-'}
                          </span>
                          <span className="text-slate-300">›</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                              item.raw_status.pengajuan === 'COMPLETED' || item.raw_status.pengajuan === 'PROSES'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                            }`}
                            title={`Status Pengajuan: ${item.raw_status.pengajuan ?? 'null'}`}
                          >
                            P: {item.raw_status.pengajuan ?? '-'}
                          </span>
                        </div>
                      </td>

                      {/* Hasil / Catatan */}
                      <td
                        className="py-3.5 px-3.5 text-slate-600 max-w-[160px] truncate"
                        title={item.hasil_aktivitas || item.interpretation}
                      >
                        {item.hasil_aktivitas || item.interpretation || '-'}
                      </td>

                      {/* Status Umum */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            item.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                              : item.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                              : 'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Completed'
                                ? 'bg-emerald-500'
                                : item.status === 'Cancelled'
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* SLA Pengajuan */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {item.sla ? (
                          item.sla.status === 'COMPLETED' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono tabular-nums"
                              title={`SLA Selesai: ${item.sla.formatted_long || item.sla.formatted} (Berhenti di Pengajuan Complete)\nMulai: ${item.sla.start_time ? formatDateTime(item.sla.start_time) : '-'}\nSelesai: ${item.sla.end_time ? formatDateTime(item.sla.end_time) : '-'}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{item.sla.formatted}</span>
                            </span>
                          ) : item.sla.status === 'RUNNING' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 font-mono tabular-nums"
                              title={`SLA Berjalan: Masih dalam proses (${item.flow_stage.name}), belum complete\nMulai: ${item.sla.start_time ? formatDateTime(item.sla.start_time) : '-'}`}
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                              <span>Berjalan ({item.sla.formatted})</span>
                            </span>
                          ) : item.sla.status === 'CANCELLED' ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 font-mono tabular-nums"
                              title={`SLA Berhenti: Proses dibatalkan/ditolak (${item.flow_stage.name})\nMulai: ${item.sla.start_time ? formatDateTime(item.sla.start_time) : '-'}\nBerhenti: ${item.sla.end_time ? formatDateTime(item.sla.end_time) : '-'}`}
                            >
                              <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.sla.formatted} (Batal)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition active:scale-95 shadow-2xs"
                          title="Lihat Detail & Flow Status Real"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Responsive Pagination */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-slate-50/60">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Menampilkan{' '}
            <span className="font-bold text-slate-700">
              {activities.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
            </span>{' '}
            -{' '}
            <span className="font-bold text-slate-700">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            dari{' '}
            <span className="font-bold text-slate-700">{pagination.total}</span> data aktivitas
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Tampilkan:</span>
              <select
                value={applied.limit}
                onChange={(e) =>
                  setApplied((prev) => ({
                    ...prev,
                    limit: parseInt(e.target.value, 10),
                    page: 1,
                  }))
                }
                className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="10">10 / halaman</option>
                <option value="25">25 / halaman</option>
                <option value="50">50 / halaman</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setApplied((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                }
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 text-xs font-bold text-slate-700">
                {pagination.page} / {pagination.total_pages || 1}
              </span>

              <button
                type="button"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() =>
                  setApplied((prev) => ({
                    ...prev,
                    page: Math.min(pagination.total_pages, prev.page + 1),
                  }))
                }
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL DETAIL AKTIVITAS (FLOW REAL MONGODB & VISUAL PIPELINE) ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    Detail Status & Flow Pengajuan Real
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-slate-500 font-medium">
                      ID: {selectedItem.referensi}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyReference(selectedItem.referensi)}
                      className="text-slate-400 hover:text-blue-600 transition inline-flex items-center gap-1 text-[10px]"
                      title="Salin Referensi"
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
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 flex items-center justify-center transition"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Profile Card & Badges */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Nama Debitur / ID Leads
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {selectedItem.debitur}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <FlowStageBadge stage={selectedItem.flow_stage} />

                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60">
                      {selectedItem.application_type.type === 'REPEAT_ORDER'
                        ? `RO #${selectedItem.application_type.counter || 1}`
                        : 'Pengajuan Baru'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Card Detail Pinjaman Debitur (Berdasarkan Struktur client_product) ── */}
              <DetailPinjamanDebitur lead={selectedItem} />

              {/* ── Visual Flow Pipeline / Stepper ── */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-slate-500" />
                    <span>Progress Alur Pengajuan Sistem</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tahap: <span className="font-semibold text-slate-800">{selectedItem.flow_stage.name}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                  {getPipelineSteps(selectedItem).map((step, idx) => (
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
              {selectedItem.sla && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>SLA Pengajuan</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          selectedItem.sla.status === 'COMPLETED'
                            ? 'bg-emerald-500'
                            : selectedItem.sla.status === 'RUNNING'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      <span>
                        {selectedItem.sla.status === 'COMPLETED'
                          ? 'SLA Selesai'
                          : selectedItem.sla.status === 'RUNNING'
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
                        {selectedItem.sla.start_time ? formatDateTime(selectedItem.sla.start_time) : '-'}
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
                        {selectedItem.sla.is_complete && selectedItem.sla.end_time
                          ? formatDateTime(selectedItem.sla.end_time)
                          : selectedItem.sla.status === 'RUNNING'
                          ? 'Menunggu Pengajuan Complete'
                          : selectedItem.sla.end_time
                          ? formatDateTime(selectedItem.sla.end_time)
                          : '-'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {selectedItem.sla.is_complete
                          ? 'SLA berhenti di approval memorandum KC'
                          : selectedItem.sla.status === 'RUNNING'
                          ? 'Timer SLA masih terus berjalan'
                          : 'Proses pengajuan dihentikan'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Total Durasi SLA
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">
                        {selectedItem.sla.formatted_long || selectedItem.sla.formatted}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5 leading-snug">
                        {selectedItem.sla.description}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3 Tabel Spesifikasi: Petugas AO, Aktivitas & Waktu, Catatan Sales ── */}
              {(() => {
                const officersList: OfficerItem[] = selectedItem.officers?.length
                  ? selectedItem.officers
                  : [
                      {
                        nama_ao: selectedItem.ao_name || '-',
                        username: selectedItem.ao_id || '-',
                        cabang: selectedItem.branch || 'Depok Sertifikat',
                        keterangan: 'Input Data Pemohon',
                      },
                      {
                        nama_ao: selectedItem.ao_name || '-',
                        username: selectedItem.ao_id || '-',
                        cabang: selectedItem.branch || 'Depok Sertifikat',
                        keterangan: 'Pengecekan SLIK',
                      },
                      {
                        nama_ao: selectedItem.ao_name || '-',
                        username: selectedItem.ao_id ? `${selectedItem.ao_id.replace(/_(sur|col)$/i, '')}_sur` : '-',
                        cabang: selectedItem.branch || 'Depok Sertifikat',
                        keterangan: 'Survey',
                      },
                    ];

                const activitiesTimelineList: ActivityTimelineItem[] = selectedItem.activities_timeline?.length
                  ? selectedItem.activities_timeline
                  : [
                      {
                        jenis_aktivitas: 'Input Leads',
                        waktu_pencatatan: selectedItem.waktu,
                        waktu_selesai: selectedItem.sla?.start_time || selectedItem.waktu,
                        sla: '< 1m',
                      },
                      {
                        jenis_aktivitas: 'Cek SLIK',
                        waktu_pencatatan: selectedItem.sla?.start_time || selectedItem.waktu,
                        waktu_selesai: selectedItem.sla?.end_time || null,
                        sla: selectedItem.sla?.status === 'RUNNING' ? 'Sedang Berjalan' : selectedItem.sla?.formatted || '-',
                      },
                      {
                        jenis_aktivitas: 'Survey',
                        waktu_pencatatan: selectedItem.follow_up || null,
                        waktu_selesai: selectedItem.sla?.end_time || null,
                        sla: selectedItem.sla?.status === 'COMPLETED' ? 'Selesai' : '-',
                      },
                    ];

                const salesNotesList: SalesNoteItem[] = selectedItem.sales_notes?.length
                  ? selectedItem.sales_notes
                  : selectedItem.hasil_aktivitas
                  ? [
                      {
                        nama_user: `${selectedItem.ao_name} (${selectedItem.ao_id})`,
                        catatan: selectedItem.hasil_aktivitas,
                        waktu: selectedItem.waktu,
                      },
                    ]
                  : [];

                return (
                  <div className="space-y-4">
                    {/* ── Card Terpadu: Petugas Account Officer & Aktivitas Waktu ── */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <span>Petugas Account Officer & Timeline Aktivitas</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {officersList.length} Petugas Terkait • Tracking SLA
                        </span>
                      </div>

                      {/* Sub-tabel 1: Petugas Account Officer */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px] uppercase tracking-wide">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>Daftar Petugas Account Officer</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                                <th className="py-2.5 px-3">Nama AO</th>
                                <th className="py-2.5 px-3">Username</th>
                                <th className="py-2.5 px-3">Cabang</th>
                                <th className="py-2.5 px-3">Keterangan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {officersList.map((off, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {off.nama_ao}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 font-medium">
                                      {off.username}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span>{off.cabang}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                        off.keterangan === 'Input Data Pemohon'
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : off.keterangan === 'Pengecekan SLIK'
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : off.keterangan === 'Survey'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
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
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px] uppercase tracking-wide">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Aktivitas & Waktu Real Time</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                                <th className="py-2.5 px-3">Jenis Aktivitas</th>
                                <th className="py-2.5 px-3">Waktu Pencatatan</th>
                                <th className="py-2.5 px-3">Waktu Selesai</th>
                                <th className="py-2.5 px-3">SLA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activitiesTimelineList.map((act, idx) => {
                                const isRunning = act.sla === 'Sedang Berjalan';
                                const isNotStarted = act.sla === '-';
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-2 h-2 rounded-full shrink-0 ${
                                            isRunning
                                              ? 'bg-amber-500 animate-pulse'
                                              : isNotStarted
                                              ? 'bg-slate-300'
                                              : 'bg-emerald-500'
                                          }`}
                                        />
                                        <span>{act.jenis_aktivitas}</span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                      {formatFullDateTime(act.waktu_pencatatan)}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                                      {formatFullDateTime(act.waktu_selesai)}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                          isRunning
                                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                                            : isNotStarted
                                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        }`}
                                      >
                                        {isRunning && <Clock className="w-3 h-3 text-amber-600 animate-pulse" />}
                                        {!isRunning && !isNotStarted && (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        )}
                                        <span>{act.sla}</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* ── Card Catatan & Keterangan Petugas ── */}
                    <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <MessageSquareText className="w-3.5 h-3.5" />
                          </div>
                          <span>Catatan & Keterangan Petugas</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Sales, Surveyor, Credit Analyst, & Komite ({salesNotesList.length} Catatan)
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                              <th className="py-2.5 px-3 w-1/4">Nama User / Petugas</th>
                              <th className="py-2.5 px-3 w-1/2">Catatan / Keterangan</th>
                              <th className="py-2.5 px-3 w-1/4 whitespace-nowrap">Waktu</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {salesNotesList.length > 0 ? (
                              salesNotesList.map((n, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors align-top">
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{n.nama_user}</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {n.catatan}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
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
                );
              })()}
            </div>

            {/* Modal Bottom Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Sistem TOP Operator • Kospinus
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="h-8 px-4 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
