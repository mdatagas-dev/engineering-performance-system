import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import type { Prisma } from "@/app/generated/prisma/client";
import { assertEditable, assertDeletable, assertManageable } from "@/lib/records/guards";
import { parseEditBody, buildEditUpdate } from "@/lib/records/edit";
import { createVersionSnapshot } from "@/lib/records/versioning";
import { RecordStatus } from "@/app/generated/prisma/enums";
import {
  badRequest,
  conflict,
  forbidden,
  internal,
  notFound,
  unauthorized,
} from "@/lib/http/api-error";

export const dynamic = "force-dynamic";

const STALE_MESSAGE = "Status record sudah berubah. Muat ulang data lalu coba lagi.";

type Params = { params: Promise<{ id: string }> };

const RECORD_SELECT = {
  id: true,
  date: true,
  model: true,
  shift: true,
  areaId: true,
  uphTarget: true,
  uphResult: true,
  hcStandard: true,
  hcActual: true,
  plan: true,
  outputProd: true,
  totalSetup: true,
  workingHour: true,
  totalSetupPacking: true,
  workingHourPacking: true,
  gapUph: true,
  gapHc: true,
  gapOp: true,
  upph: true,
  status: true,
  version: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const record = await prisma.productionRecord.findUnique({
    where: { id },
    select: RECORD_SELECT,
  });
  if (!record) return notFound("Record tidak ditemukan.");

  const manageable = assertManageable(session, record.createdBy);
  if (!manageable.ok) {
    return forbidden(manageable.message);
  }

  const editable = assertEditable(record.status);
  if (!editable.ok) {
    return conflict(editable.message);
  }

  const body = await req.json().catch(() => null);
  const parsed = parseEditBody(body);
  if (!parsed.ok) return badRequest(parsed.message);

  const { updates, after } = buildEditUpdate(record, parsed.data.fields);
  const data: Prisma.ProductionRecordUpdateInput = {
    ...(updates as Prisma.ProductionRecordUpdateInput),
    version: { increment: 1 },
  };

  let updated: { id: string; status: RecordStatus; version: number } | null = null;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const res = await tx.productionRecord.updateMany({
        where: { id, status: record.status },
        data,
      });
      if (res.count === 0) return null;

      const u = await tx.productionRecord.findUniqueOrThrow({
        where: { id },
        select: { id: true, status: true, version: true },
      });

      const auditAfter: Record<string, unknown> = {
        ...after,
        version: u.version,
      };
      if (parsed.data.reason) auditAfter.reason = parsed.data.reason;

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "RECORD_UPDATED",
          entityType: "PRODUCTION_RECORD",
          entityId: u.id,
          before: { ...record } as Prisma.InputJsonValue,
          after: auditAfter as Prisma.InputJsonValue,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        },
      });

      await createVersionSnapshot(tx, {
        recordId: u.id,
        version: u.version,
        snapshot: { ...after, version: u.version } as Prisma.InputJsonValue,
        changedBy: session.sub,
        action: "UPDATED",
        changeReason: parsed.data.reason,
      });
      return u;
    });
  } catch (err) {
    return internal("Gagal memperbarui record.", err);
  }

  if (!updated) {
    return conflict(STALE_MESSAGE);
  }

  return NextResponse.json(
    { record: updated, message: "Record berhasil diperbarui." },
    { status: 200 }
  );
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const record = await prisma.productionRecord.findUnique({
    where: { id },
    select: RECORD_SELECT,
  });
  if (!record) return notFound("Record tidak ditemukan.");

  const manageable = assertManageable(session, record.createdBy);
  if (!manageable.ok) {
    return forbidden(manageable.message);
  }

  const deletable = assertDeletable(record.status);
  if (!deletable.ok) {
    return conflict(deletable.message);
  }

  let deleted: string | null = null;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      const res = await tx.productionRecord.deleteMany({
        where: { id, status: record.status },
      });
      if (res.count === 0) return null;

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "RECORD_DELETED",
          entityType: "PRODUCTION_RECORD",
          entityId: record.id,
          before: { ...record } as Prisma.InputJsonValue,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        },
      });
      return record.id;
    });
  } catch (err) {
    return internal("Gagal menghapus record.", err);
  }

  if (!deleted) {
    return conflict(STALE_MESSAGE);
  }

  return NextResponse.json(
    { message: "Record berhasil dihapus.", id: deleted },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan PATCH atau DELETE." },
    { status: 405 }
  );
}
