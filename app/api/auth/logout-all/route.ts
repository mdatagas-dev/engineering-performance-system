import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { logoutAll, logoutCookieOptions, type RevokeAllDeps } from "@/lib/auth/logout";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

const revokeAll: RevokeAllDeps = {
  revokeAllByUserId: (userId) =>
    prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    }),
};

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    // Tak mungkin lewat proxy (sesi invalid -> 401), tapi amankan bila
    // dipanggil langsung: tetap 200 + hapus cookie (idempotent).
    const res = NextResponse.json({ message: "Semua sesi diakhiri." });
    res.cookies.set(AUTH_CONFIG.cookieName, "", logoutCookieOptions());
    return res;
  }

  // Revoke SEMUA sesi user (termasuk sesi saat ini) lalu hapus cookie.
  // Request ini sendiri sudah lolos proxy (sesi valid) sebelum revoke berjalan.
  await logoutAll(revokeAll, session.sub);

  await writeAudit({
    client: prisma,
    userId: session.sub,
    action: AUDIT_ACTIONS.LOGOUT_ALL,
    entityType: AUDIT_ENTITY_TYPES.USER,
    entityId: session.sub,
    ...metaFromRequest(req),
  });

  const res = NextResponse.json({ message: "Semua sesi diakhiri." });
  res.cookies.set(AUTH_CONFIG.cookieName, "", logoutCookieOptions());
  return res;
}

export async function GET() {
  return NextResponse.json({ message: "Method tidak diizinkan. Gunakan POST." }, { status: 405 });
}
