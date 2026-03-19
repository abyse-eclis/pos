"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  accent: string;
  match?: (pathname: string) => boolean;
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/",
    label: "ขายสินค้า",
    icon: "S",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    href: "/stock/warehouse",
    label: "สต๊อก",
    icon: "T",
    accent: "from-emerald-400 to-teal-500",
    match: (pathname) => pathname.startsWith("/stock") || pathname.startsWith("/withdraw"),
  },
  {
    href: "/products",
    label: "สินค้า",
    icon: "P",
    accent: "from-indigo-400 to-sky-500",
  },
  {
    href: "/cash-count",
    label: "นับเงิน",
    icon: "C",
    accent: "from-amber-400 to-orange-500",
  },
  {
    href: "/summary",
    label: "สรุปยอด",
    icon: "R",
    accent: "from-fuchsia-400 to-pink-500",
  },
  {
    href: "/docs",
    label: "คู่มือ",
    icon: "D",
    accent: "from-slate-300 to-slate-500",
  },
];

const STOCK_NAV: NavItem[] = [
  {
    href: "/stock/warehouse",
    label: "คลังร้าน",
    icon: "W",
    accent: "from-sky-400 to-cyan-500",
  },
  {
    href: "/stock/storefront",
    label: "หน้าร้าน",
    icon: "F",
    accent: "from-emerald-400 to-lime-500",
  },
  {
    href: "/stock/comparison",
    label: "เปรียบเทียบ",
    icon: "V",
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    href: "/stock/closeout",
    label: "ปิดรอบ",
    icon: "X",
    accent: "from-rose-400 to-orange-500",
  },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href;
}

function NavLink({
  item,
  pathname,
  compact = false,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const active = isActive(item, pathname);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all ${
        active
          ? "border-white/15 bg-white/[0.08] text-white shadow-[0_16px_40px_-20px_rgba(15,23,42,0.85)]"
          : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
      } ${compact ? "justify-center px-2" : ""}`}
      title={item.label}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br ${item.accent} text-sm font-black shadow-lg shadow-black/30`}
      >
        {item.icon}
      </span>
      {!compact && (
        <div className="min-w-0">
          <p className="truncate text-base font-black tracking-tight">{item.label}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {active ? "Active" : "Open"}
          </p>
        </div>
      )}
    </Link>
  );
}

function SidebarContent({
  pathname,
  compact = false,
  onNavigate,
}: {
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const showStockNav = pathname.startsWith("/stock") || pathname.startsWith("/withdraw");

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-blue-600 text-lg font-black shadow-[0_20px_50px_-20px_rgba(34,211,238,0.7)]">
          Q
        </div>
        {!compact && (
          <div>
            <p className="text-xl font-black tracking-tight text-white">QuickPOS</p>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Store Console
            </p>
          </div>
        )}
      </div>

      <nav className="mt-6 space-y-2">
        {MAIN_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            compact={compact}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {showStockNav && (
        <div className="mt-6 rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-3">
          {!compact && (
            <p className="mb-3 px-2 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              Stock Workspace
            </p>
          )}
          <div className="space-y-2">
            {STOCK_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                compact={compact}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white md:max-h-screen md:overflow-hidden">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[300px] md:border-r md:border-white/[0.06] md:bg-[#0a0f18]/95 md:backdrop-blur-2xl">
        <div className="h-full w-full p-4">
          <SidebarContent pathname={pathname} />
        </div>
      </div>

      <div className="md:hidden">
        <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0b0f19]/95 backdrop-blur-2xl">
          <div className="px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black tracking-tight text-white">{title}</p>
                {subtitle && <p className="truncate text-sm text-slate-400">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xl"
              >
                ≡
              </button>
            </div>
            {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="absolute inset-y-0 left-0 flex w-[88vw] max-w-[360px] flex-col border-r border-white/[0.06] bg-[#0a0f18] shadow-2xl"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
                <div className="min-w-0">
                  <p className="text-lg font-black tracking-tight text-white">QuickPOS</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Navigation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xl text-white"
                >
                  ×
                </button>
              </div>
              <div
                className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="md:pl-[300px]">
        <div className="hidden items-center justify-between border-b border-white/[0.06] bg-[#0b0f19]/85 px-6 py-4 backdrop-blur-2xl md:flex lg:px-10">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-black tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1 truncate text-base text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        <div className="px-4 py-4 pb-6 sm:px-6 md:px-6 lg:px-10 lg:py-6">{children}</div>
      </div>
    </div>
  );
}
