"use client";

import Link from "next/link";
import SessionClock from "@/components/session-clock";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { canAccess } from "@/lib/auth/menu";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ENGINEERING_MANAGER: "Engineering Manager",
  ENGINEERING_STAFF: "Engineering Staff",
  VIEWER: "Viewer",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TransferGate({
  title,
  permission,
  href,
  allowed,
}: {
  title: string;
  permission: string;
  href: string;
  allowed: boolean;
}) {
  const cls = allowed
    ? "rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 transition-colors hover:bg-cyan-500/20"
    : "rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]";
  return (
    <li className={cls}>
      {allowed ? (
        <Link href={href} className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">{title}</span>
          <span className="text-[11px] text-slate-600 dark:text-slate-300">
            Buka halaman {href} — izin {permission} tersedia.
          </span>
        </Link>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Terkunci — izin {permission} tidak dimiliki akun ini.
          </span>
        </div>
      )}
    </li>
  );
}

export default function Home() {
  // Guard sesi (client-side): cek absen/kadaluwarsa saat mount + tiap 30 detik; redirect ke /login.
  // Saat backend real ada DB, guard ini diganti proxy/session server (cookie eps_session).
  const session = useSessionGuard();

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const { user, menu } = session;
  const roleLabel = ROLE_LABELS[user.role.name] ?? user.role.name;

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Sesi Aktif
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Durasi sesi</span>
                <SessionClock />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-800 font-mono text-lg font-bold text-white shadow-lg shadow-cyan-500/20">
                {initials(user.name)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                  <span className="rounded-md border border-slate-950/10 px-2 py-0.5 font-mono text-[11px] tracking-wider text-slate-600 uppercase dark:border-white/10 dark:text-slate-300">
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>

            <dl className="stagger mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">Role</dt>
                <dd className="mt-1 text-sm font-semibold">{roleLabel}</dd>
              </div>
              <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">Area</dt>
                <dd className="mt-1 text-sm font-semibold">{user.area?.name ?? "—"}</dd>
              </div>
              <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">Permission</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {user.permissions.length} izin aktif
                </dd>
              </div>
              <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">Navigasi</dt>
                <dd className="mt-1 text-sm font-semibold">
                  {menu.length} menu tersedia
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="glass-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Import/Export Data Produksi</h2>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Halaman dibuka sesuai permission akun — tanpa izin, halaman mengarahkan kembali ke sini.
                </p>
              </div>
              <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                {canAccess(user, "import.run") || canAccess(user, "export.run")
                  ? "Ada akses tersedia"
                  : "Tanpa akses transfer"}
              </span>
            </div>
            <ul className="stagger mt-4 grid gap-3 sm:grid-cols-2">
              <TransferGate
                title="Import Data"
                permission="import.run"
                href="/import"
                allowed={canAccess(user, "import.run")}
              />
              <TransferGate
                title="Export Data"
                permission="export.run"
                href="/export"
                allowed={canAccess(user, "export.run")}
              />
            </ul>
          </div>
        </section>
      </main>
  );
}
