import './globals.css';
import { AppShell } from '@/components/app-shell';
import { Providers } from '@/components/providers';

export const metadata = {
  title: 'Top Operator',
  description: 'Back office collection',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
