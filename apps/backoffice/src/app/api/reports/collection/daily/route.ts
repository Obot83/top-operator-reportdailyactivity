import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/shared/types';

export type CollectionPaymentRecord = {
  id: string;
  contract_id: string;
  debitur: string;
  no_hp: string;
  collector_id: string;
  collector_name: string;
  branch_id: string;
  branch_name: string;
  tgl_bayar: string;
  _payment_date?: string;
  contract_date?: string;
  telat: number; // DPD
  nominal_dibayar: number;
  total_tagihan: number;
  step_tenor: string;
  tenor: number;
  bucket: string;
  statusBayar: 'SUDAH_BAYAR' | 'PARTIAL' | 'JANJI_BAYAR';
  // GPS & Lokasi Rumah Debitur
  latitude?: number | null;
  longitude?: number | null;
  alamat_rumah?: string | null;
  maps_url?: string | null;
};

export type CollectionSettlementRecord = {
  id: string;
  date: string;
  collector_name: string;
  branch_id: string;
  cash: number;
  tf: number;
  total: number;
  contract_count: number;
};

export type DailyCollectionData = {
  reportDate: string;
  latestActivityDate: string;
  summary: {
    totalDebitur: number;
    totalRealisasi: number;
    totalTagihan: number;
    avgDpd: number;
    activeCollectors: number;
    totalSettlementCash: number;
    totalSettlementTf: number;
    totalSettlement: number;
    by_bucket: Array<{ label: string; count: number; nominal: number }>;
    by_collector: Array<{ collector: string; count: number; nominal: number }>;
    by_branch: Array<{ branch: string; count: number; nominal: number }>;
  };
  payments: CollectionPaymentRecord[];
  settlements: CollectionSettlementRecord[];
  collectors: Array<{ id: string; name: string }>;
  branches: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Compatibility fields
  collectorSummaries: Array<{
    collectorId: string;
    collectorName: string;
    tasks: Array<{
      id: string;
      accountNumber: string;
      debiturName: string;
      dpd: number;
      totalTagihan: number;
      nominalDibayar: number;
      statusBayar: string;
      statusBayarLabel: string;
      tglBayar: string;
      stepTenor: string;
      branchName: string;
    }>;
    totals: {
      totalDebitur: number;
      totalRealisasi: number;
      tagihanPokok: number;
      tagihanBunga: number;
      sudahBayar: number;
      belumDikunjungi: number;
      janjieBayar: number;
    };
  }>;
  grandTotal: {
    totalDebitur: number;
    totalRealisasi: number;
    sudahBayar: number;
    belumDikunjungi: number;
  };
  periodeTagih: string;
  branchCode: string;
};

