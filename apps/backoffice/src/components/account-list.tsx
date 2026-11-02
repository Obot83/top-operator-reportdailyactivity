import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AccountSearch } from '@/components/account-search';
import { Badge } from '@/components/ui/badge';
import { formatRupiah, getDpdBadgeVariant, getKolektibilitasLabel } from '@/lib/formatters';

export async function AccountList({
  title,
  description,
  monitor = false,
}: {
  title: string;
  description: string;
  monitor?: boolean;
}) {
  const accounts = await prisma.loanAccount.findMany({
    where: { isActive: true },
    orderBy: [{ dpd: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
    include: { debitur: { select: { name: true, cif: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <AccountSearch monitor={monitor} />

      {accounts.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Belum ada rekening aktif.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Rekening</th>
                <th className="px-3 py-2 font-medium">Debitur</th>
                <th className="px-3 py-2 font-medium">Baki debet</th>
                <th className="px-3 py-2 font-medium">DPD</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const href = monitor
                  ? `/dashboard/debitur/${encodeURIComponent(account.accountNumber)}?mode=monitor`
                  : `/dashboard/debitur/${encodeURIComponent(account.accountNumber)}`;
                return (
                  <tr key={account.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <Link href={href} className="font-mono text-sm font-medium underline-offset-2 hover:underline">
                        {account.accountNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div>{account.debitur.name}</div>
                      <div className="text-xs text-muted-foreground">{account.debitur.cif}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">{formatRupiah(Number(account.bakiDebetPokok))}</td>
                    <td className="px-3 py-2">
                      <div>{account.dpd} hari</div>
                      <Badge variant={getDpdBadgeVariant(account.dpd)} className="mt-1">
                        {getKolektibilitasLabel(account.kolektibilitas)}
                      </Badge>
                    </td>
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
