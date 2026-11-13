import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'TOP Operator - Core Backoffice System',
  description: 'Sistem operasional dan monitoring Account Officer & Kolektor KOSPINUS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.className}>
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
