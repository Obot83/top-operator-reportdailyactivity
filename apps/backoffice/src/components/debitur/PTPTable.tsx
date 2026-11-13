'use client';

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PTPTrackingData } from '@/shared/types';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper<PTPTrackingData>();

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING:  { label: '⏳ Menunggu',    variant: 'secondary' },
  HONORED:  { label: '✅ Terpenuhi',  variant: 'default' },
  BROKEN:   { label: '❌ Dilanggar',  variant: 'destructive' },
};

const columns = [
  columnHelper.accessor('createdAt', {
    header: ({ column }) => (
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()} className="-ml-3 h-8 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Dibuat <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: (info) => <span className="text-xs font-mono text-muted-foreground">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('targetDate', {
    header: () => <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target Bayar</span>,
    cell: (info) => <span className="font-semibold text-xs text-foreground whitespace-nowrap">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('nominalKomitmen', {
    header: () => <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right block">Nominal Komitmen</span>,
    cell: (info) => <span className="font-mono font-semibold text-xs text-foreground text-right block tabular-nums">{formatRupiah(info.getValue())}</span>,
  }),
  columnHelper.accessor('honoredNominal', {
    header: () => <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right block">Realisasi</span>,
    cell: (info) => info.getValue() ? (
      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 text-right block tabular-nums">{formatRupiah(info.getValue()!)}</span>
    ) : <span className="text-muted-foreground text-xs text-right block italic">-</span>,
  }),
  columnHelper.accessor('status', {
    header: () => <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center block">Status</span>,
    cell: (info) => {
      const s = STATUS_BADGE[info.getValue()] ?? { label: info.getValue(), variant: 'outline' as const };
      return (
        <div className="text-center">
          <Badge variant={s.variant} className="text-[10px] font-semibold">{s.label}</Badge>
        </div>
      );
    },
  }),
  columnHelper.accessor('brokenReason', {
    header: () => <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Keterangan</span>,
    cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue() ?? '-'}</span>,
  }),
];

export function PTPTable({ ptpHistory }: { ptpHistory: PTPTrackingData[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const table = useReactTable({
    data: ptpHistory,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (ptpHistory.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/10">
        <p className="text-xs text-muted-foreground">Belum ada riwayat Janji Bayar (PTP) untuk debitur ini.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/80 shadow-2xs overflow-hidden bg-card">
      <div className="bg-muted/40 px-4 py-3 border-b border-border/80 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Riwayat Janji Bayar (Promise to Pay)</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Catatan komitmen dan realisasi pembayaran janji bayar debitur</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
          {ptpHistory.length} Riwayat
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border/80">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="px-3.5 py-2.5">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="even:bg-muted/[0.12] hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3.5 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
