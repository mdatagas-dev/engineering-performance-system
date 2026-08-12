"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  filterAudit,
  loadMockAudit,
  saveMockAudit,
  seedMockAudit,
  type MockAuditAction,
  type MockAuditItem,
} from "@/lib/mocks/audit";

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

const ACTION_META: Record<MockAuditAction, { label: string; badge: string }> = {
  LOGIN_SUCCESS: {
    label: "Login Berhasil",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  LOGIN_FAILED: {
    label: "Login Gagal",
    badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
  },
  ACCOUNT_LOCKED: {
    label: "Akun Terkunci",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  },
  UNLOCKED: {
    label: "Akun Dibuka",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  USER_ROLE_CHANGED: {
    label: "Peran Diubah",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  KPI_CREATED: {
    label: "KPI Dibuat",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  KPI_UPDATED: {
    label: "KPI Diubah",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  KPI_DELETED: {
    label: "KPI Dihapus",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  RECORD_STATUS_CHANGED: {
    label: "Status Rekam Diubah",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  RECORD_CORRECTED: {
    label: "Rekam Dikoreksi",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  RECORD_UPDATED: {
    label: "Rekam Diubah",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  RECORD_DELETED: {
    label: "Rekam Dihapus",
    badge: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  },
  BACKUP_RESTORED: {
    label: "Backup Dipulihkan",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  SECURITY_CONFIG_UPDATED: {
    label: "Pengaturan Keamanan Diubah",
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
};

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

function detailText(item: MockAuditItem): string {
  const parts = [
    item.before ? `before=${JSON.stringify(item.before)}` : null,
    item.after ? `after=${JSON.stringify(item.after)}` : null,
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

export default function AuditPage() {
  const authed = useSessionGuard("audit.view") !== null;
  const [items, setItems] = useState<MockAuditItem[]>([]);
  const [action, setAction] = useState<MockAuditAction | "">("");
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  // Seed audit trail setelah guard lolos; entri login mock menumpuk dari
  // localStorage eps_mock_audit (appendMockAudit di lib/mocks/accounts.ts).
  useEffect(() => {
    if (!authed) return;
    let list = loadMockAudit();
    if (list.length === 0) {
      list = seedMockAudit();
      saveMockAudit(list);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(list);
  }, [authed]);

  const users = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; email: string }>();
    for (const it of items) seen.set(it.user.id, it.user);
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const result = useMemo(
    () =>
      filterAudit(items, {
        action,
        userId: userId || undefined,
        search,
        from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
        page,
        perPage,
      }),
    [items, action, userId, search, from, to, page, perPage]
  );

  const totalPages = Math.max(1, Math.ceil(result.total / perPage));
  const fromCount = result.total === 0 ? 0 : (page - 1) * perPage + 1;
  const toCount = Math.min(page * perPage, result.total);

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  function resetFilters() {
    setAction("");
    setUserId("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function handleAction(e: ChangeEvent<HTMLSelectElement>) {
    setAction(e.target.value as MockAuditAction | "");
    setPage(1);
  }
  function handleUser(e: ChangeEvent<HTMLSelectElement>) {
    setUserId(e.target.value);
    setPage(1);
  }
  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }
  function handleFrom(e: ChangeEvent<HTMLInputElement>) {
    setFrom(e.target.value);
    setPage(1);
  }
  function handleTo(e: ChangeEvent<HTMLInputElement>) {
    setTo(e.target.value);
    setPage(1);
  }

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Audit Trail Aktivitas</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Jejak lengkap: login & lock akun, perubahan peran, KPI, rekaman produksi, dan restore backup.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Reset Filter
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Aksi</span>
                <select value={action} onChange={handleAction} className={inputClass}>
                  <option value="">Semua</option>
                  {(Object.keys(ACTION_META) as MockAuditAction[]).map((a) => (
                    <option key={a} value={a}>
                      {ACTION_META[a].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pengguna</span>
                <select value={userId} onChange={handleUser} className={inputClass}>
                  <option value="">Semua</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cari (user / IP / entitas)</span>
                <input
                  type="search"
                  value={search}
                  onChange={handleSearch}
                  placeholder="staff, admin, 103.104…, REC-2026…"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Dari tanggal</span>
                <input type="date" value={from} onChange={handleFrom} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sampai tanggal</span>
                <input type="date" value={to} onChange={handleTo} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Per halaman</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className={inputClass}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </label>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-950/10 text-left text-[11px] tracking-wide text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-semibold">Timestamp</th>
                    <th className="px-3 py-2.5 font-semibold">Aksi</th>
                    <th className="px-3 py-2.5 font-semibold">Entitas</th>
                    <th className="px-3 py-2.5 font-semibold">User</th>
                    <th className="px-3 py-2.5 font-semibold">IP</th>
                    <th className="px-3 py-2.5 font-semibold">User Agent</th>
                    <th className="px-3 py-2.5 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950/5 dark:divide-white/5">
                  {result.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-12 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          Tidak ada entri audit yang cocok.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Coba ubah filter, atau demo: logout lalu login dengan password salah beberapa kali.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    result.items.map((it) => {
                      const meta = ACTION_META[it.action];
                      return (
                        <tr key={it.id} className="align-top transition-colors hover:bg-cyan-500/[0.04]">
                          <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {dateFmt.format(new Date(it.createdAt))}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${meta.badge}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{it.entityType}</p>
                            <p className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-200">
                              {it.entityId}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-xs font-medium">{it.user.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{it.user.email}</p>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {it.ip}
                          </td>
                          <td className="max-w-52 px-3 py-3">
                            <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title={it.userAgent}>
                              {it.userAgent}
                            </p>
                          </td>
                          <td className="max-w-56 px-3 py-3">
                            <p className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400" title={detailText(it)}>
                              {detailText(it)}
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {result.total === 0
                  ? "0 entri"
                  : `Menampilkan ${fromCount}–${toCount} dari ${result.total} entri`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-950/15 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Hal. {page} dari {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-950/15 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400">
              <p className="font-semibold">Catatan:</p>
              <p>
                Data tiruan (mock) — backend GET /api/audit sudah ada tapi butuh DB, jadi halaman ini membaca{" "}
                <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono">eps_mock_audit</code> (localStorage).
                Login mock menambah entri baru: coba logout lalu login dengan password salah berulang kali untuk
                melihat LOGIN_FAILED & ACCOUNT_LOCKED muncul. Backend login belum mencatat audit (nanti fase backend).
              </p>
            </div>
          </div>
        </section>
      </main>
  );
}
