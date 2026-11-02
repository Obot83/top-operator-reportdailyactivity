// top-operator/apps/backoffice/src/lib/formatters.ts

import type { Kolektibilitas } from '@/shared/types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getDpdBadgeVariant(dpd: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (dpd === 0) return 'default';
  if (dpd <= 7) return 'secondary';
  if (dpd <= 30) return 'outline';
  return 'destructive';
}

export const KOLEKTIBILITAS_LABELS: Record<Kolektibilitas, string> = {
  LANCAR: 'Lancar',
  DPK: 'Dalam Perhatian Khusus',
  KURANG_LANCAR: 'Kurang Lancar',
  DIRAGUKAN: 'Diragukan',
  MACET: 'Macet',
};

export function getKolektibilitasLabel(k: Kolektibilitas): string {
  return KOLEKTIBILITAS_LABELS[k] ?? k;
}
