import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import fs from 'fs';
import path from 'path';

const MONGODB_DIR = path.resolve('d:/Project/top-operator/mongodb');

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityStatus = 'Completed' | 'Pending' | 'Cancelled';

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

export type ActivityItem = {
  id: string;
  ao_id: string;
  ao_name: string;
  branch: string;
  waktu: string; // ISO string UTC
  debitur: string;
  kategori: string;
  jenis_aktivitas: string;
  referensi: string;
  hasil_aktivitas: string;
  status: ActivityStatus;
  flow_stage: FlowStageInfo;
  application_type: ApplicationTypeInfo;
  raw_status: RawMongoStatus;
  interpretation: string;
  follow_up: string | null;
  nominal: number;
  source: 'lead' | 'group';
};

export type ChartItem = { label: string; value: number };
export type BarItem = { ao_id: string; ao_name: string; value: number };
export type StageCountItem = { code: FlowStageCode; label: string; count: number; badge_variant: string };

export type DailySummary = {
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
  by_kategori: ChartItem[];
  by_status: ChartItem[];
  by_stage: StageCountItem[];
  by_app_type: ChartItem[];
  by_ao: BarItem[];
};

// ─── Data loader (MongoDB live with fallback to local files) ──────────────────

let cachedLeads: any[] | null = null;
let cachedGroups: any[] | null = null;

async function loadData(dateStr?: string, aoId?: string): Promise<{ leads: any[]; groups: any[]; aoNames: Map<string, string> }> {
  try {
    const db = await getMongoDb();
    const leadMatch: any = {};
    const groupMatch: any = {};

    if (dateStr) {
      const start = new Date(`${dateStr}T00:00:00+07:00`);
      const end = new Date(`${dateStr}T23:59:59.999+07:00`);
      const dateQuery = {
        $or: [
          { create_dtm: { $gte: start, $lte: end } },
          { create_dtm: { $regex: `^${dateStr}` } },
        ],
      };
      Object.assign(leadMatch, dateQuery);
      Object.assign(groupMatch, dateQuery);
    }

    if (aoId) {
      leadMatch.create_user = aoId;
      groupMatch['sales.id'] = aoId;
    }

    const projection = {
      create_dtm: 1,
      create_user: 1,
      status: 1,
      flg: 1,
      pemohon: 1,
      pengajuan: 1,
      keterangan: 1,
      survey_dtm: 1,
      client: 1,
      reff: 1,
    };

    const [leads, groups, groupSales] = await Promise.all([
      db.collection('leads')
        .find(leadMatch, { projection })
        .sort({ create_dtm: -1 })
        .limit(dateStr ? 2000 : 500)
        .toArray(),
      db.collection('leads_group')
        .find(groupMatch)
        .sort({ create_dtm: -1 })
        .limit(dateStr ? 1000 : 300)
        .toArray(),
      db.collection('leads_group')
        .find({}, { projection: { 'sales.id': 1, 'sales.name': 1 } })
        .toArray(),
    ]);

    const aoNames = new Map<string, string>();
    for (const g of groupSales) {
      const id = (g as any).sales?.id;
      const name = ((g as any).sales?.name ?? '').trim();
      if (id && name) aoNames.set(id, name);
    }

    return { leads, groups, aoNames };
  } catch (err) {
    console.warn('[mongo-daily] live DB failed, fallback to local files:', err);
    const MONGODB_DIR = path.resolve('d:/Project/top-operator/mongodb');
    if (fs.existsSync(path.join(MONGODB_DIR, 'kospinus001.leads.json'))) {
      if (!cachedLeads) {
        cachedLeads = JSON.parse(
          fs.readFileSync(path.join(MONGODB_DIR, 'kospinus001.leads.json'), 'utf8'),
        );
      }
      if (!cachedGroups) {
        cachedGroups = JSON.parse(
          fs.readFileSync(path.join(MONGODB_DIR, 'kospinus001.leads_group.json'), 'utf8'),
        );
      }
      const aoNames = new Map<string, string>();
      for (const g of cachedGroups!) {
        const id: string = g.sales?.id;
        const name: string = (g.sales?.name ?? '').trim();
        if (id && name) aoNames.set(id, name);
      }
      return { leads: cachedLeads!, groups: cachedGroups!, aoNames };
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.$date) {
    return typeof val.$date === 'string' ? val.$date : new Date(val.$date).toISOString();
  }
  return '';
}

function extractNumber(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object') {
    if (val.$numberDecimal) return parseFloat(val.$numberDecimal) || 0;
    if (typeof val.toString === 'function') return parseFloat(val.toString()) || 0;
  }
  return 0;
}

