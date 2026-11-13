'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  FileText,
  Folder,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Network,
  Search,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  X,
  Bell,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { menu, type MenuIconName, type MenuNode, findMenuItem } from '@/lib/menu';

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

// Logical enterprise section groupings
const MENU_SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: 'OPERASIONAL & PIPELINE',
    keys: ['Dashboard', 'Leads', 'Sales Report', 'Delegasi', 'Absensi'],
  },
  {
    title: 'PENAGIHAN & KOLEKSI',
    keys: ['Kolektor', 'Collection Report'],
  },
  {
    title: 'CREDIT & PEMBIAYAAN',
    keys: ['Credit Analis', 'Persiapan Pembiayaan', 'Loan Channeling', 'Keuangan'],
  },
  {
    title: 'MONITORING & MASTER',
    keys: ['Analitik', 'Surveyor Report', 'Management Report', 'Master', 'Manajemen User'],
  },
];

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
      <div className="select-none">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
            containsCurrent
              ? 'bg-slate-100 text-slate-900 font-semibold'
              : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
          }`}
          style={{ paddingLeft: depth === 0 ? 10 : 32 + (depth - 1) * 10 }}
          aria-expanded={open}
        >
          {Icon && (
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                containsCurrent ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
          )}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${
              open ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5 border-l border-slate-200/80 ml-5 pl-1.5 py-0.5">
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
      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all ${
        active
          ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-normal'
      }`}
      style={{ paddingLeft: depth === 0 ? 10 : 32 + (depth - 1) * 10 }}
    >
      {Icon && (
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      )}
      {node.featured && !Icon && (
        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
      )}
      <span className="truncate">{node.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
      )}
    </Link>
  );
}

function SidebarNav() {
  const pathname = usePathname();
  const mode = useSearchParams().get('mode');

  // Group menu items into enterprise sections
  const groupedMenu = useMemo(() => {
    const map = new Map<string, MenuNode[]>();
    MENU_SECTIONS.forEach((s) => map.set(s.title, []));
    const unmapped: MenuNode[] = [];

    menu.forEach((node) => {
      let matched = false;
      for (const section of MENU_SECTIONS) {
        if (section.keys.includes(node.label)) {
          map.get(section.title)!.push(node);
          matched = true;
          break;
        }
      }
      if (!matched) unmapped.push(node);
    });

    return { map, unmapped };
  }, []);

  return (
    <nav aria-label="Menu navigasi" className="space-y-4 px-3 pb-6">
      {MENU_SECTIONS.map((section) => {
        const nodes = groupedMenu.map.get(section.title) || [];
        if (nodes.length === 0) return null;
        return (
          <div key={section.title} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {nodes.map((node) => (
                <MenuBranch
                  key={node.href ?? node.label}
                  node={node}
                  depth={0}
                  pathname={pathname}
                  mode={mode}
                />
              ))}
            </div>
          </div>
        );
      })}

      {groupedMenu.unmapped.length > 0 && (
        <div className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
            LAINNYA
          </div>
          <div className="space-y-0.5">
            {groupedMenu.unmapped.map((node) => (
              <MenuBranch
                key={node.href ?? node.label}
                node={node}
                depth={0}
                pathname={pathname}
                mode={mode}
              />
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

// Enterprise Top Navigation Header with Breadcrumbs, Search, System Status, and User Identity
function TopHeader({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const pathname = usePathname();

  const currentItem = useMemo(() => {
    return findMenuItem(pathname);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur px-4 sm:px-6 shadow-2xs">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Buka menu"
          onClick={onOpenMobileMenu}
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <Link
            href="/"
            className="flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">TOP Operator</span>
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
          {currentItem ? (
            <span className="font-semibold text-slate-900 truncate">
              {currentItem.label}
            </span>
          ) : pathname.startsWith('/dashboard/debitur') ? (
            <span className="font-semibold text-slate-900 truncate">
              Debitur Controller 360°
            </span>
          ) : (
            <span className="font-semibold text-slate-900 truncate">
              Dashboard
            </span>
          )}
        </nav>
      </div>

      {/* Right: CBS Gateway Status, Branch Pill, Search, and User Profile */}
      <div className="flex items-center gap-3">
        {/* Core Gateway Status Pill */}
        <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Core CBS Online</span>
        </div>

        {/* Branch / Unit Tag */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span>KSP Nusantara Pusat</span>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-4 w-px bg-slate-200" />

        {/* User Profile Capsule */}
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white shadow-2xs">
            AO
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">Supervisor AO</span>
            <span className="text-[10px] text-slate-500 font-medium">Head Office</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] bg-[#f8fafc]">
      {/* Mobile Backdrop */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-66 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-auto lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-dropdown' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-extrabold shadow-xs transition-transform group-hover:scale-105">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-slate-900">
                  TOP OPERATOR
                </span>
                <span className="rounded-sm bg-blue-100/70 px-1 py-0.2 text-[9px] font-bold text-blue-700">
                  v1.2
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Core Backoffice System
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          <Suspense fallback={<div className="px-4 py-2 text-xs text-slate-400">Memuat menu…</div>}>
            <SidebarNav />
          </Suspense>
        </div>

        {/* Sidebar Footer: System Specs & Logout */}
        <div className="shrink-0 border-t border-slate-200/80 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>MongoDB Connected</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">2026.11</span>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        <TopHeader onOpenMobileMenu={() => setOpen(true)} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
