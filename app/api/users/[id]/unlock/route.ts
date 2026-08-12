import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { forbidden, notFound, unauthorized } from "@/lib/http/api-error";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/users/[id]/unlock — buka kunci akun yang terkunci brute-force
// (reset failedLoginAttempts, lockedUntil, lockoutCount). Auth: user.manage
// (rule proxy /^\/api\/users\/[^/]+\/unlock$/). Kontrak action UNLOCKED sudah
// ada di registry lib/audit/record.ts + mock frontend (lib/mocks/audit.ts);
// sebelumnya endpoint ini BELUM ada (gap audit phase 5).
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "user.manage")) return forbidden();

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, failedLoginAttempts: true, lockedUntil: true, lockoutCount: true },
  });
  if (!target) return notFound("Pengguna tidak ditemukan.");

  const wasLocked = target.lockedUntil !== null && target.lockedUntil > new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lockoutCount: 0 },
      select: { id: true, email: true },
    });
    await writeAudit({
      client: tx,
      userId: session.sub,
      action: AUDIT_ACTIONS.UNLOCKED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: id,
      before: {
        email: target.email,
        failedLoginAttempts: target.failedLoginAttempts,
        lockedUntil: target.lockedUntil?.toISOString() ?? null,
        lockoutCount: target.lockoutCount,
      },
      after: { email: user.email, failedLoginAttempts: 0, lockedUntil: null, lockoutCount: 0 },
      ...metaFromRequest(_req),
    });
    return user;
  });

  return NextResponse.json({
    user: updated,
    message: wasLocked ? "Akun berhasil dibuka kuncinya." : "Akun tidak dalam keadaan terkunci.",
  });
}
