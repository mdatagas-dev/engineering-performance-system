// Logika murni form tambah/edit pengguna (mock, mirror backend):
// - validasi field: nama, email (format + unik), password, role, area
// - proteksi RBAC create/edit (mirror lib/auth/rolePolicy.ts)
// - konstruksi MockUser + hash password tiruan (jangan simpan plaintext)
// Persist ke localStorage lewat updateUserOverride (roleChange.ts); patch
// ber-`created` = user baru, patch field = edit user seed.
import { RoleName } from "@/app/generated/prisma/enums";
import type { MockUser } from "./users";
import type { MockUserPatch } from "./roleChange";

// Daftar area (id sama dengan yang dipakai seedMockUsers).
export const MOCK_AREAS: { id: string; name: string }[] = [
  { id: "area_machining_1", name: "Machining Line 1" },
  { id: "area_machining_2", name: "Machining Line 2" },
  { id: "area_assembly_1", name: "Assembly Line 1" },
  { id: "area_quality_lab", name: "Quality Lab" },
  { id: "area_maintenance", name: "Maintenance" },
];

export const VALID_ROLES: RoleName[] = Object.values(RoleName);

// Kebijakan password mock: min 8 (tiruan sederhana; backend belum punya policy
// eksplisit — seed pakai pola 8+ karakter dengan huruf besar & angka).
export const MIN_PASSWORD_LENGTH = 8;

export type UserFormMode = "create" | "edit";

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  role: RoleName;
  areaId: string; // "" = tanpa area
  isActive: boolean;
};

export type UserFormField = keyof UserFormValues;

export type UserFormErrors = Partial<Record<UserFormField, string>>;

export type UserFormRule = { ok: true } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mockPasswordHash(password: string): string {
  // Mock-only: placeholder hash, bukan plaintext. Saat backend nyambung,
  // ganti dengan Argon2id di server (lihat prisma/seed.ts hash()).
  return `argon2-mock:${password}`;
}

// Normalisasi nilai form sebelum simpan: trim nama, lowercase email, area "" → null.
export function toMockUserInput(values: UserFormValues): {
  name: string;
  email: string;
  area: { id: string; name: string } | null;
} {
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  const area = MOCK_AREAS.find((a) => a.id === values.areaId) ?? null;
  return { name, email, area };
}

// Validasi mirror backend: name non-kosong, email format + unik (case-insensitive,
// exclude target sendiri saat edit), password (create wajib, edit opsional; min 8),
// role valid, area id harus ada di daftar ("" = tidak ada area).
export function validateUserForm(
  values: UserFormValues,
  mode: UserFormMode,
  existing: MockUser[],
  selfId?: string
): UserFormErrors {
  const errors: UserFormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Nama wajib diisi.";
  }

  const email = values.email.trim().toLowerCase();
  if (!email) {
    errors.email = "Email wajib diisi.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Format email tidak valid.";
  } else {
    const dup = existing.some(
      (u) => u.id !== selfId && u.email.trim().toLowerCase() === email
    );
    if (dup) errors.email = "Email sudah terdaftar.";
  }

  if (mode === "create" && !values.password) {
    errors.password = "Password wajib diisi (minimal 8 karakter).";
  } else if (values.password && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }

  if (!VALID_ROLES.includes(values.role)) {
    errors.role = "Peran tidak valid.";
  }

  if (values.areaId !== "" && !MOCK_AREAS.some((a) => a.id === values.areaId)) {
    errors.areaId = "Area tidak valid.";
  }

  return errors;
}

export function hasFormErrors(errors: UserFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// RBAC create: actor tanpa SUPER_ADMIN tidak boleh memberikan peran SUPER_ADMIN.
export function userCreateRule(actorRole: string, newRole: RoleName): UserFormRule {
  if (newRole === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN) {
    return {
      ok: false,
      message: "Hanya SUPER_ADMIN yang dapat membuat akun SUPER_ADMIN.",
    };
  }
  return { ok: true };
}

// RBAC edit — mirror roleChangeRule/decideRoleChange + aturan profil:
// target SUPER_ADMIN final (tidak bisa diubah), self tidak bisa ubah role
// sendiri (nama/email/area boleh), non-SUPER_ADMIN tidak bisa grant SUPER_ADMIN.
export function userEditRule(params: {
  actorRole: string;
  actorId: string;
  actorEmail: string;
  target: { id: string; email: string; roles: RoleName[] };
  newRole: RoleName;
}): UserFormRule {
  const { actorRole, actorId, actorEmail, target, newRole } = params;

  if (target.roles.includes(RoleName.SUPER_ADMIN)) {
    return {
      ok: false,
      message: "Akun SUPER_ADMIN bersifat final dan tidak dapat diubah.",
    };
  }

  const isSelf = actorId === target.id || actorEmail.toLowerCase() === target.email.toLowerCase();
  if (isSelf && newRole !== target.roles[0]) {
    return {
      ok: false,
      message: "Anda tidak dapat mengubah peran akun Anda sendiri.",
    };
  }

  if (newRole === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN) {
    return {
      ok: false,
      message: "Hanya SUPER_ADMIN yang dapat memberikan peran SUPER_ADMIN.",
    };
  }

  return { ok: true };
}

function randomId(now: Date): string {
  return `usr_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Konstruksi MockUser baru (mode create): id baru, createdAt = now.
export function createMockUser(values: UserFormValues, now: Date = new Date()): MockUser {
  const { name, email, area } = toMockUserInput(values);
  const iso = now.toISOString();
  return {
    id: randomId(now),
    email,
    name,
    role: { name: values.role },
    area,
    isActive: values.isActive,
    createdAt: iso,
    updatedAt: iso,
  };
}

// Konstruksi MockUser hasil edit: pertahankan id/createdAt, perbarui sisanya.
export function updateMockUser(
  current: MockUser,
  values: UserFormValues,
  now: Date = new Date()
): MockUser {
  const { name, email, area } = toMockUserInput(values);
  return {
    ...current,
    email,
    name,
    role: { name: values.role },
    area,
    isActive: values.isActive,
    updatedAt: now.toISOString(),
  };
}

// Patch untuk disimpan: user seed → field parsial; user buatan (tidak ada di
// seed) → snapshot penuh (created) supaya tidak hilang saat di-apply ulang.
export function toUserPatch(
  user: MockUser,
  seedIds: ReadonlySet<string>,
  password?: string
): MockUserPatch {
  if (!seedIds.has(user.id)) {
    const patch: MockUserPatch = { id: user.id, created: user };
    if (password) patch.passwordHash = mockPasswordHash(password);
    return patch;
  }
  const patch: MockUserPatch = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: { name: user.role.name },
    area: user.area,
    isActive: user.isActive,
    updatedAt: user.updatedAt,
  };
  if (password) patch.passwordHash = mockPasswordHash(password);
  return patch;
}

export function seedUserIds(users: MockUser[]): ReadonlySet<string> {
  return new Set(users.map((u) => u.id));
}
