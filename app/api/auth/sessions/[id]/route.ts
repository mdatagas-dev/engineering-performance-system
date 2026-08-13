import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/sessions";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit } from "@/lib/audit/record";

export const dynamic = "force-dynamic";

// DELETE /api/auth/sessions/[id] — akhiri SATU sesi milik user yang login
// (feature "Manajemen Sesi"). Sesi milik user lain → 404 (tidak bocor).
// Sesi saat ini (token yang dipakai request) tidak bisa diakhiri lewat
// endpoint ini — gunakan POST /api/auth/logout. Audit: LOGOUT.
const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.session.findUnique({ where: { id } });
  if (!row || row.userId !== session.sub || row.isRevoked) {
    return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 404 });
  }
  if (token && hashToken(token) === row.tokenHash) {
    return NextResponse.json(
      { message: "Sesi saat ini tidak bisa diakhiri di sini — gunakan tombol Logout." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id },
      data: { isRevoked: true, revokedAt: new Date() },
    });
    await writeAudit({
      client: tx,
      userId: session.sub,
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: session.sub,
      before: { sessionId: id } as object,
      after: { sessionId: id, revoked: true } as object,
      ...metaFromRequest(req),
    });
  });

  return NextResponse.json({ message: "Sesi diakhiri." });
}