function toLocalDate(isoStr: string): string {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + 7);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Flow & Status Determination Based on Real Flow & PDF Spec ────────────────

function resolveLeadFlow(l: any): {
  status: ActivityStatus;
  flow_stage: FlowStageInfo;
  jenis_aktivitas: string;
  interpretation: string;
} {
  const s = l.status || {};
  const flg = l.flg || {};
  const lead = s.lead ?? null;
  const cc = s.credit_checking ?? null;
  const survey = s.survey ?? null;
  const pengajuan = s.pengajuan ?? null;

  // 1. Pengajuan Completed (Selesai approval memorandum KC / core system)
  if (
    pengajuan === 'PROSES' ||
    pengajuan === 'COMPLETED' ||
    (lead === 'ON PROCESS' && cc === 'PASSED' && (survey === 'DONE' || survey === 'PASSED') && pengajuan === 'PROSES')
  ) {
    return {
      status: 'Completed',
      flow_stage: {
        code: 'PENGAJUAN_COMPLETED',
        name: 'Pengajuan Completed',
        description: 'Sudah selesai approval memorandum KC, siap atau telah terkirim ke core system',
        badge_variant: 'completed',
      },
      jenis_aktivitas: 'Pengajuan Disetujui (Completed)',
      interpretation: 'Sudah selesai approval memorandum KC',
    };
  }

  // 2. Ditolak Komite (Penolakan pada approval memorandum oleh KC)
  if (
    pengajuan === 'TOLAK' ||
    (lead === 'REJECT' && cc === 'PASSED' && (survey === 'DONE' || survey === 'PASSED'))
  ) {
    return {
      status: 'Cancelled',
      flow_stage: {
        code: 'KOMITE_REJECTED',
        name: 'Ditolak Komite',
        description: 'Ditolak di tahap approval memorandum KC',
        badge_variant: 'cancelled',
      },
      jenis_aktivitas: 'Penolakan Memorandum KC',
      interpretation: 'Ditolak di approval memorandum KC',
    };
  }

  // 3. Review Komite (Selesai survey, memorandum kaops / checking data / approval memorandum KC)
  if (
    (lead === 'ON PROCESS' || lead === 'RESPONSE') &&
    (cc === 'PASSED' || cc === 'DONE') &&
    (survey === 'DONE' || survey === 'PASSED') &&
    !pengajuan
  ) {
    return {
      status: 'Pending',
      flow_stage: {
        code: 'KOMITE_REVIEW',
        name: 'Review Komite',
        description: 'Leads sudah selesai kirim survey, ada di backoffice memorandum kaops / checking data / approval memorandum KC',
        badge_variant: 'komite',
      },
      jenis_aktivitas: 'Review Komite & Memorandum',
      interpretation: 'Leads sudah selesai survey, proses review memorandum kaops/KC',
    };
  }

  // 4. Survey Dibatalkan
  if (
    survey === 'CANCELED' ||
    (lead === 'CANCELED' && survey === 'CANCELED') ||
    (lead === 'CANCEL' && cc === 'PASSED')
  ) {
    return {
      status: 'Cancelled',
      flow_stage: {
        code: 'SURVEY_CANCELED',
        name: 'Survey Dibatalkan',
        description: 'Tahap survei dibatalkan oleh surveyor atau calon debitur tidak bersedia',
        badge_variant: 'cancelled',
      },
      jenis_aktivitas: 'Survey Dibatalkan',
      interpretation: 'Leads ada di tahap prospect cancelled / survey dibatalkan',
    };
  }

  // 5. Sedang Proses Survey (Prospect scheduled, rescheduled, waiting)
  if (
    lead === 'PROSPECTS' ||
    survey === 'SCHEDULED' ||
    survey === 'RESCHEDULED' ||
    (survey === 'WAITING' && cc === 'PASSED')
  ) {
    const subLabel =
      survey === 'SCHEDULED'
        ? 'Terjadwal'
        : survey === 'RESCHEDULED'
        ? 'Dijadwalkan Ulang'
        : survey === 'WAITING'
        ? 'Menunggu Survey'
        : 'Prospek';

    return {
      status: 'Pending',
      flow_stage: {
        code: 'SURVEY_IN_PROGRESS',
        name: `Sedang Proses Survey (${subLabel})`,
        description: `Leads ada di tahap prospect survei lapangan (${subLabel})`,
        badge_variant: 'survey',
      },
      jenis_aktivitas: `Survei Lapangan (${subLabel})`,
      interpretation: `Leads ada di tahap prospect survey ${subLabel.toLowerCase()}`,
    };
  }

  // 6. Cek SLIK / CBI Ditolak (Tidak memenuhi kriteria)
  if (
    cc === 'REJECT' ||
    cc === 'NOT PASSED' ||
    (lead === 'REJECT' && !survey) ||
    (lead === 'REJECTED' && !survey)
  ) {
    return {
      status: 'Cancelled',
      flow_stage: {
        code: 'SLIK_REJECTED',
        name: 'Cek SLIK Ditolak',
        description: 'Selesai cek SLIK/CBI, tidak sesuai kriteria kredit',
        badge_variant: 'slik_reject',
      },
      jenis_aktivitas: 'Cek SLIK Tidak Lolos',
      interpretation: 'Selesai cek slik/cbi, tidak sesuai kriteria, tidak bisa lanjut',
    };
  }

  // 7. Lolos Cek SLIK (Selesai cek slik/cbi, sesuai kriteria, siap assign surveyor)
  if (
    (cc === 'DONE' || cc === 'PASSED') &&
    !survey
  ) {
    return {
      status: 'Pending',
      flow_stage: {
        code: 'SLIK_PASSED',
        name: 'Lolos Cek SLIK',
        description: 'Selesai cek SLIK/CBI, kriteria terpenuhi, siap lanjut tahap survei',
        badge_variant: 'slik_pass',
      },
      jenis_aktivitas: 'Lolos SLIK (Siap Survey)',
      interpretation: 'Selesai cek slik/cbi, sesuai kriteria, dan bisa lanjut',
    };
  }

  // 8. Selesai Input Data Leads (Mandatory data lengkap, siap cek SLIK)
  if (lead === 'RESPONSE' && !cc && !survey) {
    return {
      status: 'Pending',
      flow_stage: {
        code: 'LEADS_MANDATORY',
        name: 'Selesai Input Mandatory',
        description: 'Sudah selesai input data leads (mandatory data) di sales',
        badge_variant: 'draft',
      },
      jenis_aktivitas: 'Selesai Input Mandatory',
      interpretation: 'Sudah selesai input data leads (mandatory data)',
    };
  }

  // 9. Input Data Leads (Masih di sales)
  if (lead === 'WAITING' && !cc && !survey) {
    return {
      status: 'Pending',
      flow_stage: {
        code: 'LEADS_INPUT',
        name: 'Input Data Leads',
        description: 'Masih di sales, input data leads oleh AO sales',
        badge_variant: 'draft',
      },
      jenis_aktivitas: 'Input Data Leads (Draft)',
      interpretation: 'Masih input data leads oleh AO sales',
    };
  }

  // 10. Dibatalkan awal oleh Sales / Debitur
  if (lead === 'CANCEL' || lead === 'CNCL' || flg.interested === false) {
    return {
      status: 'Cancelled',
      flow_stage: {
        code: 'SURVEY_CANCELED',
        name: 'Dibatalkan Sales/Debitur',
        description: 'Dibatalkan di tahap awal oleh AO sales atau debitur tidak berminat',
        badge_variant: 'cancelled',
      },
      jenis_aktivitas: 'Dibatalkan Awal',
      interpretation: 'Dibatalkan di sales oleh AO / calon debitur tidak berminat',
    };
  }

  // Fallback
  return {
    status: 'Pending',
    flow_stage: {
      code: 'LEADS_INPUT',
      name: `Proses (${lead || 'Draft'})`,
      description: 'Dalam proses alur kerja sistem',
      badge_variant: 'draft',
    },
    jenis_aktivitas: 'Aktivitas Sales',
    interpretation: 'Dalam proses pengolahan data sistem',
  };
}

