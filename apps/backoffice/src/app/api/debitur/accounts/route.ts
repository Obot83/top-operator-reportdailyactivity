import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/shared/types';

export const dynamic = 'force-dynamic';

export type DebiturAccountItem = {
  accountNumber: string;
  debitur: {
    name: string;
    cif: string;
    phone: string;
    address: string;
    nik: string;
  };
  collector: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
  };
  plafon: number;
  bakiDebetPokok: number;
  tenor: number;
  dpd: number;
  kolektibilitas: 'LANCAR' | 'DPK' | 'KURANG_LANCAR' | 'DIRAGUKAN' | 'MACET';
  status: string;
  productName: string;
  contractDate: string;
  totalContracts: number;
  activeContractsCount: number;
  closedContractsCount: number;
};

export type DebiturAccountsResponse = {
  accounts: DebiturAccountItem[];
  summary: {
    totalAccounts: number;
    totalPlafon: number;
    totalBakiDebet: number;
    avgDpd: number;
  };
  branches: string[];
  collectors: Array<{ id: string; name: string }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function calculateKolektibilitas(dpd: number): 'LANCAR' | 'DPK' | 'KURANG_LANCAR' | 'DIRAGUKAN' | 'MACET' {
  if (dpd <= 0) return 'LANCAR';
  if (dpd <= 90) return 'DPK';
  if (dpd <= 120) return 'KURANG_LANCAR';
  if (dpd <= 180) return 'DIRAGUKAN';
  return 'MACET';
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DebiturAccountsResponse>>> {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get('q') ?? '').toLowerCase().trim();
    const branchFilter = searchParams.get('branch') ?? 'all';
    const collectorFilter = searchParams.get('collector') ?? 'all';
    const statusFilter = searchParams.get('status') ?? 'all';
    const kolektibilitasFilter = searchParams.get('kolektibilitas') ?? 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(5, parseInt(searchParams.get('limit') ?? '15', 10));

    try {
      const db = await getMongoDb();

      // Query raw contracts from MongoDB (tanpa batasan status di awal agar kita bisa menghitung seluruh kontrak per debitur)
      const baseMongoFilter: any = {};
      if (branchFilter !== 'all') {
        baseMongoFilter['branch.name'] = branchFilter;
      }
      if (collectorFilter !== 'all') {
        baseMongoFilter['assign_to.id'] = collectorFilter;
      }

      // Fetch sample recent contracts
      const rawContracts = await db
        .collection('contract')
        .find(baseMongoFilter, {
          projection: {
            _id: 1,
            contract_date: 1,
            lead_id: 1,
            status_kontrak: 1,
            debitur: 1,
            alamat: 1,
            branch: 1,
            assign_to: 1,
            loan: 1,
            amortisasi: 1,
          },
        })
        .sort({ contract_date: -1 })
        .limit(1000)
        .toArray();

      const branchesSet = new Set<string>();
      const collectorsMap = new Map<string, string>();

      // ── 1. Resolve NIK per contract dari Leads ─────────────
      const leadIds = rawContracts
        .map((c) => c.lead_id)
        .filter((id) => id && String(id).startsWith('D'));

      const leads = await db
        .collection('leads')
        .find(
          { _id: { $in: leadIds } },
          { projection: { _id: 1, 'pemohon.name': 1, 'pemohon.ktp.identity_number': 1 } }
        )
        .toArray();

      const leadIdToNik = new Map<string, string>();
      for (const l of leads) {
        const nik = l.pemohon?.ktp?.identity_number;
        if (nik) leadIdToNik.set(String(l._id), String(nik).trim());
      }

      // Resolusi cadangan berdasarkan nama pemohon jika lead_id tidak langsung match
      const missingNames = Array.from(
        new Set(
          rawContracts
            .filter((c) => !leadIdToNik.has(String(c.lead_id)) && c.debitur?.name)
            .map((c) => String(c.debitur.name).trim())
        )
      );

      const nameToNik = new Map<string, string>();
      if (missingNames.length > 0) {
        const nameLeads = await db
          .collection('leads')
          .find(
            { 'pemohon.name': { $in: missingNames } },
            { projection: { _id: 1, 'pemohon.name': 1, 'pemohon.ktp.identity_number': 1 } }
          )
          .toArray();

        for (const l of nameLeads) {
          const nik = l.pemohon?.ktp?.identity_number;
          const nm = l.pemohon?.name?.trim().toUpperCase();
          if (nik && nm && !nameToNik.has(nm)) {
            nameToNik.set(nm, String(nik).trim());
          }
        }
      }

      // ── 2. Kelompokkan Kontrak per NIK (atau Nama jika NIK belum ada) ─
      type DebtorGroup = {
        key: string;
        nik: string;
        contracts: typeof rawContracts;
      };

      const groupsMap = new Map<string, DebtorGroup>();

      for (const c of rawContracts) {
        const branchName = c.branch?.name ? String(c.branch.name).trim() : 'Pusat';
        if (branchName) branchesSet.add(branchName);

        const collectorId = c.assign_to?.id ? String(c.assign_to.id).trim() : '';
        const collectorName = c.assign_to?.name ? String(c.assign_to.name).trim() : 'Tanpa Kolektor';
        if (collectorId && !collectorsMap.has(collectorId)) {
          collectorsMap.set(collectorId, collectorName);
        }

        const rawName = String(c.debitur?.name ?? '').trim();
        const resolvedNik =
          leadIdToNik.get(String(c.lead_id)) ||
          nameToNik.get(rawName.toUpperCase()) ||
          (c.debitur?.nik ? String(c.debitur.nik).trim() : '');

        // Kunci grouping: NIK jika ada; jika belum ada NIK, gunakan nama debitur; fallback ke _id
        const groupKey = resolvedNik || (rawName ? `NAME:${rawName.toUpperCase()}` : String(c._id));

        let group = groupsMap.get(groupKey);
        if (!group) {
          group = {
            key: groupKey,
            nik: resolvedNik,
            contracts: [],
          };
          groupsMap.set(groupKey, group);
        }
        group.contracts.push(c);
      }

      // ── 3. Bentuk daftar Debitur: Baris utama menampilkan pengajuan TERBARU ─
      const items: DebiturAccountItem[] = [];

      for (const group of groupsMap.values()) {
        // Urutkan seluruh kontrak debitur ini: tgl terbaru dulu, jika tanggal sama dahulukan AKTIF
        group.contracts.sort((a, b) => {
          const dateA = a.contract_date ? new Date(a.contract_date).getTime() : 0;
          const dateB = b.contract_date ? new Date(b.contract_date).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          if (a.status_kontrak === 'AKTIF' && b.status_kontrak !== 'AKTIF') return -1;
          if (b.status_kontrak === 'AKTIF' && a.status_kontrak !== 'AKTIF') return 1;
          return String(b._id).localeCompare(String(a._id));
        });

        const latestContract = group.contracts[0];
        const totalContracts = group.contracts.length;
        const activeContractsCount = group.contracts.filter((c) => c.status_kontrak === 'AKTIF').length;
        const closedContractsCount = group.contracts.filter((c) => c.status_kontrak === 'LUNAS').length;

        let bakiDebet = 0;
        let maxDpd = 0;
        if (Array.isArray(latestContract.amortisasi)) {
          for (const a of latestContract.amortisasi) {
            const pokok = Number(a.pokok) || 0;
            const pokokDibayar = Number(a.pokok_dibayar) || 0;
            if (!a.payment_date && pokok > pokokDibayar) {
              bakiDebet += pokok - pokokDibayar;
            }
            const telat = Number(a.hari_telat_bayar) || 0;
            if (telat > maxDpd) maxDpd = telat;
          }
        } else {
          bakiDebet = Number(latestContract.loan?.nominal_pengajuan) || 0;
        }

        const plafon = Number(latestContract.loan?.nominal_pengajuan) || bakiDebet;
        const tenor = Number(latestContract.loan?.tenor) || 30;
        const kolektibilitas = calculateKolektibilitas(maxDpd);

        const addressParts = [
          latestContract.alamat?.alamat,
          latestContract.alamat?.kelurahan,
          latestContract.alamat?.kecamatan,
          latestContract.alamat?.kota,
          latestContract.alamat?.provinsi,
        ].filter(Boolean);

        const branchName = latestContract.branch?.name ? String(latestContract.branch.name).trim() : 'Pusat';
        const collectorId = latestContract.assign_to?.id ? String(latestContract.assign_to.id).trim() : '';
        const collectorName = latestContract.assign_to?.name ? String(latestContract.assign_to.name).trim() : 'Tanpa Kolektor';

        const item: DebiturAccountItem = {
          accountNumber: String(latestContract._id),
          debitur: {
            name: String(latestContract.debitur?.name ?? 'Tanpa Nama'),
            cif: latestContract.lead_id ? String(latestContract.lead_id) : String(latestContract._id),
            phone: String(latestContract.debitur?.no_hp ?? '-'),
            address: addressParts.join(', ') || '-',
            nik: group.nik || '-',
          },
          collector: {
            id: collectorId,
            name: collectorName,
          },
          branch: {
            id: String(latestContract.branch?.id ?? ''),
            name: branchName,
          },
          plafon,
          bakiDebetPokok: bakiDebet,
          tenor,
          dpd: maxDpd,
          kolektibilitas,
          status: String(latestContract.status_kontrak ?? 'AKTIF'),
          productName: plafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI',
          contractDate: latestContract.contract_date ? new Date(latestContract.contract_date).toISOString().slice(0, 10) : '-',
          totalContracts,
          activeContractsCount,
          closedContractsCount,
        };

        items.push(item);
      }

      // ── 4. Filter by Search Query & Kolektibilitas & Status & Cabang ──
      const filtered = items.filter((acc) => {
        if (kolektibilitasFilter !== 'all' && acc.kolektibilitas !== kolektibilitasFilter) return false;
        if (statusFilter !== 'all' && acc.status !== statusFilter) return false;
        if (branchFilter !== 'all' && acc.branch.name !== branchFilter) return false;
        if (collectorFilter !== 'all' && acc.collector.id !== collectorFilter) return false;
        if (q) {
          const hay = `${acc.accountNumber} ${acc.debitur.name} ${acc.debitur.nik} ${acc.debitur.cif} ${acc.debitur.phone} ${acc.collector.name} ${acc.branch.name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // Calculate Summary metrics per debitur (NIK)
      const totalAccounts = filtered.length;
      const totalPlafon = filtered.reduce((sum, a) => sum + a.plafon, 0);
      const totalBakiDebet = filtered.reduce((sum, a) => sum + a.bakiDebetPokok, 0);
      const avgDpd = totalAccounts > 0 ? Math.round(filtered.reduce((sum, a) => sum + a.dpd, 0) / totalAccounts) : 0;

      // Pagination
      const totalPages = Math.ceil(totalAccounts / limit) || 1;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      const collectors = Array.from(collectorsMap.entries()).map(([id, name]) => ({ id, name }));
      collectors.sort((a, b) => a.name.localeCompare(b.name, 'id'));

      return NextResponse.json({
        success: true,
        data: {
          accounts: paginated,
          summary: {
            totalAccounts,
            totalPlafon,
            totalBakiDebet,
            avgDpd,
          },
          branches: Array.from(branchesSet).sort(),
          collectors,
          pagination: {
            page,
            limit,
            total: totalAccounts,
            totalPages,
          },
        },
      });
    } catch (dbErr) {
      console.warn('[Debitur Accounts API] MongoDB query failed, falling back to Prisma:', dbErr);

      // Fallback to Prisma
      const accounts = await prisma.loanAccount.findMany({
        where: { isActive: true },
        include: { debitur: true },
        take: 50,
      });

      const fallbackItems: DebiturAccountItem[] = accounts.map((a) => ({
        accountNumber: a.accountNumber,
        debitur: {
          name: a.debitur.name,
          cif: a.debiturCif,
          phone: a.debitur.phone ?? '-',
          address: a.debitur.domisiliAddress,
          nik: a.debitur.nik ?? '-',
        },
        collector: { id: '', name: 'Kolektor Lapangan' },
        branch: { id: a.branchId, name: 'Cabang Utama' },
        plafon: Number(a.plafon),
        bakiDebetPokok: Number(a.bakiDebetPokok),
        tenor: a.tenorMinggu,
        dpd: a.dpd,
        kolektibilitas: a.kolektibilitas as any,
        status: a.isActive ? 'AKTIF' : 'NON AKTIF',
        productName: a.productName,
        contractDate: a.tanggalAkad.toISOString().slice(0, 10),
        totalContracts: 1,
        activeContractsCount: a.isActive ? 1 : 0,
        closedContractsCount: a.isActive ? 0 : 1,
      }));

      return NextResponse.json({
        success: true,
        data: {
          accounts: fallbackItems,
          summary: {
            totalAccounts: fallbackItems.length,
            totalPlafon: fallbackItems.reduce((s, a) => s + a.plafon, 0),
            totalBakiDebet: fallbackItems.reduce((s, a) => s + a.bakiDebetPokok, 0),
            avgDpd: fallbackItems.length > 0 ? Math.round(fallbackItems.reduce((s, a) => s + a.dpd, 0) / fallbackItems.length) : 0,
          },
          branches: [],
          collectors: [],
          pagination: { page: 1, limit, total: fallbackItems.length, totalPages: 1 },
        },
      });
    }
  } catch (error) {
    console.error('[Debitur Accounts API]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar rekening debitur' },
      { status: 500 }
    );
  }
}
