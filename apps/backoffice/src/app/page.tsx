import { SalesDashboard } from '@/components/dashboard/sales-dashboard';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Utama</h1>
        <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
          Halo, berikut ringkasan statistik performa sales dan aktivitas akun Anda hari ini.
        </p>
      </div>
      <SalesDashboard />
    </main>
  );
}
