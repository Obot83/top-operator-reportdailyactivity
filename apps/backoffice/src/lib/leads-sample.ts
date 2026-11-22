export type LeadDetail = {
  tglLahir: string;
  jenisKelamin: string;
  soa: string;
  statusData: string;
  tglPengajuan: string;
  tenor: string;
  namaSales: string;
  keterangan: string;
};

export type AlamatKtp = {
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  rtRw: string;
  kodepos: string;
  alamatLengkap: string;
};

export type DataDiri = {
  jenisLeads: string;
  noKtp: string;
  nama: string;
  fotoKtp?: string;
  noHp: string;
  jenisKelamin: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  statusPernikahan: string;
  pekerjaan: string;
  namaIbuKandung: string;
  wargaNegara: string;
  tujuanPinjaman: string;
  alamatKtp: AlamatKtp;
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
  formatted_long?: string;
  badge_label?: string;
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

export type Lead = {
  id: string;
  nik: string;
  nama: string;
  noHp: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  tanggalLeads: string;
  nominalPengajuan: number;
  actionLead: 'Proses Survey' | 'Credit Checking';
  statusCredit: 'PASSED' | 'DONE';
  detail: LeadDetail;
  diri: DataDiri;
  pasangan: { nama: string; nik: string; pekerjaan: string; noHp: string } | null;
  penjamin: { nama: string; hubungan: string; nik: string; noHp: string; alamat: string } | null;
  agunan: { jenis: string; deskripsi: string; nilai: string; atasNama: string } | null;
  creditChecking: { hasilSlik: string; kolektibilitas: string; tanggal: string; catatan: string } | null;
  // Fields for updated Daftar Leads table & Detail Status & Flow Pengajuan Real:
  lastUpdate: string;
  aoName: string;
  aoId: string;
  branch: string;
  tipe: 'NEW' | 'REPEAT_ORDER';
  applicationType: ApplicationTypeInfo;
  kategori: 'Produk UMI' | 'Produk Sertifikat';
  flowStage: FlowStageInfo;
  status: 'Completed' | 'Pending' | 'Cancelled';
  sla: SlaInfo;
  rawStatus: RawMongoStatus;
  officers: OfficerItem[];
  activitiesTimeline: ActivityTimelineItem[];
  salesNotes: SalesNoteItem[];
};

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

/** D + tahun + bulan + tanggal pengajuan + nomor urut 5 digit. Contoh: D2026102900002 */
export function formatLeadId(tglPengajuan: string, urut: number): string {
  const [day, month, year] = tglPengajuan.split(' ');
  return `D${year}${MONTHS[month] || '10'}${day.padStart(2, '0')}${String(urut).padStart(5, '0')}`;
}

type ListedLeadInput = {
  id: string;
  nama: string;
  nik: string;
  noHp: string;
  nominalPengajuan: number;
  actionLead: Lead['actionLead'];
  statusCredit: Lead['statusCredit'];
  tglPengajuan: string;
  lastUpdate?: string;
  aoName?: string;
  aoId?: string;
  branch?: string;
  tipe?: 'NEW' | 'REPEAT_ORDER';
  applicationType?: ApplicationTypeInfo;
  kategori?: 'Produk UMI' | 'Produk Sertifikat';
  flowStage?: FlowStageInfo;
  status?: 'Completed' | 'Pending' | 'Cancelled';
  sla?: SlaInfo;
  rawStatus?: RawMongoStatus;
  officers?: OfficerItem[];
  activitiesTimeline?: ActivityTimelineItem[];
  salesNotes?: SalesNoteItem[];
};

function listedLead(input: ListedLeadInput): Lead {
  const aoName = input.aoName || 'Budi Santoso';
  const aoId = input.aoId || 'budi_ao';
  const branch = input.branch || 'Cabang Depok 1';
  const tipe = input.tipe || 'NEW';
  const applicationType: ApplicationTypeInfo = input.applicationType || {
    type: tipe,
    label: tipe === 'REPEAT_ORDER' ? 'Repeat Order (RO #1)' : 'Pengajuan Baru (New)',
    source: 'DEFAULT',
    counter: tipe === 'REPEAT_ORDER' ? 1 : 0,
  };
  const kategori = input.kategori || 'Produk UMI';
  const flowStage: FlowStageInfo = input.flowStage || (input.actionLead === 'Proses Survey'
    ? {
        code: 'SURVEY_IN_PROGRESS',
        name: 'Survei Lapangan',
        description: 'Sedang dijadwalkan dan proses survei lapangan',
        badge_variant: 'survey',
      }
    : {
        code: 'SLIK_PASSED',
        name: 'Lolos SLIK / CBI',
        description: 'Hasil credit checking passed / lolos kriteria',
        badge_variant: 'slik_pass',
      });
  const status = input.status || 'Pending';
  const sla: SlaInfo = input.sla || {
    duration_minutes: 245,
    formatted: '4j 5m',
    formatted_long: '4 Jam 5 Menit',
    badge_label: 'Berjalan (4j 5m)',
    status: 'RUNNING',
    start_time: `${input.tglPengajuan} 08:30`,
    end_time: null,
    is_complete: false,
    description: 'SLA Berjalan: Masih dalam proses alur pengajuan',
  };
  const rawStatus: RawMongoStatus = input.rawStatus || {
    lead: 'RESPONSE',
    credit_checking: input.statusCredit === 'PASSED' ? 'PASSED' : 'DONE',
    survey: input.actionLead === 'Proses Survey' ? 'SCHEDULED' : null,
    pengajuan: 'PROSES',
  };
  const officers: OfficerItem[] = input.officers || [
    {
      nama_ao: aoName,
      username: aoId,
      cabang: branch,
      keterangan: 'Input Data Pemohon',
    },
    {
      nama_ao: aoName,
      username: aoId,
      cabang: branch,
      keterangan: 'Pengecekan SLIK',
    },
    {
      nama_ao: 'Heru Prasetyo',
      username: 'heru_sur',
      cabang: branch,
      keterangan: 'Survey',
    },
  ];
  const activitiesTimeline: ActivityTimelineItem[] = input.activitiesTimeline || [
    {
      jenis_aktivitas: 'Input Leads',
      waktu_pencatatan: `${input.tglPengajuan} 08:30`,
      waktu_selesai: `${input.tglPengajuan} 08:35`,
      sla: '< 5m',
    },
    {
      jenis_aktivitas: 'Cek SLIK',
      waktu_pencatatan: `${input.tglPengajuan} 08:35`,
      waktu_selesai: `${input.tglPengajuan} 09:40`,
      sla: '1j 5m',
    },
    {
      jenis_aktivitas: 'Survey',
      waktu_pencatatan: `${input.tglPengajuan} 09:40`,
      waktu_selesai: null,
      sla: input.actionLead === 'Proses Survey' ? 'Sedang Berjalan' : '-',
    },
  ];
  const salesNotes: SalesNoteItem[] = input.salesNotes || [
    {
      nama_user: `${aoName} (${aoId})`,
      catatan: `Berkas pengajuan ${input.nama} telah diverifikasi. Hasil pengecekan SLIK: ${input.statusCredit}.`,
      waktu: `${input.tglPengajuan} 10:00`,
    },
  ];

  return {
    id: input.id,
    nik: input.nik,
    nama: input.nama,
    noHp: input.noHp,
    alamat: '-',
    kelurahan: '-',
    kecamatan: '-',
    tanggalLeads: input.tglPengajuan,
    nominalPengajuan: input.nominalPengajuan,
    actionLead: input.actionLead,
    statusCredit: input.statusCredit,
    lastUpdate: input.lastUpdate || `${input.tglPengajuan} 14:32`,
    aoName,
    aoId,
    branch,
    tipe,
    applicationType,
    kategori,
    flowStage,
    status,
    sla,
    rawStatus,
    officers,
    activitiesTimeline,
    salesNotes,
    detail: {
      tglLahir: '-',
      jenisKelamin: '-',
      soa: '-',
      statusData: '-',
      tglPengajuan: input.tglPengajuan,
      tenor: '-',
      namaSales: aoName,
      keterangan: '-',
    },
    diri: {
      jenisLeads: 'Perseorang',
      noKtp: input.nik,
      nama: input.nama,
      noHp: input.noHp,
      jenisKelamin: '-',
      tempatLahir: '-',
      tanggalLahir: '-',
      agama: '-',
      statusPernikahan: '-',
      pekerjaan: '-',
      namaIbuKandung: '-',
      wargaNegara: 'Warga Negara Indonesia',
      tujuanPinjaman: '-',
      alamatKtp: {
        provinsi: '-',
        kota: '-',
        kecamatan: '-',
        kelurahan: '-',
        rtRw: '-',
        kodepos: '-',
        alamatLengkap: '-',
      },
    },
    pasangan: null,
    penjamin: null,
    agunan: null,
    creditChecking: null,
  };
}

const leadRows: Lead[] = [
  listedLead({
    id: 'D2026102700126',
    nama: 'WAHYUNI',
    nik: '3674064707840006',
    noHp: '08889177729',
    nominalPengajuan: 1_888_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '27 Oct 2026',
    lastUpdate: '27 Oct 2026 14:32',
    aoName: 'Budi Santoso',
    aoId: 'budi_ao',
    branch: 'Cabang Depok 1',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SURVEY_IN_PROGRESS',
      name: 'Survei Lapangan',
      description: 'Sedang dijadwalkan dan proses survei lapangan',
      badge_variant: 'survey',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 245,
      formatted: '4j 5m',
      formatted_long: '4 Jam 5 Menit',
      badge_label: 'Berjalan (4j 5m)',
      status: 'RUNNING',
      start_time: '2026-10-27T10:27:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Masih dalam proses survei lapangan (berjalan 4 Jam 5 Menit)',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'PASSED',
      survey: 'SCHEDULED',
      pengajuan: 'PROSES',
    },
    officers: [
      {
        nama_ao: 'Budi Santoso',
        username: 'budi_ao',
        cabang: 'Cabang Depok 1',
        keterangan: 'Input Data Pemohon',
      },
      {
        nama_ao: 'Budi Santoso',
        username: 'budi_ao',
        cabang: 'Cabang Depok 1',
        keterangan: 'Pengecekan SLIK',
      },
      {
        nama_ao: 'Heru Prasetyo',
        username: 'heru_sur',
        cabang: 'Cabang Depok 1',
        keterangan: 'Survey',
      },
    ],
    activitiesTimeline: [
      {
        jenis_aktivitas: 'Input Leads',
        waktu_pencatatan: '2026-10-27T10:27:00.000Z',
        waktu_selesai: '2026-10-27T10:29:00.000Z',
        sla: '< 2m',
      },
      {
        jenis_aktivitas: 'Cek SLIK',
        waktu_pencatatan: '2026-10-27T10:29:00.000Z',
        waktu_selesai: '2026-10-27T11:15:00.000Z',
        sla: '46m',
      },
      {
        jenis_aktivitas: 'Survey',
        waktu_pencatatan: '2026-10-27T11:15:00.000Z',
        waktu_selesai: null,
        sla: 'Sedang Berjalan',
      },
    ],
    salesNotes: [
      {
        nama_user: 'Budi Santoso (budi_ao)',
        catatan: 'Data pemohon lengkap, usaha warung sembako aktif 3 tahun. Hasil SLIK bersih tanpa tunggakan.',
        waktu: '2026-10-27T11:20:00.000Z',
      },
      {
        nama_user: 'Heru Prasetyo (heru_sur)',
        catatan: 'Jadwal survei disepakati hari Rabu pukul 14:00 di lokasi warung.',
        waktu: '2026-10-27T13:10:00.000Z',
      },
    ],
  }),
  listedLead({
    id: 'D2026102900042',
    nama: 'SITI SUHERNI',
    nik: '3201166510930002',
    noHp: '089531904853',
    nominalPengajuan: 50_000_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
    lastUpdate: '29 Oct 2026 11:15',
    aoName: 'Linda Sefa',
    aoId: 'linda_ao',
    branch: 'Cabang Bekasi 2',
    tipe: 'NEW',
    kategori: 'Produk Sertifikat',
    flowStage: {
      code: 'SLIK_PASSED',
      name: 'Lolos SLIK / CBI',
      description: 'Hasil credit checking passed / lolos kriteria',
      badge_variant: 'slik_pass',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 85,
      formatted: '1j 25m',
      formatted_long: '1 Jam 25 Menit',
      badge_label: 'Berjalan (1j 25m)',
      status: 'RUNNING',
      start_time: '2026-10-29T09:50:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Menunggu jadwal survei lapangan (berjalan 1 Jam 25 Menit)',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'DONE',
      survey: 'WAITING',
      pengajuan: null,
    },
    officers: [
      {
        nama_ao: 'Linda Sefa',
        username: 'linda_ao',
        cabang: 'Cabang Bekasi 2',
        keterangan: 'Input Data Pemohon',
      },
      {
        nama_ao: 'Linda Sefa',
        username: 'linda_ao',
        cabang: 'Cabang Bekasi 2',
        keterangan: 'Pengecekan SLIK',
      },
      {
        nama_ao: 'Rian Hidayat',
        username: 'rian_sur',
        cabang: 'Cabang Bekasi 2',
        keterangan: 'Survey',
      },
    ],
    activitiesTimeline: [
      {
        jenis_aktivitas: 'Input Leads',
        waktu_pencatatan: '2026-10-29T09:50:00.000Z',
        waktu_selesai: '2026-10-29T09:55:00.000Z',
        sla: '< 5m',
      },
      {
        jenis_aktivitas: 'Cek SLIK',
        waktu_pencatatan: '2026-10-29T09:55:00.000Z',
        waktu_selesai: '2026-10-29T11:15:00.000Z',
        sla: '1j 20m',
      },
      {
        jenis_aktivitas: 'Survey',
        waktu_pencatatan: '2026-10-29T11:15:00.000Z',
        waktu_selesai: null,
        sla: 'Sedang Berjalan',
      },
    ],
    salesNotes: [
      {
        nama_user: 'Linda Sefa (linda_ao)',
        catatan: 'Dokumen jaminan SHM sudah diverifikasi awal. SLIK lolos kriteria Lancar tanpa tunggakan.',
        waktu: '2026-10-29T11:15:00.000Z',
      },
    ],
  }),
  listedLead({
    id: 'D2026102900041',
    nama: 'JUNAAH',
    nik: '3604044902750341',
    noHp: '0878954699465',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
    lastUpdate: '29 Oct 2026 15:40',
    aoName: 'Andi Pratama',
    aoId: 'andi_ao',
    branch: 'Cabang Bogor',
    tipe: 'REPEAT_ORDER',
    applicationType: {
      type: 'REPEAT_ORDER',
      label: 'Repeat Order (RO #1)',
      source: 'AUTO_DETECT',
      counter: 1,
    },
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SLIK_PASSED',
      name: 'Lolos SLIK / CBI',
      description: 'Hasil credit checking passed',
      badge_variant: 'slik_pass',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 190,
      formatted: '3j 10m',
      formatted_long: '3 Jam 10 Menit',
      badge_label: 'Berjalan (3j 10m)',
      status: 'RUNNING',
      start_time: '2026-10-29T12:30:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Verifikasi data pengajuan lanjutan (berjalan 3 Jam 10 Menit)',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'DONE',
      survey: 'WAITING',
      pengajuan: null,
    },
  }),
  listedLead({
    id: 'D2026100600018',
    nama: 'YUYUN YUNANI',
    nik: '3210116412870081',
    noHp: '087716707003',
    nominalPengajuan: 3_146_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '06 Oct 2026',
    lastUpdate: '06 Oct 2026 16:50',
    aoName: 'Siti Rahma',
    aoId: 'siti_ao',
    branch: 'Cabang Tangerang',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SURVEY_IN_PROGRESS',
      name: 'Survei Lapangan',
      description: 'Survei lapangan dan penilaian tempat usaha',
      badge_variant: 'survey',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 360,
      formatted: '6j 0m',
      formatted_long: '6 Jam 0 Menit',
      badge_label: 'Berjalan (6j 0m)',
      status: 'RUNNING',
      start_time: '2026-10-06T10:50:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Proses verifikasi fisik survei',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'PASSED',
      survey: 'SCHEDULED',
      pengajuan: 'PROSES',
    },
  }),
  listedLead({
    id: 'D2026102900040',
    nama: 'ASMARANI',
    nik: '3671055810810002',
    noHp: '08822243197',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
    lastUpdate: '29 Oct 2026 16:05',
    aoName: 'Ahmad Fauzi',
    aoId: 'ahmad_ao',
    branch: 'Cabang Jakarta Selatan',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SLIK_PASSED',
      name: 'Lolos SLIK / CBI',
      description: 'SLIK lolos kriteria',
      badge_variant: 'slik_pass',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 75,
      formatted: '1j 15m',
      formatted_long: '1 Jam 15 Menit',
      badge_label: 'Berjalan (1j 15m)',
      status: 'RUNNING',
      start_time: '2026-10-29T14:50:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Menunggu penjadwalan survei',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'DONE',
      survey: 'WAITING',
      pengajuan: null,
    },
  }),
  listedLead({
    id: 'D2026102900039',
    nama: 'AMNAH',
    nik: '3216044809930006',
    noHp: '0859328196859',
    nominalPengajuan: 2_541_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '29 Oct 2026',
    lastUpdate: '29 Oct 2026 17:20',
    aoName: 'Rian Hidayat',
    aoId: 'rian_ao',
    branch: 'Cabang Bekasi 1',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SLIK_PASSED',
      name: 'Lolos SLIK / CBI',
      description: 'SLIK lolos',
      badge_variant: 'slik_pass',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 50,
      formatted: '50m',
      formatted_long: '50 Menit',
      badge_label: 'Berjalan (50m)',
      status: 'RUNNING',
      start_time: '2026-10-29T16:30:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Persiapan verifikasi data',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'DONE',
      survey: 'WAITING',
      pengajuan: null,
    },
  }),
  listedLead({
    id: 'D2026102000001',
    nik: '3273014501850001',
    nama: 'Siti Aminah',
    noHp: '081234567890',
    nominalPengajuan: 5_000_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '20 Oct 2026',
    lastUpdate: '20 Oct 2026 15:30',
    aoName: 'Linda Sefa',
    aoId: 'linda_ao',
    branch: 'Cabang Bandung 1',
    tipe: 'REPEAT_ORDER',
    applicationType: {
      type: 'REPEAT_ORDER',
      label: 'Repeat Order (RO #2)',
      source: 'AUTO_DETECT',
      counter: 2,
    },
    kategori: 'Produk Sertifikat',
    flowStage: {
      code: 'PENGAJUAN_COMPLETED',
      name: 'Selesai Pengajuan',
      description: 'Pengajuan disetujui komite & complete',
      badge_variant: 'completed',
    },
    status: 'Completed',
    sla: {
      duration_minutes: 180,
      formatted: '3j 0m',
      formatted_long: '3 Jam 0 Menit',
      badge_label: 'Selesai (3j 0m)',
      status: 'COMPLETED',
      start_time: '2026-10-20T12:30:00.000Z',
      end_time: '2026-10-20T15:30:00.000Z',
      is_complete: true,
      description: 'SLA Selesai: Pengajuan disetujui & masuk sistem core',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'PASSED',
      survey: 'DONE',
      pengajuan: 'COMPLETED',
    },
  }),
  listedLead({
    id: 'D2026102100002',
    nik: '3273021203900002',
    nama: 'Budi Santoso',
    noHp: '081298765432',
    nominalPengajuan: 4_000_000,
    actionLead: 'Credit Checking',
    statusCredit: 'DONE',
    tglPengajuan: '21 Oct 2026',
    lastUpdate: '21 Oct 2026 14:10',
    aoName: 'Andi Pratama',
    aoId: 'andi_ao',
    branch: 'Cabang Bandung 2',
    tipe: 'NEW',
    kategori: 'Produk Sertifikat',
    flowStage: {
      code: 'KOMITE_REVIEW',
      name: 'Review Komite',
      description: 'Review memorandum Kaops/KC',
      badge_variant: 'komite',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 320,
      formatted: '5j 20m',
      formatted_long: '5 Jam 20 Menit',
      badge_label: 'Berjalan (5j 20m)',
      status: 'RUNNING',
      start_time: '2026-10-21T08:50:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Menunggu persetujuan komite kredit',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'PASSED',
      survey: 'DONE',
      pengajuan: 'PROSES',
    },
  }),
  listedLead({
    id: 'D2026102200003',
    nik: '3273036708950003',
    nama: 'Linda Sefa',
    noHp: '081377788899',
    nominalPengajuan: 2_500_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '22 Oct 2026',
    lastUpdate: '22 Oct 2026 11:45',
    aoName: 'Budi Santoso',
    aoId: 'budi_ao',
    branch: 'Cabang Bandung 1',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'LEADS_MANDATORY',
      name: 'Input Data Leads',
      description: 'Mandatory data belum lengkap',
      badge_variant: 'draft',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 15,
      formatted: '15m',
      formatted_long: '15 Menit',
      badge_label: 'Berjalan (15m)',
      status: 'RUNNING',
      start_time: '2026-10-22T11:30:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Menunggu foto usaha dan KTP pasangan',
    },
    rawStatus: {
      lead: 'WAITING',
      credit_checking: null,
      survey: null,
      pengajuan: null,
    },
  }),
  listedLead({
    id: 'D2026102900004',
    nik: '3672055212930004',
    nama: 'Ibu NINING PURWANTI',
    noHp: '0819168121812',
    nominalPengajuan: 2_541_000,
    actionLead: 'Proses Survey',
    statusCredit: 'PASSED',
    tglPengajuan: '29 Oct 2026',
    lastUpdate: '29 Oct 2026 16:45',
    aoName: 'Ahmad Fauzi',
    aoId: 'ahmad_ao',
    branch: 'Cabang Cilegon',
    tipe: 'NEW',
    kategori: 'Produk UMI',
    flowStage: {
      code: 'SURVEY_IN_PROGRESS',
      name: 'Survei Lapangan',
      description: 'Survei lapangan terjadwal',
      badge_variant: 'survey',
    },
    status: 'Pending',
    sla: {
      duration_minutes: 210,
      formatted: '3j 30m',
      formatted_long: '3 Jam 30 Menit',
      badge_label: 'Berjalan (3j 30m)',
      status: 'RUNNING',
      start_time: '2026-10-29T13:15:00.000Z',
      end_time: null,
      is_complete: false,
      description: 'SLA Berjalan: Proses survei lingkungan dan tempat usaha',
    },
    rawStatus: {
      lead: 'RESPONSE',
      credit_checking: 'PASSED',
      survey: 'SCHEDULED',
      pengajuan: 'PROSES',
    },
  }),
];

export const leads: Lead[] = leadRows.map((lead, index) => ({
  ...lead,
  id: lead.id || formatLeadId(lead.detail.tglPengajuan, index + 1),
}));
