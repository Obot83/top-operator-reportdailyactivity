// top-operator/apps/backoffice/src/lib/helpers.ts

import { prisma } from './prisma';
import type { Kolektibilitas } from '@/shared/types';

export function getISOWeekString(date: Date): string {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getDpdBucket(dpd: number): '1-7' | '8-14' | '15-30' | '>30' {
  if (dpd <= 7) return '1-7';
  if (dpd <= 14) return '8-14';
  if (dpd <= 30) return '15-30';
  return '>30';
}

export async function generateSPNumber(spLevel: string, branchId: string): Promise<string> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } });
  const branchCode = branch?.code ?? 'UNKN';
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  // Count existing SPs this month for sequence
  const count = await prisma.suratPeringatan.count({
    where: {
      loanAccount: { branchId },
      tanggalTerbit: {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${spLevel}/${yy}/${mm}/${branchCode}/${seq}`;
}
