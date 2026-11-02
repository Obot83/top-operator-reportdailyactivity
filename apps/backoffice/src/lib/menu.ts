export type MenuIconName =
  | 'dashboard'
  | 'leads'
  | 'credit'
  | 'delegasi'
  | 'absensi'
  | 'kolektor'
  | 'pembiayaan'
  | 'channeling'
  | 'keuangan'
  | 'master'
  | 'analitik'
  | 'report'
  | 'users';

export type MenuNode = {
  label: string;
  href?: string;
  featured?: boolean;
  icon?: MenuIconName;
  children?: MenuNode[];
};

export const menu: MenuNode[] = [
  { label: 'Dashboard', href: '/', icon: 'dashboard' },
  {
    label: 'Leads',
    icon: 'leads',
    children: [
      { label: 'Daftar Leads', href: '/leads/daftar' },
      { label: 'Pengajuan Slik', href: '/leads/pengajuan-slik' },
      { label: 'Assign Surveyor', href: '/leads/assign-surveyor' },
      { label: 'Daftar Checking', href: '/leads/daftar-checking' },
    ],
  },
  {
    label: 'Credit Analis',
    icon: 'credit',
    children: [
      { label: 'Memorandum', href: '/credit-analis/memorandum' },
      { label: 'Approval Memorandum', href: '/credit-analis/approval-memorandum' },
      { label: 'Checking Data', href: '/credit-analis/checking-data' },
    ],
  },
  {
    label: 'Delegasi',
    icon: 'delegasi',
    children: [
      { label: 'Kelola Delegasi', href: '/delegasi/kelola' },
      { label: 'Riwayat Pindah Kelompok', href: '/delegasi/riwayat-pindah-kelompok' },
    ],
  },
  {
    label: 'Absensi',
    icon: 'absensi',
    children: [
      { label: 'Daftar Kehadiran', href: '/absensi/kehadiran' },
      { label: 'Daftar Pengajuan Ijin', href: '/absensi/pengajuan-ijin' },
    ],
  },
  {
    label: 'Kolektor',
    icon: 'kolektor',
    children: [
      { label: 'Daftar Tagihan Harian (DTH)', href: '/kolektor/dth' },
      { label: 'Kontrak Lunas', href: '/kolektor/kontrak-lunas' },
      { label: 'Angsuran Tertagih', href: '/kolektor/angsuran-tertagih' },
      { label: 'Pemohonan', href: '/kolektor/pemohonan' },
      { label: 'Approval UJ', href: '/kolektor/approval-uj' },
      { label: 'Debitur Card Controller', href: '/kolektor/debitur-card', featured: true },
    ],
  },
  {
    label: 'Persiapan Pembiayaan',
    icon: 'pembiayaan',
    children: [
      { label: 'Tambah Assign PP', href: '/persiapan-pembiayaan/tambah-assign' },
      { label: 'List Assign PP', href: '/persiapan-pembiayaan/list-assign' },
      { label: 'Validasi PP', href: '/persiapan-pembiayaan/validasi' },
    ],
  },
  {
    label: 'Loan Channeling',
    icon: 'channeling',
    children: [
      { label: 'Assigment leads', href: '/loan-channeling/assignment-leads' },
      { label: 'Approval BPR', href: '/loan-channeling/approval-bpr' },
      {
        label: 'Setting',
        children: [
          { label: 'Parameter Masa Expired', href: '/loan-channeling/setting/parameter-masa-expired' },
          { label: 'Reason Code Penolakan', href: '/loan-channeling/setting/reason-code' },
          { label: 'Register BPR', href: '/loan-channeling/setting/register-bpr' },
          { label: 'Audit & Log', href: '/loan-channeling/setting/audit-log' },
        ],
      },
    ],
  },
  {
    label: 'Keuangan',
    icon: 'keuangan',
    children: [
      { label: 'Pencairan', href: '/keuangan/pencairan' },
      { label: 'Pembayaran', href: '/keuangan/pembayaran' },
    ],
  },
  {
    label: 'Master',
    icon: 'master',
    children: [
      { label: 'Rekening', href: '/master/rekening' },
      { label: 'Produk', href: '/master/produk' },
    ],
  },
  { label: 'Analitik', href: '/analitik', icon: 'analitik' },
  {
    label: 'Sales Report',
    icon: 'report',
    children: [
      { label: 'Laporan Leads & Prospek', href: '/sales-report/laporan-leads' },
      { label: 'Daily AO Activity Report', href: '/sales-report/daily-ao' },
    ],
  },
  { label: 'Surveyor Report', href: '/surveyor-report', icon: 'report' },
  {
    label: 'Collection Report',
    icon: 'report',
    children: [
      { label: 'Rekap Penerimaan Kas', href: '/collection-report/rekap-penerimaan-kas' },
      { label: 'Laporan Tunggakan (DPD)', href: '/collection-report/tunggakan-dpd' },
      { label: 'Daily Collection Activity Report', href: '/collection-report/daily' },
      { label: 'Debitur Card Controller (Read-Only / Monitoring)', href: '/collection-report/debitur-card' },
    ],
  },
  { label: 'Management Report', href: '/management-report', icon: 'report' },
  {
    label: 'Manajemen User',
    icon: 'users',
    children: [
      { label: 'Lapangan', href: '/manajemen-user/lapangan' },
      { label: 'Admin', href: '/manajemen-user/admin' },
      { label: 'Group Menu', href: '/manajemen-user/group-menu' },
      { label: 'User BPR', href: '/manajemen-user/user-bpr' },
    ],
  },
];

export type MenuEntry = {
  href: string;
  label: string;
  trail: string[];
};

export function flattenMenu(nodes: MenuNode[] = menu, trail: string[] = []): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const node of nodes) {
    const nextTrail = [...trail, node.label];
    if (node.href) entries.push({ href: node.href, label: node.label, trail: nextTrail });
    if (node.children) entries.push(...flattenMenu(node.children, nextTrail));
  }
  return entries;
}

export function findMenuItem(href: string): MenuEntry | null {
  return flattenMenu().find((item) => item.href === href) ?? null;
}
