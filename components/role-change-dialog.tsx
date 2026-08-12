"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleName } from "@/app/generated/prisma/enums";
import { roleChangeRule } from "@/lib/mocks/roleChange";
import type { MockUser } from "@/lib/mocks/users";

export type RoleOption = { name: RoleName; label: string; badge: string };

type Props = {
  user: MockUser;
  actorRole: string;
  actorId: string;
  actorEmail: string;
  roleOptions: RoleOption[];
  onClose: () => void;
  onSubmit: (role: RoleName) => void;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

// Dialog ubah peran: pilih role baru (radio 5 role) + peringatan proteksi RBAC
// (mirror lib/auth/rolePolicy.ts via lib/mocks/roleChange.ts). Dimount
// conditional di halaman induk, jadi state reset otomatis tiap dibuka.
// Pengiriman lewat ConfirmDialog di halaman induk.
export default function RoleChangeDialog({
  user,
  actorRole,
  actorId,
  actorEmail,
  roleOptions,
  onClose,
  onSubmit,
}: Props) {
  const [selected, setSelected] = useState<RoleName>(user.role.name);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rule = useMemo(
    () =>
      roleChangeRule({
        actorRole,
        actorId,
        actorEmail,
        target: { id: user.id, email: user.email, roles: [user.role.name] },
        newRole: selected,
      }),
    [user, actorRole, actorId, actorEmail, selected]
  );

  const isSuperTarget = user.role.name === RoleName.SUPER_ADMIN;
  const cannotSubmit = !rule.ok || selected === user.role.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
        className="glass-card relative w-full max-w-lg p-6"
      >
        <h2 id="role-dialog-title" className="text-base font-bold tracking-tight">
          Ubah Peran Pengguna
        </h2>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-950/10 bg-white/50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 font-mono text-[11px] font-bold text-white shadow shadow-cyan-500/10">
            {initials(user.name)}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <span
            className={`ml-auto inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
              roleOptions.find((r) => r.name === user.role.name)?.badge ??
              "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400"
            }`}
          >
            {roleOptions.find((r) => r.name === user.role.name)?.label ?? user.role.name}
          </span>
        </div>

        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Peran baru
          </legend>
          {roleOptions.map((opt) => {
            const locked =
              isSuperTarget ||
              (opt.name === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN);
            return (
              <label
                key={opt.name}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  selected === opt.name
                    ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                    : "border-slate-950/10 dark:border-white/10"
                } ${locked ? "cursor-not-allowed opacity-50" : "hover:bg-cyan-500/[0.03]"}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.name}
                  checked={selected === opt.name}
                  disabled={locked}
                  onChange={() => setSelected(opt.name)}
                  className="accent-cyan-600"
                />
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${opt.badge}`}>
                  {opt.label}
                </span>
                {locked && opt.name === RoleName.SUPER_ADMIN && (
                  <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">khusus Super Admin</span>
                )}
              </label>
            );
          })}
        </fieldset>

        {!rule.ok && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-400"
          >
            {rule.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={cannotSubmit}
            onClick={() => onSubmit(selected)}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Simpan Perubahan
          </button>
        </div>
      </div>
    </div>
  );
}
