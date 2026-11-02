import { AccountList } from '@/components/account-list';

export const dynamic = 'force-dynamic';

export default function DebiturCardMonitoringPage() {
  return (
    <AccountList
      title="Debitur Card Controller (Read-Only / Monitoring)"
      description="Pemantauan kartu debitur. Tindakan operasional tidak tersedia di tampilan ini."
      monitor
    />
  );
}
