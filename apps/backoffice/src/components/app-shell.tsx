'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Clock,
  Crosshair,
  FileText,
  Folder,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Network,
  Settings,
  Star,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { menu, type MenuIconName, type MenuNode } from '@/lib/menu';

const MENU_ICONS: Record<MenuIconName, LucideIcon> = {
  dashboard: LayoutGrid,
  leads: Crosshair,
  credit: Settings,
  delegasi: ArrowRight,
  absensi: Clock,
  kolektor: MapPin,
  pembiayaan: FileText,
  channeling: Network,
  keuangan: Building2,
  master: Folder,
  analitik: TrendingUp,
  report: FileText,
  users: Users,
};

function isCurrent(href: string, pathname: string, mode: string | null) {
  if (href === '/') return pathname === '/';
  if (pathname.startsWith('/dashboard/debitur')) {
    if (href === '/collection-report/debitur-card') return mode === 'monitor';
    if (href === '/kolektor/debitur-card') return mode !== 'monitor';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasCurrent(node: MenuNode, pathname: string, mode: string | null): boolean {
  if (node.href && isCurrent(node.href, pathname, mode)) return true;
  return node.children?.some((child) => groupHasCurrent(child, pathname, mode)) ?? false;
}

function MenuBranch({
  node,
  depth,
  pathname,
  mode,
}: {
  node: MenuNode;
  depth: number;
  pathname: string;
  mode: string | null;
}) {
  const containsCurrent = node.children ? groupHasCurrent(node, pathname, mode) : false;
  const [open, setOpen] = useState(containsCurrent);
  const active = node.href ? isCurrent(node.href, pathname, mode) : false;
  const Icon = depth === 0 && node.icon ? MENU_ICONS[node.icon] : null;

  useEffect(() => {
    if (containsCurrent) setOpen(true);
  }, [containsCurrent]);

  if (node.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${containsCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
          style={{ paddingLeft: depth === 0 ? 8 : 36 + (depth - 1) * 12 }}
          aria-expanded={open}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1 leading-snug">{node.label}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <MenuBranch
                key={child.href ?? child.label}
                node={child}
                depth={depth + 1}
                pathname={pathname}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={node.href ?? '/'}
      aria-current={active ? 'page' : undefined}
      className={`flex items-start gap-3 rounded-md px-2 py-2 text-sm leading-snug ${active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
      style={{ paddingLeft: depth === 0 ? 8 : 36 + (depth - 1) * 12 }}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" />}
      {node.featured && !Icon && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-amber-500" />}
      <span>{node.label}</span>
    </Link>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const mode = useSearchParams().get('mode');

  return (
    <nav aria-label="Menu utama" className="space-y-0.5 px-2 pb-6">
      {menu.map((node) => (
        <MenuBranch key={node.href ?? node.label} node={node} depth={0} pathname={pathname} mode={mode} />
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-card transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <Link href="/" className="text-sm font-bold tracking-wide">
            BACK OFFICE
          </Link>
          <button type="button" className="rounded-md p-1 hover:bg-muted lg:hidden" aria-label="Tutup menu" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">
          <Suspense fallback={<div className="px-4 py-2 text-sm text-muted-foreground">Memuat menu…</div>}>
            <SidebarNav />
          </Suspense>
        </div>
        <div className="shrink-0 border-t px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log Out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 lg:hidden">
          <button type="button" className="rounded-md p-1 hover:bg-muted" aria-label="Buka menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold tracking-wide">BACK OFFICE</span>
        </div>
        {children}
      </div>
    </div>
  );
}
