import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { getMenuFor } from "@/lib/auth/menu";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

export async function GET() {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      area: true,
      userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const role = user.userRoles[0]?.role;
  if (!role) {
    return NextResponse.json({ message: "Akun tidak memiliki peran yang valid." }, { status: 403 });
  }

  const permissions = Array.from(
    new Set(user.userRoles.flatMap((ur) => ur.role.permissions.map((p) => p.permission.key)))
  );

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: { name: role.name },
      permissions,
      area: user.area ? { id: user.area.id, name: user.area.name } : null,
    },
    menu: getMenuFor({ role: role.name, permissions }),
  });
}
