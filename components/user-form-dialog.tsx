"use client";

import { useEffect, useMemo, useState } from "react";
import { RoleName } from "@/app/generated/prisma/enums";
import type { RoleOption } from "@/components/role-change-dialog";
import {
  MIN_PASSWORD_LENGTH,
  hasFormErrors,
  userCreateRule,
  userEditRule,
  validateUserForm,
  type UserFormMode,
  type UserFormValues,
} from "@/lib/mocks/userForm";
import type { MockUser } from "@/lib/mocks/users";

type Props = {
  mode: UserFormMode;
  user: MockUser | null; // edit target; null saat create
  actorRole: string;
  actorId: string;
  actorEmail: string;
  roleOptions: RoleOption[];
  areas: { id: string; name: string }[];
  existing: MockUser[]; // untuk cek email duplikat
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
};

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

const errorClass = (has: boolean) =>
  has
    ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30"
    : "border-slate-950/15 focus:border-cyan-600 focus:ring-cyan-500/30 dark:border-white/15";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
      {msg}
    </p>
  );
}

// Dialog tambah/edit pengguna (mock, frontend-first): form nama/email/password/
// role/area/isActive dengan validasi inline + proteksi RBAC mirror rolePolicy.
// Create: password wajib. Edit: password opsional (kosong = tidak diganti).
export default function UserFormDialog({
  mode,
  user,
  actorRole,
  actorId,
  actorEmail,
  roleOptions,
  areas,
  existing,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = mode === "edit";
  const isSuperTarget = isEdit && user?.role.name === RoleName.SUPER_ADMIN;

  const [values, setValues] = useState<UserFormValues>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role.name ?? RoleName.VIEWER,
    areaId: user?.area?.id ?? "",
    isActive: user?.isActive ?? true,
  }));
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const selfId = isEdit ? user?.id : undefined;
  const fieldErrors = useMemo(
    () => validateUserForm(values, mode, existing, selfId),
    [values, mode, existing, selfId]
  );
  const shown = showAll ? fieldErrors : {};
  const canSubmit = !isSuperTarget && !hasFormErrors(fieldErrors);

  const rbac = useMemo(() => {
    if (mode === "create") {
      return userCreateRule(actorRole, values.role);
    }
    return userEditRule({
      actorRole,
      actorId,
      actorEmail,
      target: { id: user?.id ?? "", email: user?.email ?? "", roles: user ? [user.role.name] : [] },
      newRole: values.role,
    });
  }, [mode, actorRole, actorId, actorEmail, user, values.role]);

  const isSelf = useMemo(() => {
    if (!isEdit || !user) return false;
    return actorId === user.id || actorEmail.toLowerCase() === user.email.toLowerCase();
  }, [isEdit, user, actorId, actorEmail]);

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !rbac.ok) {
      setShowAll(true);
      return;
    }
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-dialog-title"
        className="glass-card relative w-full max-w-xl p-6"
      >
        <h2 id="user-form-dialog-title" className="text-base font-bold tracking-tight">
          {mode === "create" ? "Tambah Pengguna" : `Edit Pengguna${user ? ` — ${user.name}` : ""}`}
        </h2>

        {isSuperTarget && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-400"
          >
            Akun SUPER_ADMIN bersifat final dan tidak dapat diubah.
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Nama</span>
              <input
                type="text"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                disabled={isSuperTarget}
                placeholder="Nama lengkap"
                className={`${inputClass} ${errorClass(!!shown.name)}`}
              />
              <FieldError msg={shown.name} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Email</span>
              <input
                type="email"
                value={values.email}
                onChange={(e) => set("email", e.target.value)}
                disabled={isSuperTarget}
                placeholder="nama@eps.local"
                className={`${inputClass} ${errorClass(!!shown.email)}`}
              />
              <FieldError msg={shown.email} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Password
              {isEdit && <span className="text-slate-400 dark:text-slate-500"> (kosongkan jika tidak diganti)</span>}
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              disabled={isSuperTarget}
              placeholder={mode === "create" ? `Minimal ${MIN_PASSWORD_LENGTH} karakter` : "Biarkan kosong"}
              className={`${inputClass} ${errorClass(!!shown.password)}`}
            />
            <FieldError msg={shown.password} />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Peran</span>
              <select
                value={values.role}
                onChange={(e) => set("role", e.target.value as RoleName)}
                disabled={isSuperTarget || isSelf}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.name} value={opt.name} disabled={opt.name === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <FieldError msg={shown.role} />
              {(isSelf || (values.role === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN)) && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  {isSelf
                    ? "Anda tidak dapat mengubah peran akun Anda sendiri."
                    : "Hanya SUPER_ADMIN yang dapat memberikan peran SUPER_ADMIN."}
                </p>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Area</span>
              <select
                value={values.areaId}
                onChange={(e) => set("areaId", e.target.value)}
                disabled={isSuperTarget}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="">— Tanpa area —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <FieldError msg={shown.areaId} />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              disabled={isSuperTarget}
              className="h-4 w-4 accent-cyan-600"
            />
            <span className="font-medium">Akun aktif</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {values.isActive ? "Bisa login" : "Terkunci"}
            </span>
          </label>

          {showAll && hasFormErrors(fieldErrors) && (
            <p
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/[0.07] px-3 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-400"
            >
              Periksa kembali isian form di atas.
            </p>
          )}

          {!rbac.ok && (
            <p
              role="alert"
              className="rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:text-amber-400"
            >
              {rbac.message}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "create" ? "Tambah Pengguna" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
