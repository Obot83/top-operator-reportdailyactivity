import { SalesDashboard } from '@/components/dashboard/sales-dashboard';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SalesDashboard />
      </div>
    </main>
  );
}
