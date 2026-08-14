import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@/app/generated/prisma/client";
import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";
import { validateStatusTransition } from "@/lib/quality/validation";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/http/api-error";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const STALE_MESSAGE = "Status quality check sudah berubah. Muat ulang data lalu coba lagi.";
const VALID_STATUSES = new Set<string>(Object.values(RecordStatus));

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const target = body?.status;
  if (typeof target !== "string" || !VALID_STATUSES.has(target)) {
    return badRequest("Status target tidak valid.");
  }
  const reason =
    typeof body?.reason === "string"
      ? body.reason.trim().slice(0, 500)
      : undefined;

  const check = await prisma.qualityCheck.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
      createdById: true,
      approvedById: true,
      reviewedById: true,
    },
  });
  if (!check) return notFound("Quality check tidak ditemukan.");

  const transitionError = validateStatusTransition(check.status, target);
  if (transitionError) return badRequest(transitionError);

  const isSuperAdmin = session.role === RoleName.SUPER_ADMIN;
  let allowed = false;
  if (target === RecordStatus.SUBMITTED) {
    allowed =
      isSuperAdmin ||
      session.permissions.includes("quality.record") ||
      (check.createdById !== null && session.sub === check.createdById);
  } else if (target === RecordStatus.APPROVED || target === RecordStatus.LOCKED) {
    allowed = isSuperAdmin || session.permissions.includes("quality.approve");
  }
  if (!allowed) return forbidden("Anda tidak memiliki izin untuk transisi status ini.");

  const data: Prisma.QualityCheckUpdateInput = {
    status: target as RecordStatus,
  };
  const actorFields: Record<string, unknown> = {};
  if (target === RecordStatus.APPROVED) {
    data.approvedBy = { connect: { id: session.sub } };
    actorFields.approvedById = session.sub;
  } else if (target === RecordStatus.LOCKED) {
    const approverId = check.approvedById ?? session.sub;
    const reviewerId = check.reviewedById ?? session.sub;
    data.approvedBy = { connect: { id: approverId } };
    data.reviewedBy = { connect: { id: reviewerId } };
    actorFields.approvedById = approverId;
    actorFields.reviewedById = reviewerId;
  }

  const updated = await prisma.$transaction(async (tx) => {
    let u: { id: string; status: RecordStatus; version: number } | null = null;
    try {
      u = await tx.qualityCheck.update({
        where: { id },
        data,
        select: { id: true, status: true, version: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return null;
      throw err;
    }
    if (!u) return null;

    const after: Record<string, unknown> = { status: u.status, ...actorFields };
    if (reason) after.reason = reason;
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "QUALITY_CHECK_STATUS_CHANGED",
        entityType: "QUALITY_CHECK",
        entityId: u.id,
        before: { status: check.status },
        after: after as Prisma.InputJsonValue,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return u;
  });

  if (!updated) return conflict(STALE_MESSAGE);

  return NextResponse.json(
    { check: updated, message: `Status berhasil diubah ke ${target}.` },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan PATCH." },
    { status: 405 }
  );
}
