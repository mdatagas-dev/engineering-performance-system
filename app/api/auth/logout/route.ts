import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { logoutCookieOptions, logoutCurrent, type RevokeCurrentDeps } from "@/lib/auth/logout";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

const revokeCurrent: RevokeCurrentDeps = {
  revokeByTokenHash: (tokenHash) =>
    prisma.session.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    }),
};

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;

  // Idempotent: sesi sudah hilang / token invalid -> revoke dilewati, tetap 200.
  await logoutCurrent(revokeCurrent, token);

  const session = getSession(token);
  if (session) {
    await writeAudit({
      client: prisma,
      userId: session.sub,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: session.sub,
      ...metaFromRequest(req),
    });
  }

  const res = NextResponse.json({ message: "Logout berhasil." });
  res.cookies.set(AUTH_CONFIG.cookieName, "", logoutCookieOptions());
  return res;
}

export async function GET() {
  return NextResponse.json({ message: "Method tidak diizinkan. Gunakan POST." }, { status: 405 });
}
