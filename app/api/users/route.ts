import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@/app/generated/prisma/enums";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { decideUserCreate } from "@/lib/auth/rolePolicy";
import { isDuplicateKeyError } from "@/lib/records/create";
import { badRequest, conflict, forbidden, unauthorized } from "@/lib/http/api-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

const VALID_ROLES = Object.values(RoleName);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("perPage") ?? 20) || 20)
  );
  const roleParam = url.searchParams.get("role") ?? "";
  const search = url.searchParams.get("search")?.trim() ?? "";

  if (roleParam && !VALID_ROLES.includes(roleParam as RoleName)) {
    return NextResponse.json({ message: "Filter peran tidak valid." }, { status: 400 });
  }

  const where = {
    ...(roleParam
      ? { userRoles: { some: { role: { name: roleParam as RoleName } } } }
      : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        area: { select: { id: true, name: true } },
        userRoles: { include: { role: { select: { name: true } } } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      role: u.userRoles[0]?.role.name ?? null,
      area: u.area,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "user.manage")) return forbidden();

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const isActive = body?.isActive !== false;
  const areaId = typeof body?.areaId === "string" && body.areaId !== "" ? body.areaId : null;

  if (!name) return badRequest("Nama wajib diisi.");
  if (!EMAIL_RE.test(email)) return badRequest("Format email tidak valid.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return badRequest(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
  }
  if (typeof body?.role !== "string" || !VALID_ROLES.includes(body.role as RoleName)) {
    return badRequest("Peran tidak valid.");
  }
  const newRole = body.role as RoleName;

  const createDecision = decideUserCreate({ actorRole: session.role, newRole });
  if (!createDecision.ok) {
    return NextResponse.json({ message: createDecision.message }, { status: createDecision.status });
  }

  const dup = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (dup) return conflict("Email sudah terdaftar.");

  const area = areaId
    ? await prisma.area.findUnique({ where: { id: areaId }, select: { id: true, name: true } })
    : null;
  if (areaId && !area) return badRequest("Area tidak valid.");

  const role = await prisma.role.findUnique({ where: { name: newRole }, select: { id: true } });
  if (!role) return badRequest("Peran tidak tersedia.");

  const passwordHash = await hash(password);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name, isActive, areaId: area?.id ?? null },
        select: { id: true, email: true, name: true, isActive: true, createdAt: true, updatedAt: true },
      });
      await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
      await writeAudit({
        client: tx,
        userId: session.sub,
        action: AUDIT_ACTIONS.USER_CREATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        after: { email, name, role: newRole, isActive },
        ...metaFromRequest(req),
      });
      return user;
    });

    return NextResponse.json(
      {
        user: {
          id: created.id,
          email: created.email,
          name: created.name,
          role: { name: newRole },
          isActive: created.isActive,
          area: area,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        message: "Pengguna berhasil ditambahkan.",
      },
      { status: 201 }
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) return conflict("Email sudah terdaftar.");
    throw err;
  }
}

export async function PATCH() {
  return NextResponse.json({ message: "Method tidak diizinkan. Gunakan GET atau POST." }, { status: 405 });
}
