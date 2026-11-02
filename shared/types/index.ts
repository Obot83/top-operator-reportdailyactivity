// top-operator/shared/types/index.ts

// ─────────────────────────────────────────────
// ENUMS (mirror dari Prisma schema)
// ─────────────────────────────────────────────

export type Kolektibilitas = 'LANCAR' | 'DPK' | 'KURANG_LANCAR' | 'DIRAGUKAN' | 'MACET';
export type VisitStatus    = 'MET_DEBTOR' | 'VACANT' | 'REFUSED' | 'PARTIAL_MET' | 'PHONE_ONLY' | 'OTHER';
export type PTPStatus      = 'PENDING' | 'HONORED' | 'BROKEN';
export type AOActivityType = 'PROSPEK' | 'SURVEY_AGUNAN' | 'VERIFIKASI' | 'BOOKING' | 'REALISASI';
export type SPLevel        = 'SP1' | 'SP2' | 'SP3';
export type UserRole       = 'ADMIN' | 'BRANCH_MANAGER' | 'AO' | 'COLLECTOR';
export type StatusBayar    = 'BELUM_DIKUNJUNGI' | 'SUDAH_DIKUNJUNGI' | 'JANJI_BAYAR' | 'SUDAH_BAYAR';

// ─────────────────────────────────────────────
// HELPER — parse/serialize photo URLs (MySQL JSON TEXT)
// ─────────────────────────────────────────────

/** Ambil array URL dari kolom photo_urls_json */
export function parsePhotoUrls(json: string | null | undefined): string[] {
  if (!json) return [];
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}

/** Simpan array URL ke string JSON untuk kolom photo_urls_json */
export function serializePhotoUrls(urls: string[]): string {
  return JSON.stringify(urls);
}

// ─────────────────────────────────────────────
// DEBITUR CARD CONTROLLER
// ─────────────────────────────────────────────

export interface RiskScore {
  score: number;           // 0–100
  label: 'RENDAH' | 'SEDANG' | 'TINGGI' | 'KRITIS' | 'SANGAT_TINGGI';
  factors: string[];
}

export interface VisitLogEntry {
  id: string;
  visitTimestamp: string;
  officerName: string;
  officerRole?: string;
  latitude: number | null;
  longitude: number | null;
  visitStatus: VisitStatus;
  visitStatusLabel?: string;
  reasonCategory?: string | null;
  reasonDetail?: string | null;
  fieldNotes?: string | null;
  photoUrls: string[];
  hasPTP?: boolean;
  ptpData?: {
    nominalKomitmen: number;
    targetDate: string;
    status: PTPStatus;
  } | null;
}

export interface PTPTrackingData {
  id: string;
  accountNumber?: string;
  targetDate: string;
  nominalKomitmen: number;
  status: PTPStatus;
  honoredDate?: string | null;
  honoredNominal?: number | null;
  brokenAt?: string | null;
  brokenReason?: string | null;
  catatan?: string | null;
  createdAt: string;
}

export interface DebiturControllerData {
  debitur: {
    id?: string;
    cif: string;
    name: string;
    nik: string;
    phone: string | null;
    gender?: string;
    domisiliAddress: string;
    domisiliKecamatan?: string;
    domisiliKota?: string;
    usahaAddress?: string | null;
    defaultLatitude?: number | null;
    defaultLongitude?: number | null;
  };
  loanAccount: {
    id?: string;
    accountNumber: string;
    debiturCif?: string;
    debiturName?: string;
    productName: string;
    plafon: number;
    bakiDebetPokok: number;
    saldoTitipan: number;
    tenorMinggu: number;
    angsuranPokok?: number;
    angsuranBunga?: number;
    totalAngsuran?: number;
    dpd: number;
    kolektibilitas: Kolektibilitas;
    autodebitEnabled: boolean;
    isWriteOff: boolean;
    tanggalAkad?: string;
  };
  riskScore: RiskScore;
  activeSpLevel: SPLevel | null;
  latestPTP: PTPTrackingData | null;
  visitTimeline: VisitLogEntry[];
  ptpHistory: PTPTrackingData[];
}

// ─────────────────────────────────────────────
// AO DAILY REPORT
// ─────────────────────────────────────────────

