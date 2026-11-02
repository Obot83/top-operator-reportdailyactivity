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
      <Button variant="ghost" size="sm" onClick={() => column.toggleSorting()}>
        Dibuat <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: (info) => <span className="text-xs">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('targetDate', {
    header: 'Target Bayar',
    cell: (info) => <span className="font-medium text-sm">{formatDate(info.getValue())}</span>,
  }),
  columnHelper.accessor('nominalKomitmen', {
    header: 'Nominal Komitmen',
    cell: (info) => <span className="font-mono text-sm">{formatRupiah(info.getValue())}</span>,
  }),
  columnHelper.accessor('honoredNominal', {
    header: 'Realisasi',
    cell: (info) => info.getValue() ? (
      <span className="font-mono text-sm text-green-600">{formatRupiah(info.getValue()!)}</span>
    ) : <span className="text-muted-foreground text-xs">-</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const s = STATUS_BADGE[info.getValue()] ?? { label: info.getValue(), variant: 'outline' as const };
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  }),
  columnHelper.accessor('brokenReason', {
    header: 'Keterangan',
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
      <div className="border rounded-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">Belum ada riwayat Janji Bayar (PTP)</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">Riwayat Janji Bayar (PTP)</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
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
