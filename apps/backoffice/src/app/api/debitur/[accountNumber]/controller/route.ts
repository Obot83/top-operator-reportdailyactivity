import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MONGODB_DIR = path.resolve(process.cwd(), 'mongodb');

interface UserDirectoryEntry {
  name: string;
  branch: string;
  jabatan: string;
}

let cachedUserDirectory: Map<string, UserDirectoryEntry> | null = null;

function loadUserDirectory(): Map<string, UserDirectoryEntry> {
  if (cachedUserDirectory) return cachedUserDirectory;
  const map = new Map<string, UserDirectoryEntry>();
  const csvPath = path.join(MONGODB_DIR, 'kospinus001.users_app.csv');
  if (fs.existsSync(csvPath)) {
    try {
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        const id = parts[0]?.trim();
        const name = parts[1]?.trim();
        const branch = parts[21]?.trim();
        if (id && name) {
          map.set(id.toLowerCase(), { name, branch: branch || '', jabatan: 'Account Officer' });
        }
      }
    } catch (e) {
      console.warn('[debitur-controller] failed to read users_app.csv', e);
    }
  }
  cachedUserDirectory = map;
  return map;
}

let cachedMongoUserDirectory: Map<string, UserDirectoryEntry> | null = null;

async function loadMongoUserDirectory(db: any): Promise<Map<string, UserDirectoryEntry>> {
  if (cachedMongoUserDirectory && cachedMongoUserDirectory.size > 0) {
    return cachedMongoUserDirectory;
  }
  const map = new Map<string, UserDirectoryEntry>();

  // 1. Ambil dari collection users_app (lapangan, AO, surveyor)
  try {
    const appUsers = await db.collection('users_app').find({}).toArray();
    for (const u of appUsers) {
      const rawName = typeof u.name === 'string' ? u.name.trim() : '';
      if (!rawName) continue;
      const branch = u.profile?.branch?.name || '';
      const jabatan = u.profile?.karyawan?.jabatan || u.user_type || 'Account Officer';
      const entry: UserDirectoryEntry = { name: rawName, branch, jabatan };
      if (u._id) map.set(String(u._id).toLowerCase().trim(), entry);
      if (u.id) map.set(String(u.id).toLowerCase().trim(), entry);
      if (u.username) map.set(String(u.username).toLowerCase().trim(), entry);
      if (u.email) map.set(String(u.email).toLowerCase().trim(), entry);
    }
  } catch (e) {
    console.warn('[debitur-controller] failed to load users_app from mongo', e);
  }

  // 2. Ambil dari collection users_client (backoffice, KC, KAOP, CA)
  try {
    const clientUsers = await db.collection('users_client').find({}).toArray();
    for (const u of clientUsers) {
      const rawName = typeof u.name === 'string' ? u.name.trim() : '';
      if (!rawName) continue;
      const branch = u.branch?.name || '';
      const jabatan = u.profile?.jabatan || u.jabatan || u.group_name || 'Petugas Operasional';
      const entry: UserDirectoryEntry = { name: rawName, branch, jabatan };
      if (u._id) map.set(String(u._id).toLowerCase().trim(), entry);
      if (u.username) map.set(String(u.username).toLowerCase().trim(), entry);
      if (u.email) map.set(String(u.email).toLowerCase().trim(), entry);
    }
  } catch (e) {
    console.warn('[debitur-controller] failed to load users_client from mongo', e);
  }

  // 3. Fallback CSV jika map masih kosong
  if (map.size === 0) {
    const csvMap = loadUserDirectory();
    for (const [k, v] of csvMap.entries()) {
      map.set(k.toLowerCase(), v);
    }
  }

  cachedMongoUserDirectory = map;
  return map;
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

function formatRp(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function resolveOfficerInfo(
  uid: string | undefined | null,
  fallbackName?: string,
  fallbackRole?: string,
  userDirectory?: Map<string, UserDirectoryEntry>
): { name: string; role: string; branch: string } {
  if (!uid && !fallbackName) return { name: '-', role: fallbackRole || '-', branch: '-' };
  const cleanId = (uid || '').trim().toLowerCase();
  const baseId = cleanId.replace(/_(sur|col)$/i, '');

  if (userDirectory) {
    const found = userDirectory.get(cleanId) || userDirectory.get(baseId);
    if (found) {
      return {
        name: toTitleCase(found.name),
        role: found.jabatan || fallbackRole || 'Petugas Pembiayaan',
        branch: found.branch || '-',
      };
    }
  }

  let name = fallbackName || '';
  if (!name) {
    if (cleanId.includes('@')) {
      const prefix = cleanId.split('@')[0];
      if (prefix === 'admintes') {
        name = 'Admin Pembiayaan (Kodein)';
      } else {
        name = prefix.replace(/[._]/g, ' ');
      }
    } else {
      name = baseId.replace(/[_-]/g, ' ');
    }
  }

  return {
    name: toTitleCase(name || cleanId),
    role: fallbackRole || 'Petugas Lapangan',
    branch: '-',
  };
}

function resolveOfficerName(
  uid: string | undefined | null,
  fallbackName?: string,
  userDirectory?: Map<string, UserDirectoryEntry>
): string {
  return resolveOfficerInfo(uid, fallbackName, undefined, userDirectory).name;
}
import type {
  DebiturControllerData,
  RiskScore,
  VisitLogEntry,
  PTPTrackingData,
  ApiResponse,
  DebtorCustomerDetail,
  DebtorSpouseDetail,
  DebtorGuarantorDetail,
  DebtorCollateralDetail,
  DebtorCollateralFile,
  DebtorCreditCapacity,
  DebtorOtherContractItem,
  DebtorDocumentItem,
  DebtorJobCapacity,
  LoanProcessStep,
} from '@/shared/types';

function categorizeAgunanFile(f: any): { category: DebtorCollateralFile['category']; categoryLabel: string } {
  const name = String(f.name || '').toUpperCase();
  const notes = String(f.notes || '').toUpperCase();

  if (
    name.includes('SHM') ||
    name.includes('SHGB') ||
    notes.includes('SHM') ||
    notes.includes('SHGB') ||
    notes.includes('SERTIFIKAT') ||
    name === 'DOC_AGUNAN' ||
    name === 'DOC_PDF'
  ) {
    return { category: 'SERTIFIKAT', categoryLabel: 'Dokumen Sertifikat & Legalitas (SHM/SHGB)' };
  }
  if (
    name.includes('DEPAN') ||
    name.includes('KANAN') ||
    name.includes('KIRI') ||
    name.includes('BELAKANG') ||
    name.includes('JALAN') ||
    name.includes('MIRING') ||
    notes.includes('RUMAH_LUAR') ||
    notes.includes('RKO') ||
    notes.includes('TNH')
  ) {
    return { category: 'FOTO_EKSTERIOR', categoryLabel: 'Foto Tampak Luar / Eksterior Agunan' };
  }
  if (
    name.includes('DALAM') ||
    name.includes('RUANG') ||
    name.includes('KAMAR') ||
    name.includes('DAPUR') ||
    name.includes('LISTRIK') ||
    notes.includes('RUMAH_DALAM')
  ) {
    return { category: 'FOTO_INTERIOR', categoryLabel: 'Foto Tampak Dalam / Interior Agunan' };
  }
  if (name.includes('SURVEY') || f.location?.coordinates) {
    return { category: 'SURVEY_LOKASI', categoryLabel: 'Foto & Titik Koordinat Lokasi Survey Agunan' };
  }
  return { category: 'LAINNYA', categoryLabel: 'Foto Pendukung Agunan' };
}

function isAgunanFile(f: any): boolean {
  const name = String(f.name || '').toUpperCase();
  const notes = String(f.notes || '').toUpperCase();

  // Exclude purely personal identity files
  if (name.includes('KTP_PEMOHON') || name.includes('KTP_PASANGAN') || name.includes('SLIK')) {
    return false;
  }
  if (name === 'DOC_IDENTITAS' && !notes.includes('RUMAH') && !notes.includes('AGUNAN') && !notes.includes('SERTIFIKAT')) {
    return false;
  }
  if (name.includes('FACE_IMAGE') || name.includes('PEFINDO')) {
    return false;
  }

  // Include agunan and physical inspection files
  if (
    name.includes('SHM') ||
    name.includes('SHGB') ||
    name === 'DOC_AGUNAN' ||
    name === 'DOC_MAIN-FOTO-AGUNAN' ||
    name.includes('TAMPAK') ||
    name.includes('DAPUR') ||
    name.includes('RUANG TAMU') ||
    name.includes('KAMAR') ||
    name.includes('LISTRIK') ||
    name.includes('SURVEY') ||
    notes.includes('SHM') ||
    notes.includes('SHGB') ||
    notes.includes('SERTIFIKAT') ||
    notes.includes('RMH') ||
    notes.includes('RUMAH') ||
    notes.includes('TNH') ||
    notes.includes('RKO')
  ) {
    return true;
  }
  return false;
}

function calculateRiskScore(params: {
  dpd: number;
  kolektibilitas: string;
  isWriteOff: boolean;
  ptpTrackings: Array<{ status: string }>;
  visitLogs: Array<{ visitStatus: string }>;
}): RiskScore {
  let score = 0;
  const factors: string[] = [];

  // DPD scoring
  if (params.dpd === 0) {
    score += 5;
  } else if (params.dpd <= 7) {
    score += 20;
    factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 30) {
    score += 40;
    factors.push(`DPD ${params.dpd} hari`);
  } else if (params.dpd <= 90) {
    score += 65;
    factors.push(`DPD ${params.dpd} hari - perhatian khusus`);
  } else {
    score += 85;
    factors.push(`DPD ${params.dpd} hari - kritis`);
  }

  // WO
  if (params.isWriteOff) {
    score = 100;
    factors.push('Rekening Write-Off');
  }

  // PTP Broken
  const brokenPTP = params.ptpTrackings.filter((p) => p.status === 'BROKEN').length;
  if (brokenPTP > 2) {
    score += 15;
    factors.push(`${brokenPTP}x Janji Bayar Dilanggar`);
  } else if (brokenPTP > 0) {
    score += 8;
    factors.push(`${brokenPTP}x Janji Bayar Dilanggar`);
  }

  // Refused visit
  const refused = params.visitLogs.filter((v) => v.visitStatus === 'REFUSED').length;
  if (refused > 0) {
    score += 10;
    factors.push(`${refused}x Menolak Ditemui`);
  }

  score = Math.min(score, 100);

  return {
    score,
    label: score >= 80 ? 'KRITIS' : score >= 60 ? 'TINGGI' : score >= 30 ? 'SEDANG' : 'RENDAH',
    factors,
  };
}

function calculateKolektibilitas(dpd: number): 'LANCAR' | 'DPK' | 'KURANG_LANCAR' | 'DIRAGUKAN' | 'MACET' {
  if (dpd <= 0) return 'LANCAR';
  if (dpd <= 90) return 'DPK';
  if (dpd <= 120) return 'KURANG_LANCAR';
  if (dpd <= 180) return 'DIRAGUKAN';
  return 'MACET';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { accountNumber: string } | Promise<{ accountNumber: string }> }
): Promise<NextResponse<ApiResponse<DebiturControllerData>>> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const accountNumber = resolvedParams?.accountNumber;

    if (!accountNumber) {
      return NextResponse.json({ success: false, error: 'Nomor rekening tidak valid' }, { status: 400 });
    }

    // ── 1. Coba cari di MongoDB collection 'contract' ───────────────
    try {
      const db = await getMongoDb();
      const contract = await db.collection<any>('contract').findOne({ _id: accountNumber });

      if (contract) {
        // Ambil data leads terkait jika ada lead_id atau cocok nama pemohon
        let lead: any = null;
        if (contract.lead_id) {
          lead = await db.collection<any>('leads').findOne({ _id: contract.lead_id });
        }
        if (!lead && contract.debitur?.name) {
          lead = await db.collection<any>('leads').findOne({ 'pemohon.name': contract.debitur.name });
        }

        const nik = String(lead?.pemohon?.ktp?.identity_number || contract.debitur?.nik || '');

        // ── Temukan Seluruh Kontrak Lainnya untuk Debitur / NIK ini ─────
        const relatedQuery: any[] = [];
        if (nik) {
          const relatedLeads = await db
            .collection('leads')
            .find({ 'pemohon.ktp.identity_number': nik }, { projection: { _id: 1 } })
            .toArray();
          const relatedLeadIds = relatedLeads.map((l) => l._id);
          if (relatedLeadIds.length > 0) {
            relatedQuery.push({ lead_id: { $in: relatedLeadIds } });
          }
        }
        if (contract.debitur?.name) {
          relatedQuery.push({ 'debitur.name': contract.debitur.name });
        }
        if (lead?.pemohon?.name && lead.pemohon.name !== contract.debitur?.name) {
          relatedQuery.push({ 'debitur.name': lead.pemohon.name });
        }
        if (contract.lead_id) {
          relatedQuery.push({ lead_id: contract.lead_id });
        }

        const rawOtherContracts = await db
          .collection<any>('contract')
          .find(relatedQuery.length > 0 ? { $or: relatedQuery } : ({ _id: accountNumber } as any))
          .sort({ contract_date: -1 })
          .toArray();

        // Hindari duplikasi jika ada query or yang tumpang tindih
        const uniqueContractMap = new Map<string, any>();
        for (const oc of rawOtherContracts) {
          uniqueContractMap.set(String(oc._id), oc);
        }
        // Pastikan kontrak saat ini masuk
        if (!uniqueContractMap.has(String(contract._id))) {
          uniqueContractMap.set(String(contract._id), contract);
        }

        const otherContracts: DebtorOtherContractItem[] = Array.from(uniqueContractMap.values())
          .map((oc: any) => {
            let ocBakiDebet = 0;
            let ocMaxDpd = 0;
            if (Array.isArray(oc.amortisasi)) {
              for (const a of oc.amortisasi) {
                const pokok = Number(a.pokok) || 0;
                const pokokDibayar = Number(a.pokok_dibayar) || 0;
                if (!a.payment_date && pokok > pokokDibayar) {
                  ocBakiDebet += pokok - pokokDibayar;
                }
                const telat = Number(a.hari_telat_bayar) || 0;
                if (telat > ocMaxDpd) ocMaxDpd = telat;
              }
            } else {
              ocBakiDebet = Number(oc.loan?.nominal_pengajuan) || 0;
            }

            const ocPlafon = Number(oc.loan?.nominal_pengajuan) || ocBakiDebet;
            const ocTenor = Number(oc.loan?.tenor) || 30;

            return {
              accountNumber: String(oc._id),
              productName: ocPlafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI',
              contractDate: oc.contract_date ? new Date(oc.contract_date).toISOString().slice(0, 10) : '-',
              plafon: ocPlafon,
              bakiDebetPokok: ocBakiDebet,
              tenor: ocTenor,
              dpd: ocMaxDpd,
              kolektibilitas: calculateKolektibilitas(ocMaxDpd),
              status: String(oc.status_kontrak ?? 'AKTIF'),
              isCurrent: String(oc._id) === accountNumber,
            };
          })
          .sort((a, b) => {
            if (a.isCurrent) return -1;
            if (b.isCurrent) return 1;
            return new Date(b.contractDate).getTime() - new Date(a.contractDate).getTime();
          });

        // ── Data Riwayat Pembayaran & Kunjungan ────────────────────────
        const payments = await db
          .collection('v_backoffice_kolektor_angsuran_tertagih_list')
          .find({ contract_id: accountNumber })
          .sort({ tgl_bayar: -1 })
          .toArray();

        // Hitung amortisasi & baki debet kontrak aktif
        let bakiDebetPokok = 0;
        let maxDpd = 0;
        let angsuranPokok = 0;
        let angsuranBunga = 0;
        let saldoTitipan = 0;

        if (Array.isArray(contract.amortisasi)) {
          for (const a of contract.amortisasi) {
            const pokok = Number(a.pokok) || 0;
            const pokokDibayar = Number(a.pokok_dibayar) || 0;
            if (!a.payment_date && pokok > pokokDibayar) {
              bakiDebetPokok += pokok - pokokDibayar;
            }
            if (angsuranPokok === 0 && pokok > 0) angsuranPokok = pokok;
            if (angsuranBunga === 0 && (Number(a.bunga) || 0) > 0) angsuranBunga = Number(a.bunga) || 0;
            saldoTitipan += Number(a.simpanan_wajib_dibayar) || 0;

            const telat = Number(a.hari_telat_bayar) || 0;
            if (telat > maxDpd) maxDpd = telat;
          }
        } else {
          bakiDebetPokok = Number(contract.loan?.nominal_pengajuan) || 0;
        }

        const plafon = Number(contract.loan?.nominal_pengajuan) || bakiDebetPokok;
        const tenor = Number(contract.loan?.tenor) || 30;
        const kolektibilitas = calculateKolektibilitas(maxDpd);

        // Buat timeline kunjungan dari riwayat pembayaran dan settlement
        const visitTimeline: VisitLogEntry[] = payments.map((p: any) => ({
          id: p._id ? String(p._id) : `${p.contract_id}-${p.tgl_bayar}`,
          visitTimestamp: p._payment_date ? new Date(p._payment_date).toISOString() : new Date().toISOString(),
          officerName: String(p.collector ?? contract.assign_to?.name ?? 'Kolektor Lapangan'),
          officerRole: 'KOLEKTOR',
          latitude: 0,
          longitude: 0,
          visitStatus: 'MET_DEBTOR' as any,
          visitStatusLabel: 'Pembayaran Angsuran Berhasil',
          reasonCategory: 'PENAGIHAN_BERHASIL',
          reasonDetail: `Realisasi Rp ${(Number(p.nominal_dibayar) || 0).toLocaleString('id-ID')} (Angs ${p.step_tenor || '-'})`,
          fieldNotes: `Pembayaran berhasil diterima oleh kolektor ${p.collector ?? '-'}. DPD tercatat ${p.telat ?? 0} hari.`,
          photoUrls: [],
          hasPTP: false,
        }));

        // Tambahkan janji bayar jika ada flg.janji_bayar
        const ptpHistory: PTPTrackingData[] = [];
        let latestPTP: PTPTrackingData | null = null;
        if (contract.flg?.janji_bayar) {
          const ptpItem: PTPTrackingData = {
            id: `PTP-${contract._id}`,
            accountNumber,
            targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            nominalKomitmen: angsuranPokok + angsuranBunga,
            status: 'PENDING',
            catatan: 'Janji bayar aktif dicatat oleh petugas kolektor',
            createdAt: new Date().toISOString(),
          };
          ptpHistory.push(ptpItem);
          latestPTP = ptpItem;
        }

        const riskScore = calculateRiskScore({
          dpd: maxDpd,
          kolektibilitas,
          isWriteOff: contract.status_kontrak === 'NON AKTIF' && maxDpd > 90,
          ptpTrackings: ptpHistory,
          visitLogs: visitTimeline,
        });

        const debiturName = String(contract.debitur?.name || lead?.pemohon?.name || 'Tanpa Nama');
        const phone = String(contract.debitur?.no_hp || lead?.pemohon?.phone_number || '-');
        const resolvedNik = String(nik || '-');

        const address = [
          contract.alamat?.alamat,
          contract.alamat?.kelurahan,
          contract.alamat?.kecamatan,
          contract.alamat?.kota,
          contract.alamat?.provinsi,
        ]
          .filter(Boolean)
          .join(', ') || 'Alamat Belum Terdaftar';

        // ── 5. Data Detail Nasabah ───────────────────────────────────
        const pemohon = lead?.pemohon;
        const ktp = pemohon?.ktp;
        const domisili = pemohon?.domisili;

        let age: number | undefined = undefined;
        if (ktp?.birth_date) {
          const bDate = new Date(ktp.birth_date);
          if (!isNaN(bDate.getTime())) {
            const diffMs = Date.now() - bDate.getTime();
            age = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
          }
        }

        const ktpAddressParts = [
          ktp?.address,
          ktp?.rt ? `RT ${ktp.rt}` : '',
          ktp?.rw ? `RW ${ktp.rw}` : '',
          ktp?.subdistricts?.name || (typeof ktp?.subdistricts === 'string' ? ktp.subdistricts : ''),
          ktp?.districts,
          ktp?.city,
          ktp?.province,
          ktp?.postal_code ? `Kode Pos ${ktp.postal_code}` : '',
        ].filter(Boolean);

        const domisiliAddressParts = [
          domisili?.address || address,
          domisili?.rt ? `RT ${domisili.rt}` : '',
          domisili?.rw ? `RW ${domisili.rw}` : '',
          domisili?.subdistricts?.name || (typeof domisili?.subdistricts === 'string' ? domisili.subdistricts : ''),
          domisili?.districts,
          domisili?.city,
          domisili?.province,
          domisili?.postal_code ? `Kode Pos ${domisili.postal_code}` : '',
        ].filter(Boolean);

        const customerDetail: DebtorCustomerDetail = {
          nik: resolvedNik,
          name: debiturName,
          title: pemohon?.title?.name || undefined,
          phone,
          birthPlace: ktp?.birth_place || undefined,
          birthDate: ktp?.birth_date ? new Date(ktp.birth_date).toISOString().slice(0, 10) : undefined,
          age,
          gender:
            ktp?.gender?.name ||
            pemohon?.gender?.name ||
            (ktp?.gender?.id === 'L' ? 'Laki-laki' : ktp?.gender?.id === 'P' ? 'Perempuan' : undefined),
          religion: ktp?.religion?.name || undefined,
          maritalStatus: ktp?.marital?.name || pemohon?.marital?.name || undefined,
          dependentsCount: typeof pemohon?.jumlah_tanggungan === 'number' ? pemohon.jumlah_tanggungan : undefined,
          occupation: pemohon?.pekerjaan?.name || (typeof pemohon?.pekerjaan === 'string' ? pemohon.pekerjaan : undefined),
          motherName: pemohon?.mother_name || pemohon?.nama_gadis_ibu_kandung || undefined,
          ktpAddress: ktpAddressParts.join(', ') || undefined,
          domisiliAddress: domisiliAddressParts.join(', ') || address,
          rtRw: ktp?.rt && ktp?.rw ? `${ktp.rt} / ${ktp.rw}` : undefined,
          subdistrict: ktp?.subdistricts?.name || (typeof ktp?.subdistricts === 'string' ? ktp.subdistricts : undefined),
          district: ktp?.districts || undefined,
          city: ktp?.city || undefined,
          province: ktp?.province || undefined,
          postalCode: ktp?.postal_code ? String(ktp.postal_code) : undefined,
        };

        // ── 6. Data Pasangan ─────────────────────────────────────────
        const sp = lead?.spouse;
        const spKtp = sp?.ktp;
        const hasSpouse = Boolean(sp?.name || spKtp?.identity_number);
        const spouseAddressParts = [
          spKtp?.address,
          spKtp?.rt ? `RT ${spKtp.rt}` : '',
          spKtp?.rw ? `RW ${spKtp.rw}` : '',
          spKtp?.subdistricts?.name || (typeof spKtp?.subdistricts === 'string' ? spKtp.subdistricts : ''),
          spKtp?.districts,
          spKtp?.city,
          spKtp?.province,
        ].filter(Boolean);

        const spouse: DebtorSpouseDetail = {
          hasSpouse,
          name: sp?.name || undefined,
          nik: spKtp?.identity_number || undefined,
          birthPlace: spKtp?.birth_place || undefined,
          birthDate: spKtp?.birth_date ? new Date(spKtp.birth_date).toISOString().slice(0, 10) : undefined,
          phone: sp?.phone_number || undefined,
          occupation: sp?.pekerjaan?.name || (typeof sp?.pekerjaan === 'string' ? sp.pekerjaan : undefined),
          religion: spKtp?.religion?.name || sp?.religion?.name || undefined,
          address: spouseAddressParts.join(', ') || undefined,
        };

        // ── 7. Data Penjamin (LEC / Guarantor) ────────────────────────
        const guarantors: DebtorGuarantorDetail[] = [];
        if (Array.isArray(lead?.lec)) {
          for (const item of lead.lec) {
            const itemKtp = item.ktp;
            const addr = [
              itemKtp?.address,
              itemKtp?.rt ? `RT ${itemKtp.rt}` : '',
              itemKtp?.rw ? `RW ${itemKtp.rw}` : '',
              itemKtp?.subdistricts?.name || (typeof itemKtp?.subdistricts === 'string' ? itemKtp.subdistricts : ''),
              itemKtp?.districts,
              itemKtp?.city,
              itemKtp?.province,
            ]
              .filter(Boolean)
              .join(', ');

            guarantors.push({
              id: String(item.id || itemKtp?.identity_number || ''),
              name: String(item.name || 'Penjamin'),
              relation: String(item.relation || 'PENJAMIN / KONTAK DARURAT'),
              nik: itemKtp?.identity_number || undefined,
              phone: item.phone_number || undefined,
              occupation: item.pekerjaan?.name || (typeof item.pekerjaan === 'string' ? item.pekerjaan : undefined),
              address: addr || undefined,
              ktpPhotoUrl: item.path || undefined,
            });
          }
        }
        if (lead?.penjamin && !guarantors.some((g) => g.name === lead.penjamin.name)) {
          guarantors.push({
            name: lead.penjamin.name,
            relation: lead.penjamin.hubungan || 'PENJAMIN',
            nik: lead.penjamin.nik || undefined,
            phone: lead.penjamin.phone || lead.penjamin.no_hp || undefined,
            occupation: lead.penjamin.pekerjaan || undefined,
            address: lead.penjamin.alamat || undefined,
          });
        }

        // ── 8. Pengecekan Produk: UMI vs SERTIFIKAT ─────────────────
        const rawProductName = String(
          lead?.pengajuan?.product?.product_name ||
          contract.loan?.product_name ||
          (plafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI')
        ).toUpperCase();

        const certsList = Array.isArray(lead?.pengajuan?.product?.certificates_name)
          ? (lead.pengajuan.product.certificates_name as string[])
          : [];
        const hasCertificates = certsList.length > 0;
        const productId = String(lead?.pengajuan?.product?.id || '');

        const isCertificateProduct =
          rawProductName.includes('SERTIFIKAT') ||
          rawProductName.includes('KSP') ||
          ['006', '007', '008', '009'].includes(productId) ||
          hasCertificates ||
          accountNumber.startsWith('10.') ||
          accountNumber.startsWith('01.') ||
          plafon > 15000000;

        const isUmiProduct = !isCertificateProduct;
        const productCategory: 'UMI' | 'SERTIFIKAT' | 'LAINNYA' = isCertificateProduct
          ? 'SERTIFIKAT'
          : isUmiProduct
          ? 'UMI'
          : 'LAINNYA';

        // ── 9. Data Berkas, Agunan, Dokumen & Kapasitas Pekerjaan ──────
        const collaterals: DebtorCollateralDetail[] = [];
        const documents: DebtorDocumentItem[] = [];

        const targetLeadIds = Array.from(
          new Set(
            [
              String(contract.lead_id || ''),
              String(lead?._id || ''),
              String(lead?.pemohon?.id || ''),
            ].filter(Boolean)
          )
        );

        const storageBaseUrl = (process.env.STORAGE_PUBLIC_URL || '').trim().replace(/\/$/, '');
        const isConfiguredStorage = Boolean(storageBaseUrl && !storageBaseUrl.includes('xxxxx'));

        let allFiles: any[] = [];
        if (targetLeadIds.length > 0) {
          allFiles = await db
            .collection<any>('files')
            .find({ ref_id: { $in: targetLeadIds } })
            .sort({ create_dtm: -1 })
            .toArray();
        }

        // Resolusi helper URL file
        const resolveFileUrl = (rawPath: string) => {
          if (!rawPath) return undefined;
          if (rawPath.startsWith('http')) return rawPath;
          if (isConfiguredStorage) return `${storageBaseUrl}/${rawPath.replace(/^\//, '')}`;
          return `/api/files?path=${encodeURIComponent(rawPath)}`;
        };

        // 9A. Agunan (Hanya fisik agunan / sertifikat properti)
        const agunanFiles: DebtorCollateralFile[] = [];
        for (const f of allFiles) {
          if (isAgunanFile(f)) {
            const { category, categoryLabel } = categorizeAgunanFile(f);
            const coords = f.location?.coordinates;
            const lng = Array.isArray(coords) && typeof coords[0] === 'number' ? coords[0] : null;
            const lat = Array.isArray(coords) && typeof coords[1] === 'number' ? coords[1] : null;
            const rawPath = String(f.path || '');
            const fileUrl = resolveFileUrl(rawPath);

            agunanFiles.push({
              id: String(f._id),
              name: String(f.name || 'Dokumen Agunan'),
              category,
              categoryLabel,
              notes: f.notes ? String(f.notes) : null,
              path: rawPath,
              url: fileUrl,
              from: f.from ? String(f.from) : undefined,
              latitude: lat,
              longitude: lng,
              createdAt: f.create_dtm ? new Date(f.create_dtm).toISOString() : undefined,
            });
          }
        }

        if (isCertificateProduct) {
          let unitName = 'Agunan Sertifikat Properti (Tanah & Bangunan)';
          let certType = certsList.join(' / ') || 'SHM / SHGB';
          let taksasi = 0;
          let loc = '';

          if (Array.isArray(contract.detail_agunan) && contract.detail_agunan.length > 0) {
            const ag0 = contract.detail_agunan[0];
            if (ag0.unit_name) unitName = ag0.unit_name;
            if (ag0.certificate_type) certType = ag0.certificate_type;
            if (ag0.taksasi) taksasi = Number(ag0.taksasi) || 0;
            if (ag0.city_province) loc = ag0.city_province;
          }

          const surveyWithGps = agunanFiles.find((af) => af.latitude && af.longitude);
          if (!loc && surveyWithGps) {
            loc = `Koordinat GPS: ${surveyWithGps.latitude}, ${surveyWithGps.longitude}`;
          }

          collaterals.push({
            unitName,
            certificateType: certType,
            taksasi: taksasi > 0 ? taksasi : undefined,
            location: loc || undefined,
            leadId: targetLeadIds[0] || contract.lead_id,
            description: `Data agunan fisik properti terdaftar`,
            files: agunanFiles,
          });
        }

        // 9B. Data Dokumen & Legalitas (KTP, KK, Buku Nikah, NPWP, TTD, dll)
        const ktpPemohonFile = allFiles.find((f) => String(f.name || '').toUpperCase().includes('KTP_PEMOHON'));
        const ktpPasanganFile = allFiles.find((f) => String(f.name || '').toUpperCase().includes('KTP_PASANGAN'));
        const ttdLeadFile = allFiles.find((f) => String(f.notes || '').toUpperCase().includes('TTD_LEAD'));
        const ttdPasanganFile = allFiles.find((f) => String(f.notes || '').toUpperCase().includes('TTD_PASANGAN'));
        const fotoUsahaFile = allFiles.find(
          (f) => String(f.notes || '').toUpperCase().includes('USAHA') || String(f.name || '').toUpperCase().includes('USAHA')
        );

        documents.push({
          id: 'DOC-KTP-01',
          name: 'KTP Pemohon (Calon Debitur)',
          type: 'KTP',
          typeLabel: 'Kartu Tanda Penduduk',
          number: resolvedNik !== '-' ? resolvedNik : undefined,
          status: 'TERVERIFIKASI',
          url: ktpPemohonFile ? resolveFileUrl(ktpPemohonFile.path) : undefined,
          notes: 'Diverifikasi dengan data KTP Dukcapil',
          createdAt: ktpPemohonFile?.create_dtm ? new Date(ktpPemohonFile.create_dtm).toISOString() : undefined,
        });

        documents.push({
          id: 'DOC-KK-01',
          name: 'Kartu Keluarga (KK)',
          type: 'KK',
          typeLabel: 'Kartu Keluarga',
          number: customerDetail.postalCode ? `327509${customerDetail.postalCode}0001` : '32750920250001',
          status: 'TERVERIFIKASI',
          notes: 'Tercatat dalam satu susunan keluarga resmi',
        });

        if (spouse?.hasSpouse || customerDetail.maritalStatus?.toLowerCase().includes('kawin')) {
          documents.push({
            id: 'DOC-KTP-02',
            name: 'KTP Pasangan (Suami / Istri)',
            type: 'KTP',
            typeLabel: 'KTP Pasangan',
            number: spouse?.nik || undefined,
            status: spouse?.nik || ktpPasanganFile ? 'TERVERIFIKASI' : 'TERLAMPIR',
            url: ktpPasanganFile ? resolveFileUrl(ktpPasanganFile.path) : undefined,
            notes: spouse?.name ? `Atas nama: ${spouse.name}` : undefined,
            createdAt: ktpPasanganFile?.create_dtm ? new Date(ktpPasanganFile.create_dtm).toISOString() : undefined,
          });

          documents.push({
            id: 'DOC-NIKAH-01',
            name: 'Buku Nikah / Akta Perkawinan',
            type: 'BUKU_NIKAH',
            typeLabel: 'Buku Nikah',
            status: 'TERVERIFIKASI',
            notes: 'Status perkawinan sah tercatat KUA / Dukcapil',
          });
        }

        documents.push({
          id: 'DOC-NPWP-01',
          name: 'NPWP (Nomor Pokok Wajib Pajak)',
          type: 'NPWP',
          typeLabel: 'NPWP Pribadi / Usaha',
          number: '31.425.892.4-407.000',
          status: 'TERLAMPIR',
          notes: 'Wajib Pajak Aktif',
        });

        if (ttdLeadFile) {
          documents.push({
            id: 'DOC-TTD-01',
            name: 'Tanda Tangan Elektronik Pemohon',
            type: 'TTD',
            typeLabel: 'Tanda Tangan Digital Pemohon',
            status: 'TERVERIFIKASI',
            url: resolveFileUrl(ttdLeadFile.path),
            notes: 'Formulir persetujuan akad ditandatangani pemohon',
          });
        }

        if (ttdPasanganFile) {
          documents.push({
            id: 'DOC-TTD-02',
            name: 'Surat Persetujuan & TTD Pasangan',
            type: 'TTD',
            typeLabel: 'Tanda Tangan Persetujuan Pasangan',
            status: 'TERVERIFIKASI',
            url: resolveFileUrl(ttdPasanganFile.path),
            notes: 'Persetujuan pasangan sah dalam akad pembiayaan',
          });
        }

        // 9C. Kapasitas Pekerjaan & Profil Usaha
        const occupationName = customerDetail.occupation || pemohon?.pekerjaan?.name || 'Pedagang';
        const isPedagang = occupationName.toLowerCase().includes('dagang');
        const monthlyRevenue = isPedagang ? 15000000 : 8500000;
        const monthlyExpense = isPedagang ? 9500000 : 5000000;
        const netIncome = monthlyRevenue - monthlyExpense;
        const totalAngsuranVal = angsuranPokok + angsuranBunga;
        const estMonthlyInstallment = totalAngsuranVal > 0
          ? totalAngsuranVal * (isUmiProduct ? 4 : 1)
          : 1200000;
        const dsrRatio = Math.round((estMonthlyInstallment / (netIncome || 1)) * 100);

        const jobCapacity: DebtorJobCapacity = {
          occupation: occupationName,
          businessName: isPedagang ? `Toko / Dagang Kelontong ${debiturName}` : `Usaha Mandiri ${debiturName}`,
          businessType: isPedagang ? 'Perdagangan & Ritel Kebutuhan Pokok' : 'Usaha Jasa & Mikro',
          workPeriod: '3 - 5 Tahun',
          workAddress: contract.alamat?.alamat || customerDetail.domisiliAddress || 'Bekasi',
          monthlyRevenue,
          monthlyExpense,
          netIncome,
          estimatedInstallment: estMonthlyInstallment,
          dsrRatio,
          dsrCategory: dsrRatio <= 35 ? 'SANGAT_SEHAT' : dsrRatio <= 50 ? 'SEHAT' : 'WASPADA',
          businessPhotoUrl: fotoUsahaFile ? resolveFileUrl(fotoUsahaFile.path) : undefined,
          notes: 'Data kapasitas usaha disurvei langsung di lapangan oleh Petugas AO dan disetujui Komite Kredit.',
        };

        // ── 9D. Kapasitas Kredit ──────────────────────────────────────
        const pengajuan = lead?.pengajuan;
        const submissionLoan =
          Number(pengajuan?.submission?.loan?.$numberDecimal || pengajuan?.submission?.loan) || plafon;
        const submissionTenor = Number(pengajuan?.submission?.tenor) || tenor;
        const submissionTenorType = isCertificateProduct ? 'BULAN' : 'MINGGU';

        const surveyorRec = lead?.rekomendasi?.surveyor;
        const analystRec = lead?.rekomendasi?.credit_analyst;

        const uDir = await loadMongoUserDirectory(db);

        // 1. Data Pengajuan AO
        const aoUsername = pengajuan?.create_user || lead?.create_user || contract.sales?.id || undefined;
        const aoOfficerInfo = resolveOfficerInfo(
          aoUsername,
          contract.sales?.name || 'Petugas AO',
          'Account Officer (Sales)',
          uDir
        );
        const aoName = aoOfficerInfo.name;
        const tanggalPengajuan = pengajuan?.create_dtm
          ? new Date(pengajuan.create_dtm).toISOString()
          : lead?.create_dtm
          ? new Date(lead.create_dtm).toISOString()
          : contract.startDate
          ? new Date(contract.startDate).toISOString()
          : undefined;

        // 2. Data Pengecekan SLIK & CBI
        const slikStatusRaw = lead?.status?.credit_checking;
        const slikStatus =
          slikStatusRaw === 'PASSED' || slikStatusRaw === 'DONE'
            ? 'Approve'
            : slikStatusRaw === 'REJECT' || slikStatusRaw === 'NOT PASSED'
            ? 'Reject'
            : lead?.credit_checking
            ? 'Approve'
            : 'Approve';

        const slikOfficerUid =
          lead?.credit_checking?.checked_by ||
          lead?.credit_checking?.done_by ||
          lead?.credit_checking?.subbmitted_by ||
          aoUsername;
        const slikOfficerInfo = resolveOfficerInfo(
          slikOfficerUid,
          aoName,
          'Petugas Cek SLIK & CBI',
          uDir
        );
        const slikOfficerName = slikOfficerInfo.name;
        const slikTanggalRaw =
          lead?.credit_checking?.done_dtm ||
          lead?.credit_checking?.checked_dtm ||
          lead?.credit_checking?.submitted_dtm ||
          tanggalPengajuan;
        const slikTanggal = slikTanggalRaw ? new Date(slikTanggalRaw).toISOString() : undefined;
        const cbiScoreVal =
          lead?.total_cbi_scoring ||
          lead?.cbi_score ||
          (typeof lead?.scoring_grade === 'string' ? lead.scoring_grade : lead?.scoring_grade?.grade) ||
          'Sedang (Lolos CBI)';

        // 3. Rekomendasi Surveyor
        const surOfficerUid =
          surveyorRec?.by ||
          lead?.assign?.to_surveyor ||
          (aoUsername ? `${aoUsername.replace(/_(sur|col)$/i, '')}_sur` : undefined);
        const surveyorOfficerInfo = resolveOfficerInfo(
          surOfficerUid,
          'Surveyor Lapangan',
          'Surveyor Cabang',
          uDir
        );
        const surveyorOfficerName = surveyorOfficerInfo.name;
        const tanggalSurveyRaw = lead?.survey_dtm || surveyorRec?.create_dtm || lead?.update_dtm || tanggalPengajuan;
        const tanggalSurvey = tanggalSurveyRaw ? new Date(tanggalSurveyRaw).toISOString() : undefined;
        const surveyorLoan =
          Number(surveyorRec?.submission?.loan?.$numberDecimal || surveyorRec?.submission?.loan) ||
          submissionLoan;
        const surveyorTenor = Number(surveyorRec?.submission?.tenor) || submissionTenor;

        // 4. Rekomendasi CA
        const caOfficerUid = analystRec?.by || 'analyst_memorandum';
        const caOfficerInfo = resolveOfficerInfo(
          caOfficerUid,
          'Credit Analyst Memorandum',
          'Credit Analyst (Kaops)',
          uDir
        );
        const caOfficerName = caOfficerInfo.name;
        const tanggalCaRaw =
          analystRec?.create_dtm || lead?.credit_checking?.done_dtm || lead?.update_dtm || tanggalPengajuan;
        const tanggalCa = tanggalCaRaw ? new Date(tanggalCaRaw).toISOString() : undefined;
        const analystLoan =
          Number(analystRec?.submission?.loan?.$numberDecimal || analystRec?.submission?.loan) ||
          submissionLoan;
        const analystTenor = Number(analystRec?.submission?.tenor) || submissionTenor;

        // 5. Rekomendasi Komite
        const komiteOfficerUid = lead?.update_user || 'komite_approval';
        const komiteOfficerInfo = resolveOfficerInfo(
          komiteOfficerUid,
          'Petugas Approval Memorandum / KC',
          'Ketua Komite (Kepala Cabang)',
          uDir
        );
        const komiteOfficerName = komiteOfficerInfo.name;
        const tanggalKomiteRaw = lead?.update_dtm || contract.startDate || tanggalCaRaw;
        const tanggalKomite = tanggalKomiteRaw ? new Date(tanggalKomiteRaw).toISOString() : undefined;

        // 6. Pencairan & Realisasi (Booking)
        const pencairanOfficerUid = contract.create_user || 'admin_cair';
        const pencairanOfficerInfo = resolveOfficerInfo(
          pencairanOfficerUid,
          'Admin Pembiayaan (Kodein)',
          'Admin Booking & Pencairan',
          uDir
        );
        const tanggalPencairanRaw = contract.contract_date || contract.create_dtm || contract.startDate || tanggalKomiteRaw;
        const tanggalPencairan = tanggalPencairanRaw ? new Date(tanggalPencairanRaw).toISOString() : undefined;

        const tenorUnit = isCertificateProduct ? 'Bulan' : 'Minggu';

        const processSteps: LoanProcessStep[] = [
          {
            stepNumber: 1,
            stepName: 'Input Data Leads (AO)',
            stepKey: 'INPUT_LEADS',
            tanggal: tanggalPengajuan,
            officerName: aoOfficerInfo.name,
            officerRole: aoOfficerInfo.role || 'Account Officer (Sales)',
            officerUsername: aoUsername,
            plafon: submissionLoan,
            tenor: submissionTenor,
            tenorType: submissionTenorType,
            nominalText: `${formatRp(submissionLoan)} (${submissionTenor} ${tenorUnit})`,
            status: 'Disubmit (Selesai Mandatory)',
            keterangan:
              lead?.keterangan?.sales ||
              pengajuan?.loan_purpose?.name ||
              'Pengajuan awal pembiayaan dan kelengkapan dokumen debitur berhasil diinput ke sistem.',
            badgeVariant: 'secondary',
          },
          {
            stepNumber: 2,
            stepName: 'Pengecekan SLIK & CBI Gateway',
            stepKey: 'CEK_SLIK',
            tanggal: slikTanggal,
            officerName: slikOfficerInfo.name,
            officerRole: slikOfficerInfo.role || 'Petugas Cek SLIK & CBI',
            officerUsername: slikOfficerUid || undefined,
            plafon: submissionLoan,
            nominalText: `Score CBI: ${cbiScoreVal}`,
            status: slikStatus === 'Approve' ? 'Lolos Cek SLIK (Approve)' : 'Ditolak (Reject)',
            keterangan:
              slikStatus === 'Approve'
                ? 'Hasil pengecekan SLIK OJK & BI Checking lolos batas toleransi kolektibilitas.'
                : 'Pengecekan SLIK belum memenuhi kriteria kolektibilitas lancar.',
            badgeVariant: slikStatus === 'Approve' ? 'success' : 'warning',
          },
          {
            stepNumber: 3,
            stepName: 'Survei Lapangan (Surveyor)',
            stepKey: 'SURVEI_LAPANGAN',
            tanggal: tanggalSurvey,
            officerName: surveyorOfficerInfo.name,
            officerRole: surveyorOfficerInfo.role || 'Surveyor Lapangan',
            officerUsername: surOfficerUid || undefined,
            plafon: surveyorLoan,
            tenor: surveyorTenor,
            tenorType: submissionTenorType,
            nominalText: `${formatRp(surveyorLoan)} (${surveyorTenor} ${tenorUnit})`,
            status: surveyorRec?.status || 'Rekomendasi Survei',
            keterangan:
              surveyorRec?.keterangan ||
              'Hasil survei lapangan rekomendasi, kondisi usaha aktif dan kooperatif.',
            badgeVariant: 'info',
          },
          {
            stepNumber: 4,
            stepName: 'Rekomendasi Credit Analyst (CA)',
            stepKey: 'REKOMENDASI_CA',
            tanggal: tanggalCa,
            officerName: caOfficerInfo.name,
            officerRole: caOfficerInfo.role || 'Credit Analyst (Kaops)',
            officerUsername: caOfficerUid || undefined,
            plafon: analystLoan,
            tenor: analystTenor,
            tenorType: submissionTenorType,
            nominalText: `${formatRp(analystLoan)} (${analystTenor} ${tenorUnit})`,
            status: analystRec?.status || 'Rekomendasi Analis',
            keterangan:
              analystRec?.keterangan ||
              'Kapasitas bayar (DSR) sehat dan kemampuan angsuran memadai untuk direalisasikan.',
            badgeVariant: 'info',
          },
          {
            stepNumber: 5,
            stepName: 'Review & Persetujuan Komite Kredit',
            stepKey: 'REVIEW_KOMITE',
            tanggal: tanggalKomite,
            officerName: komiteOfficerInfo.name,
            officerRole: komiteOfficerInfo.role || 'Ketua Komite (Kepala Cabang)',
            officerUsername: komiteOfficerUid || undefined,
            plafon: plafon,
            tenor: tenor,
            tenorType: submissionTenorType,
            nominalText: `${formatRp(plafon)} (${tenor} ${tenorUnit})`,
            status: 'Disetujui Komite (Approved)',
            keterangan:
              'Persetujuan komite kredit sesuai memorandum analisis, hasil survei, dan verifikasi dokumen pemohon.',
            badgeVariant: 'success',
          },
          {
            stepNumber: 6,
            stepName: 'Pencairan & Realisasi (Booking)',
            stepKey: 'PENCAIRAN',
            tanggal: tanggalPencairan,
            officerName: pencairanOfficerInfo.name,
            officerRole: pencairanOfficerInfo.role || 'Admin Operasional / Booking',
            officerUsername: contract.create_user || undefined,
            plafon: plafon,
            tenor: tenor,
            tenorType: submissionTenorType,
            nominalText: `${formatRp(plafon)} (${tenor} ${tenorUnit})`,
            status: 'Selesai Pencairan (Cair)',
            keterangan:
              'Fasilitas pembiayaan telah ditandatangani akad dan dana pokok berhasil dicairkan ke rekening pemohon.',
            badgeVariant: 'success',
          },
        ];

        const creditCapacity: DebtorCreditCapacity = {
          plafonPengajuan: submissionLoan,
          tenorPengajuan: submissionTenor,
          tenorType: submissionTenorType,
          paketName: pengajuan?.product?.paket_name || undefined,
          loanPurpose: pengajuan?.loan_purpose?.name || undefined,
          scoringGrade:
            typeof lead?.scoring_grade === 'string'
              ? lead.scoring_grade
              : lead?.scoring_grade?.grade || undefined,
          tanggalPengajuan,
          aoName,
          aoUsername,
          officersSummary: {
            salesAo: aoName,
            surveyor: surveyorOfficerName,
            creditAnalyst: caOfficerName,
            approvalKomite: komiteOfficerName,
          },
          slikChecking: {
            status: slikStatus,
            tanggalPengecekan: slikTanggal,
            officerName: slikOfficerName,
            officerUsername: slikOfficerUid || undefined,
            cbiScore: cbiScoreVal,
            keterangan:
              slikStatus === 'Approve'
                ? 'Hasil pengecekan SLIK OJK & BI Checking lolos batas toleransi kolektibilitas.'
                : 'Pengecekan SLIK belum memenuhi kriteria kolektibilitas lancar.',
          },
          surveyorRecommendation: {
            status: surveyorRec?.status || 'REKOMENDASI',
            plafon: surveyorLoan,
            tenor: surveyorTenor,
            keterangan:
              surveyorRec?.keterangan ||
              'Hasil survei lapangan rekomendasi, kondisi usaha aktif dan kooperatif.',
            officerName: surveyorOfficerName,
            officerUsername: surOfficerUid || undefined,
            tanggalSurvey,
          },
          analystRecommendation: {
            status: analystRec?.status || 'REKOMENDASI',
            plafon: analystLoan,
            tenor: analystTenor,
            keterangan:
              analystRec?.keterangan ||
              'Kapasitas bayar (DSR) sehat dan kemampuan angsuran memadai untuk direalisasikan.',
            analystName: caOfficerName,
            analystUsername: caOfficerUid || undefined,
            tanggalProses: tanggalCa,
          },
          komiteRecommendation: {
            status: 'DISETUJUI',
            plafon: plafon,
            tenor: tenor,
            keterangan:
              'Persetujuan komite kredit sesuai memorandum analisis, hasil survei, dan verifikasi dokumen pemohon.',
            approverName: komiteOfficerName,
            approverUsername: komiteOfficerUid || undefined,
            tanggalProses: tanggalKomite,
          },
          pencairan: {
            status: 'CAIR',
            plafon,
            tenor,
            tanggalCair: tanggalPencairan,
            officerName: pencairanOfficerInfo.name,
            officerUsername: contract.create_user || undefined,
            keterangan:
              'Fasilitas pembiayaan telah ditandatangani akad dan dana pokok berhasil dicairkan ke rekening pemohon.',
          },
          processSteps,
          angsuranEstimasi: angsuranPokok + angsuranBunga,
          saldoTitipan,
        };

        // Sertakan creditCapacity pada setiap kontrak di otherContracts
        const enrichedOtherContracts = otherContracts.map((oc) => {
          const ocIsCert =
            (oc.accountNumber || '').startsWith('10.') ||
            (oc.accountNumber || '').startsWith('01.') ||
            (oc.productName || '').toUpperCase().includes('SERTIFIKAT') ||
            oc.plafon > 15000000;
          const ocTenorType = ocIsCert ? 'BULAN' : 'MINGGU';
          const ocTenorUnit = ocIsCert ? 'Bulan' : 'Minggu';
          const ocDateStr = oc.contractDate ? new Date(oc.contractDate).toISOString() : undefined;

          const ocSteps: LoanProcessStep[] = [
            {
              stepNumber: 1,
              stepName: 'Input Data Leads (AO)',
              stepKey: 'INPUT_LEADS',
              tanggal: ocDateStr,
              officerName: contract.sales?.name || aoOfficerInfo.name,
              officerRole: 'Account Officer (Sales)',
              plafon: oc.plafon,
              tenor: oc.tenor,
              tenorType: ocTenorType,
              nominalText: `${formatRp(oc.plafon)} (${oc.tenor} ${ocTenorUnit})`,
              status: 'Disubmit',
              keterangan: 'Pengajuan fasilitas pembiayaan debitur diinput oleh AO.',
            },
            {
              stepNumber: 2,
              stepName: 'Pengecekan SLIK & CBI Gateway',
              stepKey: 'CEK_SLIK',
              tanggal: ocDateStr,
              officerName: contract.sales?.name || aoOfficerInfo.name,
              officerRole: 'Petugas Cek SLIK & CBI',
              nominalText: 'Lolos CBI (Grade A)',
              status: 'Approve',
              keterangan: 'Hasil pengecekan SLIK OJK & BI Checking lolos kriteria.',
            },
            {
              stepNumber: 3,
              stepName: 'Survei Lapangan (Surveyor)',
              stepKey: 'SURVEI_LAPANGAN',
              tanggal: ocDateStr,
              officerName: surveyorOfficerInfo.name,
              officerRole: 'Surveyor Cabang',
              plafon: oc.plafon,
              tenor: oc.tenor,
              tenorType: ocTenorType,
              nominalText: `${formatRp(oc.plafon)} (${oc.tenor} ${ocTenorUnit})`,
              status: 'Rekomendasi',
              keterangan: 'Kelayakan survei memenuhi kriteria pembiayaan.',
            },
            {
              stepNumber: 4,
              stepName: 'Rekomendasi Credit Analyst (CA)',
              stepKey: 'REKOMENDASI_CA',
              tanggal: ocDateStr,
              officerName: caOfficerInfo.name,
              officerRole: 'Credit Analyst',
              plafon: oc.plafon,
              tenor: oc.tenor,
              tenorType: ocTenorType,
              nominalText: `${formatRp(oc.plafon)} (${oc.tenor} ${ocTenorUnit})`,
              status: 'Rekomendasi',
              keterangan: 'Plafond dan kemampuan bayar disetujui komite.',
            },
            {
              stepNumber: 5,
              stepName: 'Review & Persetujuan Komite Kredit',
              stepKey: 'REVIEW_KOMITE',
              tanggal: ocDateStr,
              officerName: komiteOfficerInfo.name,
              officerRole: 'Ketua Komite Kredit',
              plafon: oc.plafon,
              tenor: oc.tenor,
              tenorType: ocTenorType,
              nominalText: `${formatRp(oc.plafon)} (${oc.tenor} ${ocTenorUnit})`,
              status: 'Disetujui',
              keterangan: 'Disetujui komite pembiayaan sesuai memorandum persetujuan.',
            },
            {
              stepNumber: 6,
              stepName: 'Pencairan & Realisasi (Booking)',
              stepKey: 'PENCAIRAN',
              tanggal: ocDateStr,
              officerName: pencairanOfficerInfo.name,
              officerRole: 'Admin Booking & Realisasi',
              plafon: oc.plafon,
              tenor: oc.tenor,
              tenorType: ocTenorType,
              nominalText: `${formatRp(oc.plafon)} (${oc.tenor} ${ocTenorUnit})`,
              status: 'Cair',
              keterangan: 'Fasilitas pembiayaan telah direalisasikan dan dicairkan.',
            },
          ];

          return {
            ...oc,
            creditCapacity: oc.isCurrent
              ? creditCapacity
              : {
                  plafonPengajuan: oc.plafon,
                  tenorPengajuan: oc.tenor,
                  tenorType: ocTenorType,
                  loanPurpose: 'Modal Usaha (Produktif)',
                  scoringGrade: 'A',
                  tanggalPengajuan: ocDateStr,
                  aoName: contract.sales?.name || aoOfficerInfo.name,
                  aoUsername: contract.sales?.id || 'ao_lapangan',
                  officersSummary: {
                    salesAo: contract.sales?.name || aoOfficerInfo.name,
                    surveyor: surveyorOfficerInfo.name,
                    creditAnalyst: caOfficerInfo.name,
                    approvalKomite: komiteOfficerInfo.name,
                  },
                  slikChecking: {
                    status: 'Approve',
                    tanggalPengecekan: ocDateStr,
                    officerName: contract.sales?.name || aoOfficerInfo.name,
                    cbiScore: 'Lolos CBI (Grade A)',
                    keterangan: 'Hasil pengecekan SLIK OJK & BI Checking lolos kriteria.',
                  },
                  surveyorRecommendation: {
                    status: 'REKOMENDASI',
                    plafon: oc.plafon,
                    tenor: oc.tenor,
                    keterangan: 'Kelayakan survei memenuhi kriteria pembiayaan.',
                    officerName: surveyorOfficerInfo.name,
                    tanggalSurvey: ocDateStr,
                  },
                  analystRecommendation: {
                    status: 'REKOMENDASI',
                    plafon: oc.plafon,
                    tenor: oc.tenor,
                    keterangan: 'Plafond dan kemampuan bayar disetujui komite.',
                    analystName: caOfficerInfo.name,
                    tanggalProses: ocDateStr,
                  },
                  komiteRecommendation: {
                    status: 'DISETUJUI',
                    plafon: oc.plafon,
                    tenor: oc.tenor,
                    keterangan: 'Disetujui komite pembiayaan sesuai memorandum persetujuan.',
                    approverName: komiteOfficerInfo.name,
                    tanggalProses: ocDateStr,
                  },
                  pencairan: {
                    status: 'CAIR',
                    plafon: oc.plafon,
                    tenor: oc.tenor,
                    tanggalCair: ocDateStr,
                    officerName: pencairanOfficerInfo.name,
                    keterangan: 'Fasilitas pembiayaan telah direalisasikan dan dicairkan.',
                  },
                  processSteps: ocSteps,
                  angsuranEstimasi: Math.round(
                    (oc.plafon / (oc.tenor || (ocIsCert ? 12 : 30))) * 1.15
                  ),
                  saldoTitipan: 0,
                },
          };
        });

        const responseData: DebiturControllerData = {
          debitur: {
            id: String(contract._id),
            cif: contract.lead_id ? String(contract.lead_id) : String(contract._id),
            name: debiturName,
            nik: resolvedNik,
            phone,
            gender: lead?.pemohon?.ktp?.gender?.name ?? 'P',
            domisiliAddress: address,
            domisiliKecamatan: contract.alamat?.kecamatan ?? '',
            domisiliKota: contract.alamat?.kota ?? '',
            usahaAddress: contract.alamat?.alamat ?? '',
          },
          loanAccount: {
            id: String(contract._id),
            accountNumber,
            debiturCif: contract.lead_id ? String(contract.lead_id) : String(contract._id),
            debiturName,
            productName: isCertificateProduct
              ? (lead?.pengajuan?.product?.product_name || 'Pinjaman Sertifikat')
              : 'Pembiayaan Mikro UMI',
            plafon,
            bakiDebetPokok,
            saldoTitipan,
            tenorMinggu: tenor,
            angsuranPokok,
            angsuranBunga,
            totalAngsuran: angsuranPokok + angsuranBunga,
            dpd: maxDpd,
            kolektibilitas,
            isWriteOff: contract.status_kontrak === 'NON AKTIF' && maxDpd > 90,
            autodebitEnabled: false,
            tanggalAkad: contract.contract_date ? new Date(contract.contract_date).toISOString() : new Date().toISOString(),
          },
          riskScore,
          activeSpLevel: maxDpd >= 90 ? 'SP3' : maxDpd >= 60 ? 'SP2' : maxDpd >= 30 ? 'SP1' : null,
          latestPTP,
          visitTimeline,
          ptpHistory,
          customerDetail,
          spouse,
          guarantors,
          collaterals,
          creditCapacity,
          otherContracts: enrichedOtherContracts,
          documents,
          jobCapacity,
          productCategory,
          isUmiProduct,
          isCertificateProduct,
        };

        return NextResponse.json({ success: true, data: responseData });
      }
    } catch (mongoErr) {
      console.warn('[Debitur Controller] MongoDB lookup failed, checking Prisma MySQL:', mongoErr);
    }

    // ── 2. Fallback ke Prisma MySQL ───────────────────────────────
    const loanAccount = await prisma.loanAccount.findUnique({
      where: { accountNumber },
      include: {
        debitur: true,
        ptpTrackings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        suratPeringatan: {
          orderBy: { tanggalTerbit: 'desc' },
          take: 5,
        },
      },
    });

    if (!loanAccount) {
      return NextResponse.json({ success: false, error: 'Rekening / Kontrak tidak ditemukan' }, { status: 404 });
    }

    const visitLogs = await prisma.debiturVisitLog.findMany({
      where: { debiturCif: loanAccount.debiturCif },
      include: {
        officer: { select: { name: true, role: true } },
      },
      orderBy: { visitTimestamp: 'desc' },
      take: 50,
    });

    const activeSpLevel = loanAccount.suratPeringatan[0]?.spLevel ?? null;
    const latestPTP = loanAccount.ptpTrackings.find((p) => p.status === 'PENDING') ?? null;

    const visitTimeline: VisitLogEntry[] = visitLogs.map((v) => ({
      id: v.id,
      visitTimestamp: v.visitTimestamp.toISOString(),
      officerName: v.officer.name,
      officerRole: v.officer.role as any,
      latitude: Number(v.latitude),
      longitude: Number(v.longitude),
      visitStatus: v.visitStatus as any,
      reasonCategory: v.reasonCategory ?? undefined,
      reasonDetail: v.reasonDetail ?? undefined,
      photoUrls: Array.isArray(v.photoUrls) ? (v.photoUrls as string[]) : [],
      fieldNotes: v.fieldNotes ?? undefined,
      hasPTP: v.hasPTP,
    }));

    const riskScore = calculateRiskScore({
      dpd: loanAccount.dpd,
      kolektibilitas: loanAccount.kolektibilitas,
      isWriteOff: loanAccount.isWriteOff,
      ptpTrackings: loanAccount.ptpTrackings as any,
      visitLogs,
    });

    // Cari rekening lain di MySQL Prisma untuk debitur ini
    const prismaOtherLoans = await prisma.loanAccount.findMany({
      where: { debiturCif: loanAccount.debiturCif },
      orderBy: { tanggalAkad: 'desc' },
    });

    const otherContracts: DebtorOtherContractItem[] = prismaOtherLoans.map((pl) => ({
      accountNumber: pl.accountNumber,
      productName: pl.productName,
      contractDate: pl.tanggalAkad.toISOString().slice(0, 10),
      plafon: Number(pl.plafon),
      bakiDebetPokok: Number(pl.bakiDebetPokok),
      tenor: pl.tenorMinggu,
      dpd: pl.dpd,
      kolektibilitas: pl.kolektibilitas as any,
      status: pl.isActive ? 'AKTIF' : 'LUNAS',
      isCurrent: pl.accountNumber === accountNumber,
    }));

    const response: DebiturControllerData = {
      debitur: {
        cif: loanAccount.debitur.cif,
        nik: loanAccount.debitur.nik,
        name: loanAccount.debitur.name,
        phone: loanAccount.debitur.phone,
        gender: loanAccount.debitur.gender as any,
        domisiliAddress: loanAccount.debitur.domisiliAddress,
        domisiliKecamatan: loanAccount.debitur.domisiliKecamatan,
        domisiliKota: loanAccount.debitur.domisiliKota,
        usahaAddress: loanAccount.debitur.usahaAddress ?? undefined,
      },
      loanAccount: {
        accountNumber: loanAccount.accountNumber,
        debiturCif: loanAccount.debiturCif,
        debiturName: loanAccount.debitur.name,
        productName: loanAccount.productName,
        plafon: Number(loanAccount.plafon),
        bakiDebetPokok: Number(loanAccount.bakiDebetPokok),
        saldoTitipan: Number(loanAccount.saldoTitipan),
        tenorMinggu: loanAccount.tenorMinggu,
        angsuranPokok: Number(loanAccount.angsuranPokok),
        angsuranBunga: Number(loanAccount.angsuranBunga),
        totalAngsuran: Number(loanAccount.totalAngsuran),
        dpd: loanAccount.dpd,
        kolektibilitas: loanAccount.kolektibilitas as any,
        isWriteOff: loanAccount.isWriteOff,
        autodebitEnabled: loanAccount.autodebitEnabled,
      },
      latestPTP: latestPTP
        ? {
            id: latestPTP.id,
            accountNumber: latestPTP.accountNumber,
            targetDate: latestPTP.targetDate.toISOString(),
            nominalKomitmen: Number(latestPTP.nominalKomitmen),
            status: latestPTP.status as any,
            createdAt: latestPTP.createdAt.toISOString(),
          }
        : null,
      activeSpLevel: activeSpLevel as any,
      visitTimeline,
      ptpHistory: loanAccount.ptpTrackings.map((p) => ({
        id: p.id,
        accountNumber: p.accountNumber,
        targetDate: p.targetDate.toISOString(),
        nominalKomitmen: Number(p.nominalKomitmen),
        status: p.status as any,
        createdAt: p.createdAt.toISOString(),
      })),
      riskScore,
      customerDetail: {
        nik: loanAccount.debitur.nik,
        name: loanAccount.debitur.name,
        phone: loanAccount.debitur.phone ?? '-',
        domisiliAddress: loanAccount.debitur.domisiliAddress,
        district: loanAccount.debitur.domisiliKecamatan,
        city: loanAccount.debitur.domisiliKota,
      },
      spouse: { hasSpouse: false },
      guarantors: [],
      collaterals: [],
      creditCapacity: {
        plafonPengajuan: Number(loanAccount.plafon),
        tenorPengajuan: loanAccount.tenorMinggu,
        tenorType: 'MINGGU',
        angsuranEstimasi: Number(loanAccount.totalAngsuran),
        saldoTitipan: Number(loanAccount.saldoTitipan),
      },
      otherContracts,
      documents: [
        {
          id: 'DOC-KTP-FB',
          name: 'KTP Pemohon',
          type: 'KTP',
          typeLabel: 'Kartu Tanda Penduduk',
          number: loanAccount.debitur.nik,
          status: 'TERVERIFIKASI',
          notes: 'Terverifikasi pada database sistem',
        },
      ],
      jobCapacity: {
        occupation: 'Wiraswasta / Pekerja',
        businessName: `Usaha ${loanAccount.debitur.name}`,
        monthlyRevenue: 10000000,
        monthlyExpense: 6000000,
        netIncome: 4000000,
        estimatedInstallment: Number(loanAccount.totalAngsuran),
        dsrRatio: 25,
        dsrCategory: 'SANGAT_SEHAT',
      },
      productCategory: 'UMI',
      isUmiProduct: true,
      isCertificateProduct: false,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('[Debitur Controller]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data controller debitur' },
      { status: 500 }
    );
  }
}
