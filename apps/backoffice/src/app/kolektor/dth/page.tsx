import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { getISOWeekString } from '@/lib/helpers';
import { formatRupiah, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  BELUM_DIKUNJUNGI: 'Belum dikunjungi',
  SUDAH_DIKUNJUNGI: 'Sudah dikunjungi',
  JANJI_BAYAR: 'Janji bayar',
  SUDAH_BAYAR: 'Sudah bayar',
  TIDAK_BISA_BAYAR: 'Tidak bisa bayar',
};

export default async function DaftarTagihanHarianPage() {
  const periode = getISOWeekString(new Date());
  const tasks = await prisma.collectionTask.findMany({
    where: { periodeTagih: periode },
    include: {
      officer: { select: { name: true } },
      loanAccount: {
        include: { debitur: { select: { name: true, phone: true } } },
      },
    },
    orderBy: [{ officer: { name: 'asc' } }, { accountNumber: 'asc' }],
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Daftar Tagihan Harian (DTH)</h1>
        <p className="mt-1 text-sm text-muted-foreground">Periode tagih {periode}. {tasks.length} rekening.</p>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Tidak ada tagihan pada periode ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Rekening</th>
                <th className="px-3 py-2 font-medium">Debitur</th>
                <th className="px-3 py-2 font-medium">Kolektor</th>
                <th className="px-3 py-2 font-medium">Tagihan</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const total = Number(task.tagihanPokok) + Number(task.tagihanBunga) + Number(task.tagihanDenda);
                return (
                  <tr key={task.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <Link
                        href={`/dashboard/debitur/${encodeURIComponent(task.accountNumber)}`}
                        className="font-mono font-medium underline-offset-2 hover:underline"
                      >
                        {task.accountNumber}
                      </Link>
                      <div className="mt-1">
                        <Badge variant={getDpdBadgeVariant(task.loanAccount.dpd)}>
                          {task.loanAccount.dpd} hari · {getKolektibilitasLabel(task.loanAccount.kolektibilitas)}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{task.loanAccount.debitur.name}</div>
                      <div className="text-xs text-muted-foreground">{task.loanAccount.debitur.phone ?? '-'}</div>
                    </td>
                    <td className="px-3 py-2">{task.officer.name}</td>
                    <td className="px-3 py-2 font-mono">{formatRupiah(total)}</td>
                    <td className="px-3 py-2">{STATUS_LABEL[task.statusBayar] ?? task.statusBayar}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
