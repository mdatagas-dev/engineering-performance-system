"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import ConfirmDialog from "@/components/confirm-dialog";
import RoleChangeDialog, { type RoleOption } from "@/components/role-change-dialog";
import UserFormDialog from "@/components/user-form-dialog";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  applyUserOverrides,
  loadUserOverrides,
  updateUserOverride,
} from "@/lib/mocks/roleChange";
import {
  MOCK_AREAS,
  createMockUser,
  seedUserIds,
  toUserPatch,
  updateMockUser,
  type UserFormValues,
} from "@/lib/mocks/userForm";
import { filterUsers, seedMockUsers, type MockUser } from "@/lib/mocks/users";
import { RoleName } from "@/app/generated/prisma/enums";

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

const ROLE_META: Record<RoleName, { label: string; badge: string }> = {
  [RoleName.SUPER_ADMIN]: {
    label: "Super Admin",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  [RoleName.ADMIN]: {
    label: "Admin",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  [RoleName.ENGINEERING_MANAGER]: {
    label: "Eng. Manager",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  },
  [RoleName.ENGINEERING_STAFF]: {
    label: "Eng. Staff",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  [RoleName.VIEWER]: {
    label: "Viewer",
    badge: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400",
  },
};

const ROLE_OPTIONS: RoleOption[] = (Object.keys(ROLE_META) as RoleName[]).map((name) => ({
  name,
  label: ROLE_META[name].label,
  badge: ROLE_META[name].badge,
}));

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

function RoleBadge({ user }: { user: MockUser }) {
  const meta = ROLE_META[user.role.name];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-emerald-700 dark:text-emerald-400">
      Aktif
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-rose-700 dark:text-rose-400">
      Nonaktif
    </span>
  );
}

// Mapping respons API → bentuk yang dipakai UI. GET /api/users mengembalikan
// role sebagai string|null; PATCH mengembalikan {name} — dua-duanya dinormalisasi.
function apiUserToMock(u: {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: string | { name: string } | null;
  area: { id: string; name: string } | null;
}): MockUser {
  const roleName = typeof u.role === "string" ? u.role : (u.role?.name ?? RoleName.VIEWER);
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: { name: roleName as RoleName },
    area: u.area ?? null,
  };
}

export default function UsersPage() {
  const session = useSessionGuard("user.manage");
  const authed = session !== null;
  const [role, setRole] = useState<RoleName | "">("");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<MockUser[]>([]);
  const [total, setTotal] = useState(0);
  const [roleTarget, setRoleTarget] = useState<MockUser | null>(null);
  const [pendingRole, setPendingRole] = useState<{ user: MockUser; role: RoleName } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<MockUser | null>(null);
  const [formDialog, setFormDialog] = useState<{ mode: "create" | "edit"; user: MockUser | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Muat data: API live dulu (GET /api/users), fallback seed mock bila API
  // gagal (offline / DB mati) — pola sama dengan halaman login.
  const load = useCallback(async () => {
    if (!authed) return;
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("perPage", String(perPage));
    if (role) qs.set("role", role);
    if (search.trim()) qs.set("search", search.trim());
    try {
      const res = await fetch(`/api/users?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems((data.users ?? []).map(apiUserToMock));
        setTotal(Number(data.pagination?.total ?? data.users?.length ?? 0));
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setItems([]);
        setTotal(0);
        return;
      }
    } catch {
      // network error → fallback mock
    }
    const result = filterUsers(
      applyUserOverrides(seedMockUsers(), loadUserOverrides(window.localStorage)),
      { role, search, page, perPage }
    );
    setItems(result.items);
    setTotal(result.total);
  }, [authed, page, perPage, role, search]);

  // Debounce 300ms — tiap ketik filter (search/role) langsung refetch API.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function flash(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function handleRoleSubmit(nextRole: RoleName) {
    if (!roleTarget) return;
    setPendingRole({ user: roleTarget, role: nextRole });
    setRoleTarget(null);
  }

  async function applyRoleChange() {
    if (!pendingRole) return;
    const { user, role: nextRole } = pendingRole;
    const label = ROLE_META[nextRole].label;
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        flash(data?.message ?? `Peran ${user.name} diubah menjadi ${label}.`);
        setPendingRole(null);
        load();
        return;
      }
      // 4xx = keputusan backend sungguhan → tampilkan, jangan fallback.
      if (res.status >= 400 && res.status < 500) {
        flash(data?.message ?? "Gagal mengubah peran.");
        setPendingRole(null);
        return;
      }
    } catch {
      // network error → fallback mock
    }
    updateUserOverride(window.localStorage, {
      id: user.id,
      role: { name: nextRole },
      updatedAt: new Date().toISOString(),
    });
    flash(`Peran ${user.name} diubah menjadi ${label}. (mock)`);
    setPendingRole(null);
    load();
  }

  async function persistStatus(u: MockUser, isActive: boolean, label: string) {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        flash(data?.message ?? label);
        load();
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        flash(data?.message ?? "Gagal memperbarui status.");
        return;
      }
    } catch {
      // network error → fallback mock
    }
    updateUserOverride(window.localStorage, {
      id: u.id,
      isActive,
      updatedAt: new Date().toISOString(),
    });
    flash(`${label} (mock)`);
    load();
  }

  function activateUser(u: MockUser) {
    persistStatus(u, true, `Akun ${u.name} diaktifkan.`);
  }

  function applyStatusToggle() {
    if (!toggleTarget) return;
    const next = !toggleTarget.isActive;
    const label = next ? `Akun ${toggleTarget.name} diaktifkan.` : `Akun ${toggleTarget.name} dinonaktifkan.`;
    setToggleTarget(null);
    persistStatus(toggleTarget, next, label);
  }

  async function handleFormSubmit(values: UserFormValues) {
    if (!formDialog) return;
    const isCreate = formDialog.mode === "create";
    const body = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
      areaId: values.areaId || null,
      isActive: values.isActive,
      ...(values.password ? { password: values.password } : {}),
    };
    try {
      const res = await fetch(isCreate ? "/api/users" : `/api/users/${formDialog.user?.id}`, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        flash(data?.message ?? (isCreate ? "Pengguna ditambahkan." : "Pengguna diperbarui."));
        setFormDialog(null);
        load();
        return;
      }
      if (res.status >= 400 && res.status < 500) {
        flash(data?.message ?? "Gagal menyimpan pengguna.");
        setFormDialog(null);
        return;
      }
    } catch {
      // network error → fallback mock
    }
    // Fallback mock (jalur lama).
    const seed = seedMockUsers();
    const now = new Date();
    const password = values.password || undefined;
    if (isCreate) {
      const created = createMockUser(values, now);
      updateUserOverride(window.localStorage, toUserPatch(created, seedUserIds(seed), password));
      flash(`Pengguna ${created.name} ditambahkan. (mock)`);
    } else if (formDialog.user) {
      const updated = updateMockUser(formDialog.user, values, now);
      updateUserOverride(window.localStorage, toUserPatch(updated, seedUserIds(seed), password));
      flash(`Pengguna ${updated.name} diperbarui. (mock)`);
    }
    setFormDialog(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const fromCount = total === 0 ? 0 : (page - 1) * perPage + 1;
  const toCount = Math.min(page * perPage, total);

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  function handleRole(e: ChangeEvent<HTMLSelectElement>) {
    setRole(e.target.value as RoleName | "");
    setPage(1);
  }
  function handleSearch(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <>

      <main className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Manajemen Pengguna</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Daftar akun, peran RBAC, dan status aktif — {total} pengguna.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormDialog({ mode: "create", user: null })}
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
              >
                Tambah Pengguna
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Peran</span>
                <select value={role} onChange={handleRole} className={inputClass}>
                  <option value="">Semua</option>
                  {(Object.keys(ROLE_META) as RoleName[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Cari (nama / email)</span>
                <input
                  type="search"
                  value={search}
                  onChange={handleSearch}
                  placeholder="rina, budi@eps.local…"
                  className={inputClass}
                />
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
                    <th className="px-3 py-2.5 font-semibold">User</th>
                    <th className="px-3 py-2.5 font-semibold">Peran</th>
                    <th className="px-3 py-2.5 font-semibold">Area</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Terdaftar</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-950/5 dark:divide-white/5">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-12 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          Tidak ada pengguna yang cocok.
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Coba ubah filter peran atau kata kunci pencarian.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    items.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 font-mono text-[11px] font-bold text-white shadow shadow-cyan-500/10">
                              {initials(u.name)}
                            </span>
                            <div className="leading-tight">
                              <p className="text-xs font-medium">{u.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <RoleBadge user={u} />
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{u.area?.name ?? "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusBadge isActive={u.isActive} />
                            <button
                              type="button"
                              onClick={() => (u.isActive ? setToggleTarget(u) : activateUser(u))}
                              className="text-[11px] font-semibold text-cyan-700 transition-colors hover:text-cyan-600 dark:text-cyan-400"
                            >
                              {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {dateFmt.format(new Date(u.createdAt))}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={u.role.name === RoleName.SUPER_ADMIN}
                              title={u.role.name === RoleName.SUPER_ADMIN ? "Akun SUPER_ADMIN tidak dapat diubah" : "Edit pengguna"}
                              onClick={() => setFormDialog({ mode: "edit", user: u })}
                              className="rounded-lg border border-slate-950/15 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setRoleTarget(u)}
                              className="rounded-lg border border-slate-950/15 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                            >
                              Ubah Peran
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {total === 0
                  ? "0 pengguna"
                  : `Menampilkan ${fromCount}–${toCount} dari ${total} pengguna`}
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
                Halaman ini memakai API live (GET/POST /api/users, PATCH /api/users/[id] &
                /api/users/[id]/role) — tanpa DB/offline, otomatis fallback ke data tiruan
                (seed mock + localStorage <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono">eps_mock_users</code>).
                Saat fallback, password disimpan sebagai placeholder{" "}
                <code className="rounded bg-amber-500/10 px-1 py-0.5 font-mono">argon2-mock:…</code> (bukan plaintext);
                backend menulis hash Argon2id.
              </p>
            </div>
          </div>
        </section>
      </main>

      

      {formDialog && (
        <UserFormDialog
          mode={formDialog.mode}
          user={formDialog.user}
          actorRole={session?.user.role.name ?? ""}
          actorId={session?.user.id ?? ""}
          actorEmail={session?.user.email ?? ""}
          roleOptions={ROLE_OPTIONS}
          areas={MOCK_AREAS}
          existing={items}
          onClose={() => setFormDialog(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {roleTarget && (
        <RoleChangeDialog
          user={roleTarget}
          actorRole={session?.user.role.name ?? ""}
          actorId={session?.user.id ?? ""}
          actorEmail={session?.user.email ?? ""}
          roleOptions={ROLE_OPTIONS}
          onClose={() => setRoleTarget(null)}
          onSubmit={handleRoleSubmit}
        />
      )}

      <ConfirmDialog
        open={pendingRole !== null}
        title={`Ubah peran ${pendingRole?.user.name}?`}
        message={
          <>
            Peran akan berubah dari <strong>{pendingRole ? ROLE_META[pendingRole.user.role.name].label : ""}</strong>{" "}
            menjadi <strong>{pendingRole ? ROLE_META[pendingRole.role].label : ""}</strong>. Perubahan disimpan ke
            server (API) bila tersedia; tanpa DB, tersimpan sementara di browser.
          </>
        }
        confirmLabel="Ya, Ubah"
        onConfirm={applyRoleChange}
        onCancel={() => setPendingRole(null)}
      />

      <ConfirmDialog
        open={toggleTarget !== null}
        title={`Nonaktifkan ${toggleTarget?.name}?`}
        message="Akun yang dinonaktifkan tidak dapat mengakses sistem. Anda dapat mengaktifkannya kembali kapan saja."
        confirmLabel="Nonaktifkan"
        danger
        onConfirm={applyStatusToggle}
        onCancel={() => setToggleTarget(null)}
      />

      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 shadow-lg shadow-emerald-500/10 backdrop-blur dark:text-emerald-400"
        >
          {toast}
        </div>
      )}
    </>
  );
}
