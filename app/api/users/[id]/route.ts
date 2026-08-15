import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { decideUserUpdate } from "@/lib/auth/rolePolicy";
import { isDuplicateKeyError } from "@/lib/records/create";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "@/lib/http/api-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

const VALID_ROLES = Object.values(RoleName);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  area: { select: { id: true, name: true } },
  userRoles: { include: { role: { select: { name: true } } } },
  createdAt: true,
  updatedAt: true,
} as const;

const USER_RESPONSE_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  area: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

type Params = { params: Promise<{ id: string }> };

function toUserResponse(u: {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  area: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
} & { role: RoleName }) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    isActive: u.isActive,
    role: { name: u.role },
    area: u.area,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "user.manage")) return forbidden();

  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return notFound("Pengguna tidak ditemukan.");
  const role = user.userRoles[0]?.role;
  if (!role) return notFound("Pengguna tidak ditemukan.");

  return NextResponse.json({
    user: toUserResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      area: user.area,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      role: role.name,
    }),
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "user.manage")) return forbidden();

  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;
  const areaIdProvided = typeof body?.areaId === "string";
  const areaId = areaIdProvided && body.areaId !== "" ? body.areaId : null;
  const roleParam = typeof body?.role === "string" ? body.role : undefined;

  if (name !== undefined && !name) return badRequest("Nama wajib diisi.");
  if (email !== undefined && !EMAIL_RE.test(email)) return badRequest("Format email tidak valid.");
  if (password !== undefined) {
    if (!password) return badRequest("Password tidak boleh kosong.");
    if (password.length < MIN_PASSWORD_LENGTH) {
      return badRequest(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
    }
  }
  if (roleParam !== undefined && !VALID_ROLES.includes(roleParam as RoleName)) {
    return badRequest("Peran tidak valid.");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!target) return notFound("Pengguna tidak ditemukan.");

  const currentRole = target.userRoles[0]?.role;
  if (!currentRole) return notFound("Pengguna tidak ditemukan.");
  const targetRoles = target.userRoles.map((ur) => ur.role.name);
  const newRole = (roleParam ?? currentRole.name) as RoleName;

  const updateDecision = decideUserUpdate({
    actorRole: session.role,
    actorId: session.sub,
    actorEmail: "",
    target: { id: target.id, email: target.email, roles: targetRoles },
    newRole,
  });
  if (!updateDecision.ok) {
    return NextResponse.json({ message: updateDecision.message }, { status: updateDecision.status });
  }

  const roleChanged = roleParam !== undefined && newRole !== currentRole.name;
  // Deaktivasi akun harus memutus semua sesi aktif (JWT snapshot permission).
  const deactivating = isActive === false && target.isActive !== false;

  if (email !== undefined && email !== target.email) {
    const dup = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (dup) return conflict("Email sudah terdaftar.");
  }

  const area =
    areaIdProvided && areaId
      ? await prisma.area.findUnique({ where: { id: areaId }, select: { id: true, name: true } })
      : null;
  if (areaIdProvided && areaId && !area) return badRequest("Area tidak valid.");

  const data: Prisma.UserUpdateInput = {};
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};

  if (name !== undefined && name !== target.name) {
    data.name = name;
    before.name = target.name;
    after.name = name;
  }
  if (email !== undefined && email !== target.email) {
    data.email = email;
    before.email = target.email;
    after.email = email;
  }
  if (password !== undefined) {
    data.passwordHash = await hash(password);
    after.passwordChanged = true;
  }
  if (isActive !== undefined && isActive !== target.isActive) {
    data.isActive = isActive;
    before.isActive = target.isActive;
    after.isActive = isActive;
  }
  if (areaIdProvided && (area?.id ?? null) !== target.area?.id) {
    data.area = area ? { connect: { id: area.id } } : { disconnect: true };
    before.area = target.area?.name ?? null;
    after.area = area?.name ?? null;
  }

  if (roleChanged) {
    before.role = currentRole.name;
    after.role = newRole;
  }

  const role = roleChanged
    ? await prisma.role.findUnique({ where: { name: newRole }, select: { id: true } })
    : null;
  if (roleChanged && !role) return badRequest("Peran tidak tersedia.");

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (roleChanged) {
        await tx.userRole.deleteMany({ where: { userId: target.id } });
        await tx.userRole.create({ data: { userId: target.id, roleId: role!.id } });
      }
      // Role berubah atau akun dinonaktifkan → sesi lama tidak boleh bertahan.
      if (roleChanged || deactivating) {
        await tx.session.deleteMany({ where: { userId: target.id } });
      }
      const u = await tx.user.update({
        where: { id: target.id },
        data,
        select: USER_RESPONSE_SELECT,
      });
      await writeAudit({
        client: tx,
        userId: session.sub,
        action: roleChanged ? AUDIT_ACTIONS.USER_ROLE_CHANGED : AUDIT_ACTIONS.USER_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: target.id,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        ...metaFromRequest(req),
      });
      return u;
    });

    return NextResponse.json(
      {
        user: toUserResponse({ ...updated, role: newRole }),
        message: roleChanged ? "Peran pengguna berhasil diubah." : "Pengguna berhasil diperbarui.",
      },
      { status: 200 }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) return conflict("Email sudah terdaftar.");
    throw err;
  }
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau PATCH." },
    { status: 405 }
  );
}