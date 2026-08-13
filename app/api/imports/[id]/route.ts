import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { RecordStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { notFound, unauthorized, conflict, internal, badRequest } from "@/lib/http/api-error";
import {
  hasNonDraft,
  buildRollbackAudit,
  NON_DRAFT_MESSAGE,
  ROLLBACK_DONE_MESSAGE,
} from "@/lib/exporter/rollback";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/imports/[id] — rollback impor: hapus ProductionRecord hasil
// impor (importHistoryId = id) yang masih DRAFT. Keputusan: hard-stop 409 bila
// ada record non-DRAFT (seluruh import milik mereka juga tidak dihapus) —
// record yang sudah masuk workflow (SUBMITTED+) tidak boleh hilang diam-diam.
// Idempoten: rollback berulang → deleteMany 0 → 200 { deletedCount: 0 }.
// AuditLog IMPORT_ROLLED_BACK (entityType IMPORT_HISTORY) dicatat di transaksi
// yang sama. Versi record ikut terhapus (FK ProductionRecordVersion.recordId
// ON DELETE CASCADE + trigger immutability mengecualikan aksi FK depth >= 2 —
// lihat prisma/migrations/enforce_history_immutability).
export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  if (!id) return badRequest("id impor wajib diisi.");

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const importHistory = await prisma.importHistory.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      rowsTotal: true,
      rowsValid: true,
      rowsSkipped: true,
      status: true,
      records: { select: { status: true } },
    },
  });
  if (!importHistory) {
    return notFound("Data impor tidak ditemukan.");
  }

  // hard-stop: ada record non-DRAFT → tolak seluruh rollback (keputusan (i)).
  if (hasNonDraft(importHistory.records)) return conflict(NON_DRAFT_MESSAGE);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // filter DRAFT lagi di level delete (defense in depth terhadap status
      // yang berubah setelah pre-check) — hanya DRAFT yang dihapus.
      const deleted = await tx.productionRecord.deleteMany({
        where: { importHistoryId: id, status: RecordStatus.DRAFT },
      });
      const remaining = await tx.productionRecord.count({
        where: { importHistoryId: id },
      });

      const audit = buildRollbackAudit(
        {
          fileName: importHistory.fileName,
          rowsTotal: importHistory.rowsTotal,
          rowsValid: importHistory.rowsValid,
          rowsSkipped: importHistory.rowsSkipped,
          status: importHistory.status,
          recordCount: importHistory.records.length,
        },
        deleted.count,
        remaining
      );
      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "IMPORT_ROLLED_BACK",
          entityType: "IMPORT_HISTORY",
          entityId: importHistory.id,
          before: audit.before as Prisma.InputJsonValue,
          after: audit.after as Prisma.InputJsonValue,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });

      return { deletedCount: deleted.count, remaining };
    });

    return NextResponse.json(
      {
        importHistory: { id: importHistory.id, fileName: importHistory.fileName },
        deletedCount: result.deletedCount,
        remaining: result.remaining,
        message: ROLLBACK_DONE_MESSAGE,
      },
      { status: 200 }
    );
  } catch (err) {
    return internal("Gagal me-rollback impor.", err);
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan DELETE." },
    { status: 405 }
  );
}