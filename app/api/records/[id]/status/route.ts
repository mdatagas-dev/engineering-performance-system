import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { RecordStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { decideTransition } from "@/lib/records/workflow";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<string>(Object.values(RecordStatus));

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
  const target = body?.status;
  if (typeof target !== "string" || !VALID_STATUSES.has(target)) {
    return NextResponse.json({ message: "Status target tidak valid." }, { status: 400 });
  }
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : undefined;

  const record = await prisma.productionRecord.findUnique({
    where: { id },
    select: { id: true, status: true, version: true, createdBy: true },
  });
  if (!record) {
    return NextResponse.json({ message: "Record tidak ditemukan." }, { status: 404 });
  }

  const decision = decideTransition({
    from: record.status,
    to: target as RecordStatus,
    actor: session,
    creatorId: record.createdBy,
  });
  if (!decision.ok) {
    return NextResponse.json({ message: decision.message }, { status: decision.status });
  }

  const data: Prisma.ProductionRecordUpdateInput = {
    status: target as RecordStatus,
    version: { increment: 1 },
  };
  const actorFields: Record<string, unknown> = {};
  const { actorField } = decision.transition;
  if (actorField) {
    const field = { [actorField]: session.sub, [`${actorField}At`]: new Date() };
    Object.assign(data, field);
    Object.assign(actorFields, field);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.productionRecord.updateMany({
      where: { id, status: record.status },
      data,
    });
    if (res.count === 0) return null;

    const u = await tx.productionRecord.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, version: true },
    });
    const after: Record<string, unknown> = {
      status: u.status,
      version: u.version,
      ...actorFields,
    };
    if (reason) after.reason = reason;
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "RECORD_STATUS_CHANGED",
        entityType: "PRODUCTION_RECORD",
        entityId: u.id,
        before: { status: record.status },
        after: after as Prisma.InputJsonValue,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return u;
  });

  if (!updated) {
    return NextResponse.json(
      { message: "Status record sudah berubah. Muat ulang data lalu coba lagi." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { record: updated, message: `Status berhasil diubah ke ${target}.` },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan PATCH." },
    { status: 405 }
  );
}
