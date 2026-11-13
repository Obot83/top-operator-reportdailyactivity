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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Daftar Tagihan Harian (DTH)</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Periode tagih <strong className="text-foreground font-mono">{periode}</strong> •{' '}
            <strong className="text-foreground">{tasks.length}</strong> rekening aktif ditugaskan.
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-muted/10">
          Tidak ada daftar tagihan pada periode ini.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 shadow-2xs bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">No. Rekening</th>
                  <th className="px-4 py-3 whitespace-nowrap">Debitur / No. HP</th>
                  <th className="px-4 py-3 whitespace-nowrap">Petugas Kolektor</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total Tagihan</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Status Penagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {tasks.map((task) => {
                  const total = Number(task.tagihanPokok) + Number(task.tagihanBunga) + Number(task.tagihanDenda);
                  return (
                    <tr key={task.id} className="even:bg-muted/[0.12] hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <Link
                          href={`/dashboard/debitur/${encodeURIComponent(task.accountNumber)}`}
                          className="font-semibold text-primary hover:underline text-xs"
                        >
                          {task.accountNumber}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-muted-foreground">{task.loanAccount.dpd} hr</span>
                          <Badge variant={getDpdBadgeVariant(task.loanAccount.dpd)} className="text-[9px] py-0 px-1 font-semibold">
                            {getKolektibilitasLabel(task.loanAccount.kolektibilitas)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-xs">{task.loanAccount.debitur.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{task.loanAccount.debitur.phone ?? '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{task.officer.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-foreground tabular-nums">
                        {formatRupiah(total)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            task.statusBayar === 'SUDAH_BAYAR'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : task.statusBayar === 'JANJI_BAYAR'
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                              : task.statusBayar === 'SUDAH_DIKUNJUNGI'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {STATUS_LABEL[task.statusBayar] ?? task.statusBayar}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
