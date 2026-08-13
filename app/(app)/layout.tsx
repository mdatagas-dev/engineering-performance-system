"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import SessionClock from "@/components/session-clock";
import ThemeToggle from "@/components/theme-toggle";
import PageTransition from "@/components/page-transition";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { clearMockSession } from "@/lib/mocks/accounts";
import { resolveSessionMenu } from "@/lib/auth/menu";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ENGINEERING_MANAGER: "Engineering Manager",
  ENGINEERING_STAFF: "Engineering Staff",
  VIEWER: "Viewer",
};

const SIDEBAR_KEY = "eps_sidebar_open";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SIDEBAR_KEY) !== "0";
  });
  const session = useSessionGuard();

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Memeriksa sesi...</p>
      </div>
    );
  }

  const { user } = session;
  const roleLabel = ROLE_LABELS[user.role.name] ?? user.role.name;
  // Menu dihitung FRESH dari user (bukan session.menu tersimpan di localStorage
  // yang bisa basi setelah struktur menu berubah) — perubahan menu langsung
  // terlihat tanpa harus logout/login ulang.
  const menu = resolveSessionMenu(user);

  function toggleSidebar() {
    setSidebarOpen((open) => {
      if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_KEY, open ? "0" : "1");
      return !open;
    });
  }

  function handleLogout() {
    clearMockSession();
    router.replace("/login");
  }

  function isActive(href?: string) {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeSidebarOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023.98px)").matches) {
      setSidebarOpen(false);
    }
  }

  const linkCls = (href?: string) =>
    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.98] ${
      isActive(href)
        ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
        : "text-slate-600 hover:bg-slate-950/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
    }`;

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
      {menu.map((item) =>
        item.children ? (
          <div key={item.key} className="mb-3">
            <p className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
              {item.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {item.children.map((child) => (
                <Link
                  key={child.key}
                  href={child.href ?? "#"}
                  className={linkCls(child.href)}
                  onClick={closeSidebarOnMobile}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link
            key={item.key}
            href={item.href ?? "#"}
            onClick={closeSidebarOnMobile}
            className={`${linkCls(item.href)} mb-0.5 ${item.icon ? "justify-between" : ""}`}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-950/10 px-5 py-4 dark:border-white/10">
        <Link
          href="/"
          className="block h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
        </Link>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-mono text-sm font-semibold tracking-wide">Engineering Production System</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{roleLabel}</p>
        </div>
      </div>

      {nav}

      <div className="border-t border-slate-950/10 px-4 py-4 dark:border-white/10">
        <div className="mb-3 flex items-center gap-2 rounded-full border border-slate-950/10 py-1 pr-3 pl-1 dark:border-white/10">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-500/20 font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
            {initials(user.name)}
          </span>
          <span className="min-w-0 truncate text-xs font-medium">{user.name}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-950/15 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh min-w-0 flex-1 overflow-hidden">
      {/* Sidebar — selalu fixed overlay di semua ukuran; konten geser via margin di lg. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-950/10 bg-white/70 backdrop-blur-md transition-transform duration-300 ease-in-out will-change-transform dark:border-white/10 dark:bg-[#0a0f15]/90 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Backdrop — hanya mobile; selalu ter-render agar fade keluar mulus */}
      <button
        type="button"
        aria-label="Tutup sidebar"
        tabIndex={sidebarOpen ? 0 : -1}
        onClick={toggleSidebar}
        className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <header className="border-b border-slate-950/10 bg-white/60 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0f15]/60">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 lg:px-6">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
              title={sidebarOpen ? "Sembunyikan menu" : "Tampilkan menu"}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-950/10 text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <SessionClock />
              <ThemeToggle />
              <div className="hidden items-center gap-2 rounded-full border border-slate-950/10 py-1 pr-3 pl-1 sm:flex dark:border-white/10">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500/20 font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                  {initials(user.name)}
                </span>
                <span className="text-xs font-medium">{user.name}</span>
              </div>
            </div>
          </div>
        </header>

        <PageTransition>{children}</PageTransition>

        <footer className="py-4 text-center text-[11px] text-slate-500 dark:text-slate-500">
          EPS v2 · Engineering Production System · frontend-first (data mock, menunggu backend DB)
        </footer>
      </div>
    </div>
  );
}
