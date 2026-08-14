import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission, type SessionPayload } from "@/lib/auth/session";
import { Prisma } from "@/app/generated/prisma/client";
import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";
import { validateQualityCheckUpdate } from "@/lib/quality/validation";
import { isDuplicateKeyError } from "@/lib/records/create";
import { cleanNote, cleanShift, QUALITY_DUPLICATE_MESSAGE } from "../route";
import {
  badRequest,
  conflict,
  forbidden,
  internal,
  notFound,
  unauthorized,
} from "@/lib/http/api-error";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const STALE_MESSAGE = "Status quality check sudah berubah. Muat ulang data lalu coba lagi.";

// Whitelist field yang bisa diubah lewat PATCH — status/version/createdById
// TIDAK pernah bisa di-set dari client (sama seperti buildEditUpdate records).
const EDITABLE_FIELDS = new Set([
  "date",
  "model",
  "shift",
  "areaId",
  "note",
  "inspectedQty",
  "passedQty",
  "failedQty",
  "defectCount",
]);

type Params = { params: Promise<{ id: string }> };

const CHECK_SELECT = {
  id: true,
  date: true,
  model: true,
  shift: true,
  areaId: true,
  inspectedQty: true,
  passedQty: true,
  failedQty: true,
  defectCount: true,
  note: true,
  status: true,
  version: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

function canManage(session: SessionPayload, creatorId: string | null): boolean {
  if (session.role === RoleName.SUPER_ADMIN) return true;
  if (session.permissions.includes("quality.record")) return true;
  return creatorId !== null && session.sub === creatorId;
}

function snapshotCheck(
  c: {
    id: string;
    date: string;
    model: string;
    shift: string | null;
    areaId: string | null;
    inspectedQty: number;
    passedQty: number;
    failedQty: number;
    defectCount: number;
    note: string | null;
    status: RecordStatus;
    version: number;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
  }
): Record<string, unknown> {
  return {
    id: c.id,
    date: c.date,
    model: c.model,
    shift: c.shift,
    areaId: c.areaId,
    inspectedQty: c.inspectedQty,
    passedQty: c.passedQty,
    failedQty: c.failedQty,
    defectCount: c.defectCount,
    note: c.note,
    status: c.status,
    version: c.version,
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "quality.record")) return forbidden();

  const check = await prisma.qualityCheck.findUnique({
    where: { id },
    select: CHECK_SELECT,
  });
  if (!check) return notFound("Quality check tidak ditemukan.");

  if (!canManage(session, check.createdById)) {
    return forbidden("Anda tidak memiliki izin untuk mengubah quality check ini.");
  }

  if (check.status !== RecordStatus.DRAFT) {
    return conflict(
      `Quality check berstatus ${check.status} tidak dapat diedit. Hanya DRAFT yang dapat diedit.`
    );
  }

  const body = await req.json().catch(() => null);
  const error = validateQualityCheckUpdate(body);
  if (error) return badRequest(error);

  if (
    typeof body !== "object" ||
    body === null ||
    Object.keys(body as Record<string, unknown>).length === 0
  ) {
    return badRequest("Tidak ada field yang dapat diubah.");
  }

  const { defects, ...fields } = body as Record<string, unknown> & {
    defects?: unknown;
  };
  const defectsProvided = "defects" in (body as Record<string, unknown>);
  const newDefects = Array.isArray(defects)
    ? (defects as { defectCode: string; defectName: string; quantity: number }[])
    : [];

  const updates: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) {
    if (!EDITABLE_FIELDS.has(key)) continue;
    const value = fields[key];
    if (key === "date") {
      if (typeof value === "string") updates.date = value;
    } else if (key === "model") {
      if (typeof value === "string") updates.model = value.trim();
    } else if (key === "shift") {
      updates.shift = cleanShift(value);
    } else if (key === "areaId") {
      updates.areaId = typeof value === "string" ? value : null;
    } else if (key === "note") {
      updates.note = cleanNote(value);
    } else if (typeof value === "number") {
      updates[key] = value;
    }
  }

  let updated: { id: string; status: RecordStatus; version: number } | null = null;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const res = await tx.qualityCheck.updateMany({
        where: { id, status: check.status },
        data: updates as Prisma.QualityCheckUpdateInput,
      });
      if (res.count === 0) return null;

      if (defectsProvided) {
        await tx.qualityDefect.deleteMany({ where: { checkId: id } });
        if (newDefects.length > 0) {
          await tx.qualityDefect.createMany({
            data: newDefects.map((d) => ({
              checkId: id,
              defectCode: d.defectCode.trim(),
              defectName: d.defectName.trim(),
              quantity: d.quantity,
            })),
          });
        }
      }

      const u = await tx.qualityCheck.findUniqueOrThrow({
        where: { id },
        select: { id: true, status: true, version: true },
      });

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "QUALITY_CHECK_UPDATED",
          entityType: "QUALITY_CHECK",
          entityId: u.id,
          before: snapshotCheck(check) as Prisma.InputJsonValue,
          after: {
            ...updates,
            status: u.status,
            version: u.version,
            defects: newDefects,
          } as Prisma.InputJsonValue,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });

      return u;
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return conflict(QUALITY_DUPLICATE_MESSAGE);
    return internal("Gagal memperbarui quality check.", err);
  }

  if (!updated) return conflict(STALE_MESSAGE);

  return NextResponse.json(
    { check: updated, message: "Quality check berhasil diperbarui." },
    { status: 200 }
  );
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "quality.record")) return forbidden();

  const check = await prisma.qualityCheck.findUnique({
    where: { id },
    select: CHECK_SELECT,
  });
  if (!check) return notFound("Quality check tidak ditemukan.");

  if (!canManage(session, check.createdById)) {
    return forbidden("Anda tidak memiliki izin untuk menghapus quality check ini.");
  }

  if (check.status !== RecordStatus.DRAFT) {
    return conflict(
      `Quality check berstatus ${check.status} tidak dapat dihapus. Hanya DRAFT yang dapat dihapus.`
    );
  }

  let deleted: string | null = null;
  try {
    deleted = await prisma.$transaction(async (tx) => {
      // defect di-cascade oleh DB (onDelete: Cascade di QualityDefect.check)
      const res = await tx.qualityCheck.deleteMany({
        where: { id, status: check.status },
      });
      if (res.count === 0) return null;

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "QUALITY_CHECK_DELETED",
          entityType: "QUALITY_CHECK",
          entityId: check.id,
          before: snapshotCheck(check) as Prisma.InputJsonValue,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });
      return check.id;
    });
  } catch (err) {
    return internal("Gagal menghapus quality check.", err);
  }

  if (!deleted) return conflict(STALE_MESSAGE);

  return NextResponse.json(
    { message: "Quality check berhasil dihapus.", id: deleted },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan PATCH atau DELETE." },
    { status: 405 }
  );
}
