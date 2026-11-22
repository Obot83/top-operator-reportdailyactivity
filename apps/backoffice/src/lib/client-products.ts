import clientProductsData from './client-products-data.json';

export interface CostManagementItem {
  id: string; // e.g. "ADM", "DD", "PRV", "CRC"
  name: string; // e.g. "Biaya Administrasi", "Dana Duka"
  type: string; // e.g. "FIXED"
  jenis: 'NOMINAL' | 'PERCENTAGE' | string;
  value: number | string;
}

export interface ClientProductPaket {
  _id: string; // e.g. "001", "020"
  name: string; // e.g. "New UMI (1,8 / 30)"
  tenor: number; // e.g. 30
  plafon: number; // e.g. 1888000
  angsuran: number; // e.g. 72000
  tabungan: number; // e.g. 5000 (Tabungan Wajib)
  suku_bunga: number | string; // e.g. 46.347
  tabungan_pokok: number; // e.g. 100000
  utj: number; // e.g. 160000
  cost_managaments?: CostManagementItem[] | null;
  flg?: {
    used?: boolean;
  };
}

export interface ClientProduct {
  _id: string; // e.g. "005", "007"
  client_id?: string;
  product_name: string;
  product_description?: string;
  product_type?: 'SRTF' | 'NONSRTF' | string;
  interest_rate_type?: string; // "fixed", "anuitas", "range"
  tenor_type: string; // "MINGGU", "BULANAN"
  paket?: ClientProductPaket[] | null;
  cost_managaments?: CostManagementItem[] | null;
  submission_loan?: {
    min: number;
    max: number;
  };
  submission_tenors?: {
    data?: {
      id?: string[];
      interest_rate?: number;
    };
    dtl?: Array<{
      _id: string;
      tenor: number;
      type: string;
      active?: boolean;
      interest_rate?: number;
    }>;
  };
}

export interface LoanProductDetail {
  isUmi: boolean;
  isSertifikat: boolean;
  badgeId: string; // e.g. "#005 · #001" or "#007"
  categoryLabel: 'PRODUK PINJAMAN UMI' | 'PRODUK SERTIFIKAT';
  title: string; // e.g. "PINJAMAN - UMI — New UMI (1,8 / 30)" or "KSP (Sertifikat 25jt - 100j)"
  plafon: number;
  plafonFormatted: string; // e.g. "Rp 1.888.000"
  angsuran: number;
  angsuranFormatted: string; // e.g. "Rp 72.000 / Minggu" or "Rp 4.741.667 / Bulan"
  // Section B fields
  tenorTipe: string; // e.g. "30 MINGGU" or "12 BULANAN"
  sukuBungaFormatted: string; // e.g. "46,347%" or "1,7%"
  // UMI specific
  utjFormatted?: string; // e.g. "Rp 160.000"
  tabunganWajibFormatted?: string; // e.g. "Rp 5.000"
  tabunganPokokFormatted?: string; // e.g. "Rp 100.000"
  // Sertifikat specific
  tipeBungaFormatted?: string; // e.g. "Fixed", "Anuitas"
  // Section C fields
  costManagements: CostManagementItem[];
}

export const CLIENT_PRODUCTS: ClientProduct[] = clientProductsData as ClientProduct[];

/** Format number into Rupiah e.g. 1888000 -> "Rp 1.888.000" */
export function formatRupiahId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Rp 0';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
}

/** Format percentage with Indonesian comma e.g. 46.347 -> "46,347%", 1.7 -> "1,7%", 4 -> "4%" */
export function formatPercentId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return `${value}%`;
  // Format with decimal separator as comma and strip excessive trailing zeros if integer
  return `${num.toLocaleString('id-ID', { maximumFractionDigits: 3 })}%`;
}

