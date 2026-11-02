// top-operator/apps/backoffice/src/app/api/mobile/collection/dth/route.ts
// Endpoint mobile: ambil Daftar Tagihan Harian (DTH) milik collector yang sedang login

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import type { CollectionTaskEntry, ApiResponse } from '@/shared/types';

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<CollectionTaskEntry[]>>> {
  try {
    const officerId = req.headers.get('x-user-id') ?? '';
    if (!officerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const periodeTagih = getISOWeekString(new Date());

    const tasks = await prisma.collectionTask.findMany({
      where: { officerId, periodeTagih },
      include: {
        loanAccount: {
          include: {
            debitur: {
              select: {
                name: true,
                phone: true,
                domisiliAddress: true,
                defaultLatitude: true,
                defaultLongitude: true,
              },
            },
            ptpTrackings: {
              where: { status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ loanAccount: { dpd: 'desc' } }],
    });

    const data: CollectionTaskEntry[] = tasks.map((task) => {
      const loan = task.loanAccount;
      const debitur = loan.debitur;
      const activePTP = loan.ptpTrackings[0] ?? null;

      return {
        id: task.id,
        loanAccountId: loan.id,
        accountNumber: loan.accountNumber,
        debiturNama: debitur.name,
        nomorHP: debitur.phone ?? null,
        alamatDomisili: debitur.domisiliAddress,
        defaultLatitude: debitur.defaultLatitude ?? null,
        defaultLongitude: debitur.defaultLongitude ?? null,
        dpd: loan.dpd,
        kolektibilitas: loan.kolektibilitas as any,
        tagihanPokok: Number(task.tagihanPokok),
        tagihanBunga: Number(task.tagihanBunga),
        tagihanDenda: Number(task.tagihanDenda),
        tagihanTitipan: Number(task.tagihanTitipan),
        totalTagihan:
          Number(task.tagihanPokok) +
          Number(task.tagihanBunga) +
          Number(task.tagihanDenda) +
          Number(task.tagihanTitipan),
        statusBayar: task.statusBayar as any,
        ptpAktif: activePTP
          ? {
              targetTanggal: activePTP.targetDate.toISOString(),
              nominalKomitmen: Number(activePTP.nominalKomitmen),
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Mobile DTH]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar tagihan harian' },
      { status: 500 }
    );
  }
}

function getISOWeekString(date: Date): string {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
