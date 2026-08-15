import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { decideRoleChange } from "@/lib/auth/rolePolicy";
import { RoleName } from "@/app/generated/prisma/enums";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const VALID_ROLES = Object.values(RoleName);

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const newRole = body?.role;
  if (typeof newRole !== "string" || !VALID_ROLES.includes(newRole as RoleName)) {
    return NextResponse.json({ message: "Peran tidak valid." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
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
  });
  if (!target) {
    return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  const decision = decideRoleChange({
    actorRole: session.role,
    actorId: session.sub,
    targetId: target.id,
    targetRoles: target.userRoles.map((ur) => ur.role.name),
    newRole: newRole as RoleName,
  });
  if (!decision.ok) {
    return NextResponse.json({ message: decision.message }, { status: decision.status });
  }

  const role = await prisma.role.findUnique({ where: { name: newRole as RoleName } });
  if (!role) {
    return NextResponse.json({ message: "Peran tidak tersedia." }, { status: 400 });
  }

  const beforeRole = target.userRoles[0]?.role.name ?? null;

  // Keamanan: revoke semua sesi target — JWT membawa snapshot permission,
  // demosi harus langsung efektif (bukan menunggu token expire).
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: target.id } }),
    prisma.userRole.create({ data: { userId: target.id, roleId: role.id } }),
    prisma.session.deleteMany({ where: { userId: target.id } }),
    prisma.auditLog.create({
      data: {
        userId: session.sub,
        action: "USER_ROLE_CHANGED",
        entityType: "USER",
        entityId: target.id,
        before: { role: beforeRole },
        after: { role: newRole as RoleName },
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    }),
  ]);

  return NextResponse.json(
    {
      user: {
        id: target.id,
        email: target.email,
        name: target.name,
        role: { name: newRole as RoleName },
        isActive: target.isActive,
        area: target.area,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      },
      message: "Peran pengguna berhasil diubah.",
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json({ message: "Method tidak diizinkan. Gunakan PATCH." }, { status: 405 });
}