function resolveApplicationType(l: any): ApplicationTypeInfo {
  const source = l.source ?? 'DEFAULT';
  const counter = typeof l.parent_lead_counter === 'number' ? l.parent_lead_counter : 0;
  const isRepeat = source === 'REPEAT_ORDER' || counter > 0;

  return {
    type: isRepeat ? 'REPEAT_ORDER' : 'NEW',
    label: isRepeat ? `Repeat Order (RO #${counter || 1})` : 'Pengajuan Baru (New)',
    source: isRepeat ? 'REPEAT_ORDER' : source,
    counter,
  };
}

function getKategori(l: any): 'Produk UMI' | 'Produk Sertifikat' {
  // Sesuai referensi topop_kospinus.client_product & field pengajuan.product.id di leads:
  // Id Produk UMI = "005"
  // Id Produk selain 005 = Produk Sertifikat
  const prodId = l.pengajuan?.product?.id ? String(l.pengajuan.product.id).trim() : '';
  if (prodId === '005') {
    return 'Produk UMI';
  }
  if (prodId && prodId !== '005') {
    return 'Produk Sertifikat';
  }

  // Fallback jika id produk belum diisi di lead
  const prodName: string = l.pengajuan?.product?.product_name ?? '';
  if (prodName.includes('UMI')) return 'Produk UMI';
  return 'Produk Sertifikat';
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const dateStr = searchParams.get('date') ?? '';          // YYYY-MM-DD (WIB)
    const aoId = searchParams.get('ao') ?? '';
    const kategoriFilter = searchParams.get('kategori') ?? 'all';
    const statusFilter = searchParams.get('status') ?? 'all';
    const stageFilter = searchParams.get('stage') ?? 'all';  // FlowStageCode
    const appTypeFilter = searchParams.get('app_type') ?? 'all'; // 'NEW' | 'REPEAT_ORDER'
    const q = (searchParams.get('q') ?? '').toLowerCase().trim();
    const pageStr = searchParams.get('page') ?? '1';
    const limitStr = searchParams.get('limit') ?? '10';
    const page = Math.max(1, parseInt(pageStr, 10));
    const limit = Math.max(5, parseInt(limitStr, 10));

    const { leads, groups, aoNames } = await loadData(dateStr, aoId);

    const activities: ActivityItem[] = [];

    // ── Process leads ──────────────────────────────────────────────────────
    for (const l of leads) {
      const waktu: string = extractDate(l.create_dtm);
      if (!waktu) continue;

      if (dateStr && toLocalDate(waktu) !== dateStr) continue;

      const ao_id: string = l.create_user ?? '';
      if (aoId && ao_id !== aoId) continue;

      const kategori = getKategori(l);
      const { status, flow_stage, jenis_aktivitas, interpretation } = resolveLeadFlow(l);
      const application_type = resolveApplicationType(l);

      // Kategori filter (2 produk: Produk UMI [005] & Produk Sertifikat [non-005])
      if (kategoriFilter !== 'all') {
        if (
          (kategoriFilter === 'produk_umi' || kategoriFilter === 'new_loan_umi' || kategoriFilter === 'umi') &&
          kategori !== 'Produk UMI'
        ) {
          continue;
        }
        if (
          (kategoriFilter === 'produk_sertifikat' || kategoriFilter === 'new_loan_sertifikat' || kategoriFilter === 'sertifikat') &&
          kategori !== 'Produk Sertifikat'
        ) {
          continue;
        }
      }

      // Status filter (Completed / Pending / Cancelled)
      if (statusFilter !== 'all' && status.toLowerCase() !== statusFilter.toLowerCase()) continue;

      // Flow stage filter
      if (stageFilter !== 'all' && flow_stage.code !== stageFilter) continue;

      // Application type filter
      if (appTypeFilter !== 'all' && application_type.type !== appTypeFilter) continue;

      const debitur: string = l.pemohon?.name ?? '-';
      const ao_name: string = aoNames.get(ao_id) ?? ao_id;
      const nominal = extractNumber(l.pengajuan?.submission?.loan);
      const hasil_aktivitas: string = l.keterangan?.sales ?? '';
      const follow_up: string | null = extractDate(l.survey_dtm) || null;

      const raw_status: RawMongoStatus = {
        lead: l.status?.lead ?? null,
        credit_checking: l.status?.credit_checking ?? null,
        survey: l.status?.survey ?? null,
        pengajuan: l.status?.pengajuan ?? null,
      };

      if (q) {
        const rawJsonStr = JSON.stringify(raw_status).toLowerCase();
        const hay = `${l._id} ${debitur} ${ao_id} ${ao_name} ${hasil_aktivitas} ${flow_stage.name} ${application_type.label} ${rawJsonStr}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      activities.push({
        id: String(l._id),
        ao_id,
        ao_name,
        branch: l.client?.branch_name ?? '',
        waktu,
        debitur,
        kategori,
        jenis_aktivitas,
        referensi: String(l._id),
        hasil_aktivitas,
        status,
        flow_stage,
        application_type,
        raw_status,
        interpretation,
        follow_up,
        nominal,
        source: 'lead',
      });
    }

    // ── Process groups ─────────────────────────────────────────────────────
    for (const g of groups) {
      const waktu: string = extractDate(g.create_dtm);
      if (!waktu) continue;

      if (dateStr && toLocalDate(waktu) !== dateStr) continue;

      const ao_id: string = g.sales?.id ?? '';
      if (aoId && ao_id !== aoId) continue;

      const kategori = 'Produk UMI';
      const isCompleted = !!g.flg?.validate;
      const status: ActivityStatus = isCompleted ? 'Completed' : 'Pending';

      const flow_stage: FlowStageInfo = isCompleted
        ? {
            code: 'PENGAJUAN_COMPLETED',
            name: 'Validasi Kelompok Selesai',
            description: 'Kelompok pembiayaan telah divalidasi dan disetujui',
            badge_variant: 'completed',
          }
        : {
            code: 'KOMITE_REVIEW',
            name: 'Menunggu Validasi Kelompok',
            description: 'Kelompok dalam tahap proses verifikasi dan validasi',
            badge_variant: 'komite',
          };

      const application_type: ApplicationTypeInfo = {
        type: 'NEW',
        label: 'Kelompok Mikro (UMI)',
        source: 'GROUP',
        counter: 0,
      };

      const jenis_aktivitas = 'Customer Visit & Pembentukan Kelompok';
      const interpretation = isCompleted ? 'Kelompok UMI selesai divalidasi' : 'Kelompok UMI menunggu validasi';

      if (kategoriFilter !== 'all') {
        if (
          kategoriFilter === 'produk_sertifikat' ||
          kategoriFilter === 'new_loan_sertifikat' ||
          kategoriFilter === 'sertifikat'
        ) {
          continue; // Kelompok adalah produk UMI (005), bukan sertifikat
        }
      }

      if (statusFilter !== 'all' && status.toLowerCase() !== statusFilter.toLowerCase()) continue;
      if (stageFilter !== 'all' && flow_stage.code !== stageFilter) continue;
      if (appTypeFilter !== 'all' && application_type.type !== appTypeFilter) continue;

      const ao_name: string = (g.sales?.name ?? '').trim() || ao_id;
      const debitur: string = g.group_name ?? '-';

      const raw_status: RawMongoStatus = {
        lead: 'GROUP',
        credit_checking: 'PASSED',
        survey: 'DONE',
        pengajuan: isCompleted ? 'PROSES' : null,
      };

      if (q) {
        const hay = `${g._id} ${debitur} ${ao_id} ${ao_name} ${flow_stage.name}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }

      activities.push({
        id: String(g._id),
        ao_id,
        ao_name,
        branch: g.sales?.branch_name ?? '',
        waktu,
        debitur,
        kategori,
        jenis_aktivitas,
        referensi: String(g._id),
        hasil_aktivitas: g.notes ?? '',
        status,
        flow_stage,
        application_type,
        raw_status,
        interpretation,
        follow_up: null,
        nominal: 0,
        source: 'group',
      });
    }

    // Sort newest first
    activities.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

    // ── Summary ────────────────────────────────────────────────────────────
    const completed = activities.filter((a) => a.status === 'Completed').length;
    const pending = activities.filter((a) => a.status === 'Pending').length;
    const cancelled = activities.filter((a) => a.status === 'Cancelled').length;
    const komite_review = activities.filter((a) => a.flow_stage.code === 'KOMITE_REVIEW').length;
    const sedang_survey = activities.filter((a) => a.flow_stage.code === 'SURVEY_IN_PROGRESS').length;
    const new_loan_count = activities.filter((a) => a.application_type.type === 'NEW').length;
    const repeat_order_count = activities.filter((a) => a.application_type.type === 'REPEAT_ORDER').length;
    const ao_aktif = new Set(activities.map((a) => a.ao_id)).size;
    const umiCount = activities.filter((a) => a.kategori === 'Produk UMI').length;
    const sertifikatCount = activities.filter((a) => a.kategori === 'Produk Sertifikat').length;
    const by_kategori: ChartItem[] = [
      { label: 'Produk UMI', value: umiCount },
      { label: 'Produk Sertifikat', value: sertifikatCount },
    ];

    const by_status: ChartItem[] = [
      { label: 'Completed', value: completed },
      { label: 'Pending', value: pending },
      { label: 'Cancelled', value: cancelled },
    ];

    const stageMap: Record<FlowStageCode, { label: string; count: number; badge_variant: string }> = {
      PENGAJUAN_COMPLETED: { label: 'Pengajuan Completed', count: 0, badge_variant: 'completed' },
      KOMITE_REVIEW: { label: 'Review Komite', count: 0, badge_variant: 'komite' },
      SURVEY_IN_PROGRESS: { label: 'Sedang Proses Survey', count: 0, badge_variant: 'survey' },
      SURVEY_CANCELED: { label: 'Survey Dibatalkan', count: 0, badge_variant: 'cancelled' },
      KOMITE_REJECTED: { label: 'Ditolak Komite', count: 0, badge_variant: 'cancelled' },
      SLIK_PASSED: { label: 'Lolos Cek SLIK', count: 0, badge_variant: 'slik_pass' },
      SLIK_REJECTED: { label: 'Cek SLIK Ditolak', count: 0, badge_variant: 'slik_reject' },
      LEADS_MANDATORY: { label: 'Selesai Mandatory', count: 0, badge_variant: 'draft' },
      LEADS_INPUT: { label: 'Input Data Leads', count: 0, badge_variant: 'draft' },
    };

    for (const a of activities) {
      if (stageMap[a.flow_stage.code]) {
        stageMap[a.flow_stage.code].count++;
      }
    }

    const by_stage: StageCountItem[] = Object.entries(stageMap).map(([code, item]) => ({
      code: code as FlowStageCode,
      label: item.label,
      count: item.count,
      badge_variant: item.badge_variant,
    }));

    const by_app_type: ChartItem[] = [
      { label: 'Pengajuan Baru (New)', value: new_loan_count },
      { label: 'Repeat Order (RO)', value: repeat_order_count },
    ];

    const aoCountMap: Record<string, { id: string; name: string; count: number }> = {};
    for (const a of activities) {
      if (!aoCountMap[a.ao_id]) aoCountMap[a.ao_id] = { id: a.ao_id, name: a.ao_name, count: 0 };
      aoCountMap[a.ao_id].count++;
    }
    const by_ao: BarItem[] = Object.values(aoCountMap)
      .map(({ id, name, count }) => ({ ao_id: id, ao_name: name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const summary: DailySummary = {
      total: activities.length,
      completed,
      pending,
      cancelled,
      komite_review,
      sedang_survey,
      new_loan_count,
      repeat_order_count,
      ao_aktif,
      prev_total: 0,
      by_kategori,
      by_status,
      by_stage,
      by_app_type,
      by_ao,
    };

    // ── Paginate ───────────────────────────────────────────────────────────
    const total_records = activities.length;
    const paginated = activities.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        activities: paginated,
        pagination: {
          page,
          limit,
          total: total_records,
          total_pages: Math.ceil(total_records / limit),
        },
      },
    });
  } catch (error) {
    console.error('[mongo-daily]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat laporan harian AO' },
      { status: 500 },
    );
  }
}
