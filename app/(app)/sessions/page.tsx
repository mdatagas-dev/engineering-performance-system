"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  clearMockSessions,
  ensureMockSessions,
  loadMockSessions,
  saveMockSessions,
  type MockActiveSession,
} from "@/lib/mocks/sessions";
import { clearMockSession } from "@/lib/mocks/accounts";

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function relativeLabel(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "Baru saja";
  if (min < 60) return `${min} mnt lalu`;
  return dateFmt.format(new Date(iso));
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  Laptop: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </svg>
  ),
  Smartphone: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  ),
  Tablet: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
};

export default function SessionsPage() {
  const router = useRouter();
  const authed = useSessionGuard() !== null;
  const [sessions, setSessions] = useState<MockActiveSession[]>([]);

  // Seed daftar sesi tiruan setelah guard lolos (sesi aktif hidup di localStorage).
  useEffect(() => {
    if (!authed) return;
    const seeded = ensureMockSessions(loadMockSessions());
    saveMockSessions(seeded);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessions(seeded);
  }, [authed]);

  function handleLogoutOne(s: MockActiveSession) {
    const msg = s.isCurrent
      ? "Logout dari sesi ini? Kamu akan kembali ke halaman login."
      : `Logout sesi ${s.device} (${s.browser} · ${s.ip})?`;
    if (!window.confirm(msg)) return;

    const rest = sessions.filter((x) => x.id !== s.id);
    saveMockSessions(rest);
    setSessions(rest);
    if (s.isCurrent) {
      clearMockSession();
      router.replace("/login");
    }
  }

  function handleLogoutAll() {
    if (!window.confirm("Logout dari semua perangkat (logout all devices)?")) return;
    clearMockSessions();
    clearMockSession();
    router.replace("/login");
  }

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Perangkat yang Login</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Kelola sesi aktif. Data tiruan (mock) — backend belum punya tabel Session.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogoutAll}
                className="rounded-lg bg-gradient-to-r from-red-600 to-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:opacity-90"
              >
                Logout Semua
              </button>
            </div>

            <ul className="mt-6 flex flex-col gap-3">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    s.isCurrent
                      ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                      : "border-slate-950/10 bg-slate-950/[0.03] dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-950/10 text-slate-500 dark:border-white/10 dark:text-slate-300">
                      {DEVICE_ICONS[s.device] ?? DEVICE_ICONS.Laptop}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{s.device}</p>
                        <span className="rounded-full border border-slate-950/10 px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                          {s.browser} on {s.os}
                        </span>
                        {s.isCurrent && (
                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cyan-700 uppercase dark:text-cyan-400">
                            Sesi ini
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        IP {s.ip}
                        {s.location ? ` · ${s.location}` : ""} · Login {dateFmt.format(new Date(s.createdAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Aktif · {relativeLabel(s.lastActiveAt)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogoutOne(s)}
                      className="rounded-lg border border-slate-950/15 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-600 hover:text-white dark:border-white/15 dark:text-slate-200 dark:hover:border-red-600 dark:hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400">
              <p className="font-semibold">Catatan:</p>
              <p>
                Aksi ini hanya tiruan (mock di localStorage). Backend login JWT stateless belum punya tabel
                Session, jadi &quot;logout all devices&quot; yang sungguhan belum bisa — nanti backend perlu menyimpan
                sesi (jti) per token agar dapat di-revoke global.
              </p>
            </div>
          </div>
        </section>
      </main>
  );
}
