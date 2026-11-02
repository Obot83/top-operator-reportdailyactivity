import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/shared/types';

export type DebiturAccountItem = {
  accountNumber: string;
  debitur: {
    name: string;
    cif: string;
    phone: string;
    address: string;
    nik?: string;
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

      // Query raw contracts from MongoDB
      const filterQuery: any = {};
      if (statusFilter !== 'all') {
        filterQuery.status_kontrak = statusFilter;
      }
      if (branchFilter !== 'all') {
        filterQuery['branch.name'] = branchFilter;
      }
      if (collectorFilter !== 'all') {
        filterQuery['assign_to.id'] = collectorFilter;
      }

      // Fetch sample of recent contracts (limit up to 1000 for rapid client filtering & sorting)
      const rawContracts = await db
        .collection('contract')
        .find(filterQuery, {
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

      const items: DebiturAccountItem[] = [];

      for (const c of rawContracts) {
        const branchName = c.branch?.name ? String(c.branch.name).trim() : 'Pusat';
        if (branchName) branchesSet.add(branchName);

        const collectorId = c.assign_to?.id ? String(c.assign_to.id).trim() : '';
        const collectorName = c.assign_to?.name ? String(c.assign_to.name).trim() : 'Tanpa Kolektor';
        if (collectorId && !collectorsMap.has(collectorId)) {
          collectorsMap.set(collectorId, collectorName);
        }

        let bakiDebet = 0;
        let maxDpd = 0;
        if (Array.isArray(c.amortisasi)) {
          for (const a of c.amortisasi) {
            const pokok = Number(a.pokok) || 0;
            const pokokDibayar = Number(a.pokok_dibayar) || 0;
            if (!a.payment_date && pokok > pokokDibayar) {
              bakiDebet += pokok - pokokDibayar;
            }
            const telat = Number(a.hari_telat_bayar) || 0;
            if (telat > maxDpd) maxDpd = telat;
          }
        } else {
          bakiDebet = Number(c.loan?.nominal_pengajuan) || 0;
        }

        const plafon = Number(c.loan?.nominal_pengajuan) || bakiDebet;
        const tenor = Number(c.loan?.tenor) || 30;
        const kolektibilitas = calculateKolektibilitas(maxDpd);

        const addressParts = [
          c.alamat?.alamat,
          c.alamat?.kelurahan,
          c.alamat?.kecamatan,
          c.alamat?.kota,
          c.alamat?.provinsi,
        ].filter(Boolean);

        const item: DebiturAccountItem = {
          accountNumber: String(c._id),
          debitur: {
            name: String(c.debitur?.name ?? 'Tanpa Nama'),
            cif: c.lead_id ? String(c.lead_id) : String(c._id),
            phone: String(c.debitur?.no_hp ?? '-'),
            address: addressParts.join(', ') || '-',
          },
          collector: {
            id: collectorId,
            name: collectorName,
          },
          branch: {
            id: String(c.branch?.id ?? ''),
            name: branchName,
          },
          plafon,
          bakiDebetPokok: bakiDebet,
          tenor,
          dpd: maxDpd,
          kolektibilitas,
          status: String(c.status_kontrak ?? 'AKTIF'),
          productName: plafon > 15000000 ? 'Pinjaman Sertifikat' : 'Pembiayaan Mikro UMI',
          contractDate: c.contract_date ? new Date(c.contract_date).toISOString().slice(0, 10) : '-',
        };

        items.push(item);
      }

      // Filter by Search Query & Kolektibilitas
      const filtered = items.filter((acc) => {
        if (kolektibilitasFilter !== 'all' && acc.kolektibilitas !== kolektibilitasFilter) return false;
        if (q) {
          const hay = `${acc.accountNumber} ${acc.debitur.name} ${acc.debitur.cif} ${acc.debitur.phone} ${acc.collector.name} ${acc.branch.name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      // Calculate Summary metrics
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
