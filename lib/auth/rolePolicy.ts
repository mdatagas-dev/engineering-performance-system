import { RoleName } from "@/app/generated/prisma/enums";

export type RoleChangeDecision =
  | { ok: true }
  | { ok: false; status: number; message: string };

export function decideRoleChange(params: {
  actorRole: string;
  actorId: string;
  targetId: string;
  targetRoles: RoleName[];
  newRole: RoleName;
}): RoleChangeDecision {
  const { actorRole, actorId, targetId, targetRoles, newRole } = params;

  if (targetRoles.includes(RoleName.SUPER_ADMIN)) {
    return {
      ok: false,
      status: 403,
      message: "Peran SUPER_ADMIN bersifat final dan tidak dapat diubah atau di-demote.",
    };
  }

  if (actorId === targetId) {
    return {
      ok: false,
      status: 403,
      message: "Anda tidak dapat mengubah peran akun Anda sendiri.",
    };
  }

  if (newRole === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN) {
    return {
      ok: false,
      status: 403,
      message: "Hanya SUPER_ADMIN yang dapat memberikan peran SUPER_ADMIN.",
    };
  }

  return { ok: true };
}

// Kebijakan pembuatan akun (POST /api/users) — mirror userCreateRule mock
// frontend (lib/mocks/userForm.ts): hanya SUPER_ADMIN yang bisa menerbitkan
// akun SUPER_ADMIN.
export function decideUserCreate(params: {
  actorRole: string;
  newRole: RoleName;
}): RoleChangeDecision {
  const { actorRole, newRole } = params;

  if (newRole === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN) {
    return {
      ok: false,
      status: 403,
      message: "Hanya SUPER_ADMIN yang dapat membuat akun SUPER_ADMIN.",
    };
  }

  return { ok: true };
}

// Kebijakan edit akun (PATCH /api/users/[id]) — mirror userEditRule mock
// frontend (lib/mocks/userForm.ts). actorEmail sebagai fallback identifikasi
// "diri sendiri" (mock: id sesi beda dari id akun seed, email sama); backend
// memakai actorId (session.sub) dan meneruskan actorEmail kosong.
export function decideUserUpdate(params: {
  actorRole: string;
  actorId: string;
  actorEmail: string;
  target: { id: string; email: string; roles: RoleName[] };
  newRole: RoleName;
}): RoleChangeDecision {
  const { actorRole, actorId, actorEmail, target, newRole } = params;

  if (target.roles.includes(RoleName.SUPER_ADMIN)) {
    return {
      ok: false,
      status: 403,
      message: "Akun SUPER_ADMIN bersifat final dan tidak dapat diubah.",
    };
  }

  const isSelf = actorId === target.id || actorEmail.toLowerCase() === target.email.toLowerCase();
  if (isSelf && newRole !== target.roles[0]) {
    return {
      ok: false,
      status: 403,
      message: "Anda tidak dapat mengubah peran akun Anda sendiri.",
    };
  }

  if (newRole === RoleName.SUPER_ADMIN && actorRole !== RoleName.SUPER_ADMIN) {
    return {
      ok: false,
      status: 403,
      message: "Hanya SUPER_ADMIN yang dapat memberikan peran SUPER_ADMIN.",
    };
  }

  return { ok: true };
}
