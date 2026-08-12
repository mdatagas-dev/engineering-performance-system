// Helper murni frontend untuk aksi tabel pengguna: proteksi RBAC "ubah peran"
// (mirror lib/auth/rolePolicy.ts) + persist override status/peran ke
// localStorage (eps_mock_users). Backend belum punya endpoint toggle status —
// PATCH /api/users/[id]/role hanya untuk role, jadi toggle isActive mock-only.
import { RoleName } from "@/app/generated/prisma/enums";
import type { MockUser } from "./users";

export const USERS_STORAGE_KEY = "eps_mock_users";

// Patch parsial per user — meniru apa yang backend PATCH simpan.
// `created` membawa snapshot penuh untuk user yang DIBUAT lewat form (tidak
// ada di seed); patch biasa hanya field yang berubah (role/isActive + profil).
export type MockUserPatch = {
  id: string;
  role?: { name: RoleName };
  isActive?: boolean;
  updatedAt?: string;
  name?: string;
  email?: string;
  area?: { id: string; name: string } | null;
  // Mock-only placeholder hash (argon2-mock:<password>) — bukan plaintext.
  passwordHash?: string;
  created?: MockUser;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadUserOverrides(storage: StorageLike): MockUserPatch[] {
  try {
    const raw = storage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockUserPatch[]) : [];
  } catch {
    return [];
  }
}

export function saveUserOverrides(storage: StorageLike, patches: MockUserPatch[]): void {
  storage.setItem(USERS_STORAGE_KEY, JSON.stringify(patches));
}

// Merge satu patch ke penyimpanan (replace per id) lalu kembalikan daftar baru.
export function updateUserOverride(storage: StorageLike, patch: MockUserPatch): MockUserPatch[] {
  const patches = loadUserOverrides(storage);
  const next = [...patches.filter((p) => p.id !== patch.id), patch];
  saveUserOverrides(storage, next);
  return next;
}

// Gabungkan patch tersimpan ke seed; field yang tidak di-patch tetap dari seed.
// Patch ber-`created` = user baru (tidak ada di seed) → dimasukkan & menimpa
// user dengan id sama (edit user buatan).
export function applyUserOverrides(items: MockUser[], patches: MockUserPatch[]): MockUser[] {
  const created = new Map(
    patches.filter((p) => p.created).map((p) => [p.id, p.created as MockUser])
  );
  const byId = new Map(patches.filter((p) => !p.created).map((p) => [p.id, p]));
  const merged = items
    .map((u) => {
      const patch = byId.get(u.id);
      if (!patch) return u;
      return {
        ...u,
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.role ? { role: { name: patch.role.name } } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.area !== undefined ? { area: patch.area } : {}),
        ...(patch.updatedAt ? { updatedAt: patch.updatedAt } : {}),
      };
    })
    .filter((u) => !created.has(u.id));
  return [...merged, ...created.values()];
}

export type RoleChangeRule = { ok: true } | { ok: false; message: string };

// Proteksi RBAC ubah peran — mirror lib/auth/rolePolicy.ts decideRoleChange.
// actorEmail sebagai fallback identifikasi "diri sendiri": id sesi mock
// (usr_mock_*) beda dari id user di seed (usr_*), email sama.
export function roleChangeRule(params: {
  actorRole: string;
  actorId: string;
  actorEmail: string;
  target: { id: string; email: string; roles: RoleName[] };
  newRole: RoleName;
}): RoleChangeRule {
  const { actorRole, actorId, actorEmail, target, newRole } = params;
  const isSelf = actorId === target.id || actorEmail.toLowerCase() === target.email.toLowerCase();

  if (target.roles.includes(RoleName.SUPER_ADMIN)) {
    return {
      ok: false,
      message: "Peran SUPER_ADMIN bersifat final dan tidak dapat diubah atau di-demote.",
    };
  }

  if (isSelf) {
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
