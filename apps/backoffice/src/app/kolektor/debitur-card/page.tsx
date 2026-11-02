import { AccountList } from '@/components/account-list';

export const dynamic = 'force-dynamic';

export default function DebiturCardControllerPage() {
  return (
    <AccountList
      title="Debitur Card Controller"
      description="Penanganan operasional debitur: kunjungan, janji bayar, surat peringatan, dan eskalasi."
    />
  );
}