export interface AOActivityEntry {
  id: string;
  aoId?: string;
  aoName?: string;
  aoNama?: string;
  activityDate?: string;
  tanggal?: string;
  activityType: AOActivityType | string;
  activityTypeLabel?: string;
  prospekName?: string;
  prospekNominalPengajuan?: number;
  nominal?: number | null;
  nominalRealisasi?: number | null;
  nominalTitipanMuka?: number | null;
  titipanMuka?: number | null;
  accountNumber?: string;
  status?: string;
  catatan?: string | null;
  keterangan?: string | null;
  debiturNama?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoUrls?: any;
}

export interface AODailyReport {
  reportDate?: string;
  tanggal?: string;
  branchCode: string;
  branchName?: string;
  summary: {
    totalProspek: number;
    totalSurvey?: number;
    totalSurvei?: number;
    totalVerifikasi: number;
    totalBooking: number;
    totalRealisasi: number;
    conversionRate: number;      // persen
    totalNominalRealisasi: number;
    totalTitipanMuka: number;
  };
  activities: AOActivityEntry[];
}

// ─────────────────────────────────────────────
// COLLECTION DAILY REPORT
// ─────────────────────────────────────────────

export interface CollectionTotals {
  totalDebitur?: number;
  sudahBayar?: number;
  belumDikunjungi?: number;
  janjieBayar?: number;
  tagihanPokok?: number;
  tagihanBunga?: number;
  tagihanDenda?: number;
  targetPokok?: number;
  targetBunga?: number;
  targetDenda?: number;
  targetTitipan?: number;
  targetWO?: number;
  totalTarget?: number;
  realisasiPokok: number;
  realisasiBunga: number;
  realisasiDenda: number;
  realisasiTitipan: number;
  penerimaanWO: number;
  totalRealisasi: number;
  totalPokok?: number;
  totalBunga?: number;
  totalDenda?: number;
  totalTitipan?: number;
  totalWO?: number;
  cashSettlementStatus?: 'PENDING' | 'SETTLED' | 'DIFFERENCE' | string;
}

export interface CollectorSummary {
  collectorId: string;
  collectorName?: string;
  collectorNama?: string;
  tasks?: any[];
  totals: CollectionTotals;
  totalTagihan?: number;
  totalPokok?: number;
  totalBunga?: number;
  totalDenda?: number;
  totalTitipan?: number;
  totalWO?: number;
  totalRealisasi?: number;
  jumlahDebitur?: number;
  jumlahSudahBayar?: number;
}

export interface CollectionDailyReport {
  reportDate?: string;
  periodeTagih: string;
  branchCode: string;
  collectors?: CollectorSummary[];
  collectorSummaries?: CollectorSummary[];
  grandTotal: CollectionTotals;
}

// ─────────────────────────────────────────────
// CONTROLLER ACTION
// ─────────────────────────────────────────────

export type ControllerActionPayload =
  | {
      action: 'GENERATE_SP';
      accountNumber: string;
      spLevel: SPLevel | string;
      tanggalRespons: string;
      catatan?: string;
      level?: SPLevel;
      branchId?: string;
      keterangan?: string;
    }
  | {
      action: 'TOGGLE_AUTODEBIT';
      accountNumber: string;
      enable?: boolean;
    }
  | {
      action: 'ALIHKAN_REMEDIAL';
      accountNumber: string;
      catatan?: string;
      keterangan?: string;
    };

// ─────────────────────────────────────────────
// MOBILE VISIT FORM
// ─────────────────────────────────────────────

export interface VisitFormData {
  loanAccountId: string;
  visitStatus: VisitStatus;
  latitude: number;
  longitude: number;
  alasanKategori?: string;
  alasanDetail?: string;
  catatanLapangan?: string;
  hasPTP: boolean;
  ptpTargetDate?: string;   // ISO date string
  ptpNominal?: number;
  photos: Array<{ uri: string; type: string; name: string }>;
}

// ─────────────────────────────────────────────
// DTH (Daftar Tagihan Harian) — Mobile
// ─────────────────────────────────────────────

export interface CollectionTaskEntry {
  id: string;
  loanAccountId: string;
  accountNumber: string;
  debiturNama: string;
  nomorHP: string | null;
  alamatDomisili: string;
  defaultLatitude: number | null;
  defaultLongitude: number | null;
  dpd: number;
  kolektibilitas: Kolektibilitas;
  tagihanPokok: number;
  tagihanBunga: number;
  tagihanDenda: number;
  tagihanTitipan: number;
  totalTagihan: number;
  statusBayar: StatusBayar;
  ptpAktif: {
    targetTanggal: string;
    nominalKomitmen: number;
  } | null;
}

// ─────────────────────────────────────────────
// GENERIC API RESPONSE
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