/** Capitalize first letter e.g. "fixed" -> "Fixed", "anuitas" -> "Anuitas" */
export function formatCapitalize(str?: string | null): string {
  if (!str) return '-';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Convert tenor type to readable period unit e.g. "MINGGU" -> "Minggu", "BULANAN" -> "Bulan" */
export function formatTenorUnit(tenorType?: string | null): string {
  if (!tenorType) return 'Bulan';
  const upper = tenorType.toUpperCase();
  if (upper.includes('MINGGU')) return 'Minggu';
  if (upper.includes('HARI')) return 'Hari';
  if (upper.includes('TAHUN')) return 'Tahun';
  return 'Bulan';
}

/**
 * Resolves comprehensive loan product detail based on client_product JSON structure.
 * Works seamlessly whether called with full MongoDB lead object, sample lead, or explicit product parameters.
 */
export function resolveLoanProductDetail(lead: any): LoanProductDetail {
  const kategori: string = lead?.kategori || '';
  const isSrtf =
    lead?.product_type === 'SRTF' ||
    kategori.toLowerCase().includes('sertifikat') ||
    lead?.pengajuan?.product?.id === '007' ||
    lead?.pengajuan?.product?.id === '006' ||
    lead?.pengajuan?.product?.id === '008';

  const productList = CLIENT_PRODUCTS;

  if (isSrtf) {
    const srtfProduct =
      productList.find((p) => p._id === '007') ||
      productList.find((p) => p.product_type === 'SRTF') ||
      productList[6];

    const tenorValue = lead?.detail?.tenor ? parseInt(lead.detail.tenor, 10) : 12;
    const safeTenor = isNaN(tenorValue) || tenorValue <= 0 ? 12 : tenorValue;
    const tenorType = srtfProduct?.tenor_type || 'BULANAN';
    const tenorTipe = `${safeTenor} ${tenorType}`;

    const rawNominal = lead?.nominalPengajuan ?? lead?.nominal;
    const plafon =
      rawNominal && rawNominal > 10_000_000
        ? rawNominal
        : 50_000_000;

    const angsuran = lead?.angsuran || 4_741_667;

    const interestRate =
      srtfProduct?.submission_tenors?.data?.interest_rate ??
      (srtfProduct?.submission_tenors?.dtl?.[1]?.interest_rate || 1.7);

    const costManagements: CostManagementItem[] = (srtfProduct?.cost_managaments || []).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      jenis: c.jenis,
      value: c.value,
    }));

    return {
      isUmi: false,
      isSertifikat: true,
      badgeId: `#${srtfProduct?._id || '007'}`,
      categoryLabel: 'PRODUK SERTIFIKAT',
      title: srtfProduct?.product_name || 'KSP (Sertifikat 25jt - 100j)',
      plafon,
      plafonFormatted: formatRupiahId(plafon),
      angsuran,
      angsuranFormatted: `${formatRupiahId(angsuran)} / ${formatTenorUnit(tenorType)}`,
      tenorTipe,
      sukuBungaFormatted: formatPercentId(interestRate),
      tipeBungaFormatted: formatCapitalize(srtfProduct?.interest_rate_type || 'fixed'),
      costManagements,
    };
  }

  // Otherwise: Produk UMI
  const umiProduct = productList.find((p) => p._id === '005') || productList[3];
  const pakets = umiProduct?.paket || [];

  // Match paket by nominalPengajuan or lead's requested paket_id
  let matchedPaket: ClientProductPaket | undefined;

  const targetPlafon = lead?.nominalPengajuan ?? lead?.nominal;
  if (lead?.pengajuan?.product?.paket_id) {
    matchedPaket = pakets.find((pk) => pk._id === lead.pengajuan.product.paket_id);
  }
  if (!matchedPaket && lead?.paketId) {
    matchedPaket = pakets.find((pk) => pk._id === lead.paketId);
  }
  if (!matchedPaket && targetPlafon) {
    matchedPaket = pakets.find((pk) => pk.plafon === targetPlafon);
  }
  // Default to paket #001 "New UMI (1,8 / 30)" if not matched
  if (!matchedPaket) {
    matchedPaket = pakets[0] || {
      _id: '001',
      name: 'New UMI (1,8 / 30)',
      tenor: 30,
      plafon: 1888000,
      angsuran: 72000,
      tabungan: 5000,
      suku_bunga: 46.347,
      tabungan_pokok: 100000,
      utj: 160000,
      cost_managaments: [
        {
          id: 'ADM',
          name: 'Biaya Administrasi',
          type: 'FIXED',
          jenis: 'NOMINAL',
          value: 112000,
        },
        {
          id: 'DD',
          name: 'Dana Duka',
          type: 'FIXED',
          jenis: 'NOMINAL',
          value: 21000,
        },
      ],
    };
  }

  const tenorType = umiProduct?.tenor_type || 'MINGGU';
  const tenorTipe = `${matchedPaket.tenor} ${tenorType}`;
  const costManagements: CostManagementItem[] = (
    matchedPaket.cost_managaments ||
    umiProduct?.cost_managaments ||
    []
  ).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    jenis: c.jenis,
    value: c.value,
  }));

  return {
    isUmi: true,
    isSertifikat: false,
    badgeId: `#${umiProduct?._id || '005'} · #${matchedPaket._id}`,
    categoryLabel: 'PRODUK PINJAMAN UMI',
    title: `${umiProduct?.product_name || 'PINJAMAN - UMI'} — ${matchedPaket.name}`,
    plafon: matchedPaket.plafon,
    plafonFormatted: formatRupiahId(matchedPaket.plafon),
    angsuran: matchedPaket.angsuran,
    angsuranFormatted: `${formatRupiahId(matchedPaket.angsuran)} / ${formatTenorUnit(tenorType)}`,
    tenorTipe,
    sukuBungaFormatted: formatPercentId(matchedPaket.suku_bunga),
    utjFormatted: formatRupiahId(matchedPaket.utj),
    tabunganWajibFormatted: formatRupiahId(matchedPaket.tabungan),
    tabunganPokokFormatted: formatRupiahId(matchedPaket.tabungan_pokok),
    costManagements,
  };
}