function getDpdBucket(telat: number): string {
  if (telat <= 0) return 'Lancar (0)';
  if (telat <= 7) return 'DPK 1–7 Hari';
  if (telat <= 14) return 'DPK 8–14 Hari';
  if (telat <= 21) return 'DPK 15–21 Hari';
  if (telat <= 30) return 'DPK 22–30 Hari';
  if (telat <= 60) return 'Kurang Lancar (31–60)';
  if (telat <= 90) return 'Diragukan (61–90)';
  return 'Macet (>90 Hari)';
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DailyCollectionData>>> {
  try {
    const { searchParams } = req.nextUrl;
    let dateStr = searchParams.get('date') ?? '';
    const collectorFilter = searchParams.get('collector') ?? 'all';
    const branchFilter = searchParams.get('branch') ?? 'all';
    const bucketFilter = searchParams.get('bucket') ?? 'all';
    const q = (searchParams.get('q') ?? '').toLowerCase().trim();
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.max(5, parseInt(searchParams.get('limit') ?? '15', 10));

    try {
      const db = await getMongoDb();

      // If no date provided, find the most recent payment date
      let latestActivityDate = '2026-10-01';
      if (!dateStr) {
        const latestDoc = await db
          .collection('v_backoffice_kolektor_angsuran_tertagih_list')
          .find({ tgl_bayar: { $exists: true, $ne: null } }, { projection: { tgl_bayar: 1 } })
          .sort({ tgl_bayar: -1 })
          .limit(1)
          .toArray();

        if (latestDoc[0]?.tgl_bayar) {
          latestActivityDate = String(latestDoc[0].tgl_bayar).slice(0, 10);
        }
        dateStr = latestActivityDate;
      } else {
        latestActivityDate = dateStr;
      }

      const dateQuery = {
        $or: [
          { tgl_bayar: { $regex: `^${dateStr}` } },
          {
            _payment_date: {
              $gte: new Date(`${dateStr}T00:00:00+07:00`),
              $lte: new Date(`${dateStr}T23:59:59.999+07:00`),
            },
          },
        ],
      };

      // Query raw payments, collectors, and settlements in parallel
      const [rawPayments, rawCollectors, rawSettlements] = await Promise.all([
        db.collection('v_backoffice_kolektor_angsuran_tertagih_list').find(dateQuery).toArray(),
        db.collection('v_cbx_kolektor').find().toArray(),
        db
          .collection('vs_kolektor_settlement')
          .find({ 'header.date': { $regex: `^${dateStr}` } })
          .toArray(),
      ]);

      const collectorMap = new Map<string, string>();
      const collectorsList: Array<{ id: string; name: string }> = [];
      for (const c of rawCollectors) {
        if (c.id) {
          const id = String(c.id);
          const name = String(c.text || c.id).trim();
          collectorMap.set(id, name);
          collectorsList.push({ id, name });
        }
      }
      collectorsList.sort((a, b) => a.name.localeCompare(b.name, 'id'));

      const branchesSet = new Set<string>();

      // Transform raw payments
      const allPayments: CollectionPaymentRecord[] = [];
      for (const p of rawPayments) {
        const collectorId = String(p.collector ?? '');
        const collectorName = collectorMap.get(collectorId) ?? collectorId ?? 'Tanpa Kolektor';
        const branchName = String(p.branch_name ?? p.branch_id ?? 'Pusat').trim();
        if (branchName) branchesSet.add(branchName);

        const nominalDibayar = Number(p.nominal_dibayar) || 0;
        const totalTagihan = Number(p.total_tagihan) || nominalDibayar;
        const telat = Number(p.telat) || 0;
        const bucket = getDpdBucket(telat);

        let statusBayar: 'SUDAH_BAYAR' | 'PARTIAL' | 'JANJI_BAYAR' = 'SUDAH_BAYAR';
        if (nominalDibayar < totalTagihan && nominalDibayar > 0) {
          statusBayar = 'PARTIAL';
        }

        allPayments.push({
          id: p._id ? String(p._id) : `${p.contract_id}-${p.tgl_bayar}`,
          contract_id: String(p.contract_id ?? '-'),
          debitur: String(p.debitur ?? '-'),
          no_hp: String(p.no_hp ?? '-'),
          collector_id: collectorId,
          collector_name: collectorName,
          branch_id: String(p.branch_id ?? ''),
          branch_name: branchName,
          tgl_bayar: String(p.tgl_bayar ?? '-'),
          _payment_date: p._payment_date ? new Date(p._payment_date).toISOString() : undefined,
          contract_date: p.contract_date ? String(p.contract_date) : undefined,
          telat,
          nominal_dibayar: nominalDibayar,
          total_tagihan: totalTagihan,
          step_tenor: String(p.step_tenor ?? '-'),
          tenor: Number(p.tenor) || 0,
          bucket,
          statusBayar,
        });
      }

      // Filter payments based on user inputs
      const filteredPayments = allPayments.filter((p) => {
        if (collectorFilter !== 'all' && p.collector_id !== collectorFilter) return false;
        if (branchFilter !== 'all' && p.branch_name !== branchFilter) return false;
        if (bucketFilter !== 'all' && p.bucket !== bucketFilter) return false;
        if (q) {
          const haystack = `${p.contract_id} ${p.debitur} ${p.no_hp} ${p.collector_name} ${p.branch_name} ${p.bucket}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });

      // Calculate summary metrics
      const totalDebitur = filteredPayments.length;
      const totalRealisasi = filteredPayments.reduce((acc, p) => acc + p.nominal_dibayar, 0);
      const totalTagihan = filteredPayments.reduce((acc, p) => acc + p.total_tagihan, 0);
      const avgDpd =
        totalDebitur > 0 ? Math.round(filteredPayments.reduce((acc, p) => acc + p.telat, 0) / totalDebitur) : 0;

      const activeCollectorSet = new Set(filteredPayments.map((p) => p.collector_id).filter(Boolean));

      // Bucket breakdown
      const bucketMap: Record<string, { count: number; nominal: number }> = {};
      for (const p of filteredPayments) {
        if (!bucketMap[p.bucket]) bucketMap[p.bucket] = { count: 0, nominal: 0 };
        bucketMap[p.bucket].count++;
        bucketMap[p.bucket].nominal += p.nominal_dibayar;
      }
      const by_bucket = Object.entries(bucketMap).map(([label, val]) => ({
        label,
        count: val.count,
        nominal: val.nominal,
      }));

      // Collector breakdown
      const collGroupMap: Record<string, { count: number; nominal: number }> = {};
      for (const p of filteredPayments) {
        const name = p.collector_name;
        if (!collGroupMap[name]) collGroupMap[name] = { count: 0, nominal: 0 };
        collGroupMap[name].count++;
        collGroupMap[name].nominal += p.nominal_dibayar;
      }
      const by_collector = Object.entries(collGroupMap)
        .map(([collector, val]) => ({ collector, count: val.count, nominal: val.nominal }))
        .sort((a, b) => b.nominal - a.nominal)
        .slice(0, 10);

      // Branch breakdown
      const branchGroupMap: Record<string, { count: number; nominal: number }> = {};
      for (const p of filteredPayments) {
        const b = p.branch_name;
        if (!branchGroupMap[b]) branchGroupMap[b] = { count: 0, nominal: 0 };
        branchGroupMap[b].count++;
        branchGroupMap[b].nominal += p.nominal_dibayar;
      }
      const by_branch = Object.entries(branchGroupMap)
        .map(([branch, val]) => ({ branch, count: val.count, nominal: val.nominal }))
        .sort((a, b) => b.nominal - a.nominal);

      // Parse settlements
      const settlements: CollectionSettlementRecord[] = rawSettlements.map((s: any) => {
        const cash = Number(s.header?.cash) || 0;
        const tf = Number(s.header?.tf) || 0;
        return {
          id: String(s.header?.id ?? '-'),
          date: String(s.header?.date ?? '-'),
          collector_name: String(s.header?.collector_name ?? '-'),
          branch_id: String(s.header?.branch_id ?? '-'),
          cash,
          tf,
          total: cash + tf,
          contract_count: Array.isArray(s.rows) ? s.rows.length : 0,
        };
      });

      const totalSettlementCash = settlements.reduce((acc, s) => acc + s.cash, 0);
      const totalSettlementTf = settlements.reduce((acc, s) => acc + s.tf, 0);

      // Pagination
      const totalRecords = filteredPayments.length;
      const totalPages = Math.ceil(totalRecords / limit) || 1;
      const paginatedPayments = filteredPayments.slice((page - 1) * limit, page * limit);

      // Enrich paginated payments with GPS location and home address from MongoDB (contract, leads_surveyor, leads)
      let enrichedPayments = paginatedPayments;
      try {
        const contractIds = paginatedPayments.map((p) => p.contract_id).filter(Boolean);
        if (contractIds.length > 0) {
          const contracts = await db
            .collection<any>('contract')
            .find({ _id: { $in: contractIds } })
            .toArray();
          const contractMap = new Map(contracts.map((c: any) => [String(c._id), c]));

          const leadIds = contracts.map((c: any) => c.lead_id).filter(Boolean);
          const [surveyorLeads, regularLeads] = await Promise.all([
            leadIds.length > 0
              ? db
                  .collection<any>('leads_surveyor')
                  .find({ _id: { $in: leadIds } })
                  .toArray()
              : [],
            leadIds.length > 0
              ? db
                  .collection<any>('leads')
                  .find({ _id: { $in: leadIds } })
                  .toArray()
              : [],
          ]);

          const lsMap = new Map(surveyorLeads.map((l: any) => [String(l._id), l]));
          const lMap = new Map(regularLeads.map((l: any) => [String(l._id), l]));

          enrichedPayments = paginatedPayments.map((p) => {
            const contract = contractMap.get(p.contract_id);
            const leadId = contract?.lead_id ? String(contract.lead_id) : null;
            const ls = leadId ? lsMap.get(leadId) : null;
            const l = leadId ? lMap.get(leadId) : null;

            const rawLat =
              ls?.pemohon?.domisili?.latitude ??
              l?.pemohon?.domisili?.latitude ??
              contract?.alamat?.latitude ??
              null;
            const rawLng =
              ls?.pemohon?.domisili?.longitude ??
              l?.pemohon?.domisili?.longitude ??
              contract?.alamat?.longitude ??
              null;

            const alamatRumah =
              contract?.alamat?.alamat ||
              ls?.pemohon?.domisili?.address ||
              l?.pemohon?.domisili?.address ||
              (contract?.alamat
                ? [contract.alamat.kelurahan, contract.alamat.kecamatan, contract.alamat.kota]
                    .filter(Boolean)
                    .join(', ')
                : null);

            const latitude = rawLat != null && !isNaN(Number(rawLat)) ? Number(rawLat) : null;
            const longitude = rawLng != null && !isNaN(Number(rawLng)) ? Number(rawLng) : null;

            const maps_url =
              latitude != null && longitude != null
                ? `https://www.google.com/maps?q=${latitude},${longitude}`
                : alamatRumah
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamatRumah)}`
                : null;

            return {
              ...p,
              alamat_rumah: alamatRumah,
              latitude,
              longitude,
              maps_url,
            };
          });
        }
      } catch (enrichErr) {
        console.error('Error enriching payments with GPS:', enrichErr);
      }

      // Compatibility: Collector Summaries
      const collectorSummaryMap = new Map<string, any>();
      for (const p of filteredPayments) {
        if (!collectorSummaryMap.has(p.collector_id)) {
          collectorSummaryMap.set(p.collector_id, {
            collectorId: p.collector_id,
            collectorName: p.collector_name,
            tasks: [],
            totals: {
              totalDebitur: 0,
              totalRealisasi: 0,
              tagihanPokok: 0,
              tagihanBunga: 0,
              sudahBayar: 0,
              belumDikunjungi: 0,
              janjieBayar: 0,
            },
          });
        }
        const item = collectorSummaryMap.get(p.collector_id);
        item.totals.totalDebitur++;
        item.totals.totalRealisasi += p.nominal_dibayar;
        item.totals.sudahBayar++;
        item.tasks.push({
          id: p.id,
          accountNumber: p.contract_id,
          debiturName: p.debitur,
          dpd: p.telat,
          totalTagihan: p.total_tagihan,
          nominalDibayar: p.nominal_dibayar,
          statusBayar: p.statusBayar,
          statusBayarLabel: p.statusBayar === 'SUDAH_BAYAR' ? 'Sudah Bayar' : 'Bayar Sebagian',
          tglBayar: p.tgl_bayar,
          stepTenor: p.step_tenor,
          branchName: p.branch_name,
        });
      }

      const collectorSummaries = Array.from(collectorSummaryMap.values());

      return NextResponse.json({
        success: true,
        data: {
          reportDate: dateStr,
          latestActivityDate,
          summary: {
            totalDebitur,
            totalRealisasi,
            totalTagihan,
            avgDpd,
            activeCollectors: activeCollectorSet.size,
            totalSettlementCash,
            totalSettlementTf,
            totalSettlement: totalSettlementCash + totalSettlementTf,
            by_bucket,
            by_collector,
            by_branch,
          },
          payments: enrichedPayments,
          settlements,
          collectors: collectorsList,
          branches: Array.from(branchesSet).sort(),
          pagination: {
            page,
            limit,
            total: totalRecords,
            totalPages,
          },
          collectorSummaries,
          grandTotal: {
            totalDebitur,
            totalRealisasi,
            sudahBayar: totalDebitur,
            belumDikunjungi: 0,
          },
          periodeTagih: dateStr,
          branchCode: branchFilter,
        },
      });
    } catch (dbErr) {
      console.warn('[Collection Daily] Live MongoDB query failed, trying Prisma fallback:', dbErr);

      // Fallback to Prisma if MySQL has collection tasks
      const tasks = await prisma.collectionTask.findMany({
        include: {
          officer: { select: { id: true, name: true } },
          loanAccount: {
            include: {
              debitur: { select: { name: true, phone: true } },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          reportDate: dateStr,
          latestActivityDate: dateStr,
          summary: {
            totalDebitur: tasks.length,
            totalRealisasi: 0,
            totalTagihan: 0,
            avgDpd: 0,
            activeCollectors: 0,
            totalSettlementCash: 0,
            totalSettlementTf: 0,
            totalSettlement: 0,
            by_bucket: [],
            by_collector: [],
            by_branch: [],
          },
          payments: [],
          settlements: [],
          collectors: [],
          branches: [],
          pagination: { page: 1, limit, total: tasks.length, totalPages: 1 },
          collectorSummaries: [],
          grandTotal: { totalDebitur: tasks.length, totalRealisasi: 0, sudahBayar: 0, belumDikunjungi: tasks.length },
          periodeTagih: dateStr,
          branchCode: 'ALL',
        },
      });
    }
  } catch (error) {
    console.error('[Collection Daily Report]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil laporan collection harian' },
      { status: 500 }
    );
  }
}
