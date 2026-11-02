import { notFound } from 'next/navigation';
import { findMenuItem } from '@/lib/menu';

export default function MenuModulePage({ params }: { params: { slug: string[] } }) {
  const item = findMenuItem(`/${params.slug.join('/')}`);
  if (!item) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-3 px-4 py-6">
      <p className="text-xs text-muted-foreground">{item.trail.join(' / ')}</p>
      <h1 className="text-2xl font-semibold">{item.label}</h1>
      <p className="text-sm text-muted-foreground">
        Menu ini sudah tersedia. Isi modul belum dihubungkan.
      </p>
    </main>
  );
}
