import { AccountList } from '@/components/account-list';

export const dynamic = 'force-dynamic';

export default function MasterRekeningPage() {
  return (
    <AccountList
      title="Rekening"
      description="Master rekening pembiayaan yang sedang aktif."
    />
  );
}
