import { notFound } from 'next/navigation';
import { findMenuItem } from '@/lib/menu';

export const dynamic = 'force-dynamic';

export default function MenuModulePage({ params }: { params: { slug: string[] } }) {
  const slug = params?.slug || [];
  if (
    slug.length === 0 ||
    slug[0].startsWith('_') ||
    slug[0] === 'api' ||
    slug.some((segment) => segment.includes('.'))
  ) {
    notFound();
  }

  const item = findMenuItem(`/${slug.join('/')}`);
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
