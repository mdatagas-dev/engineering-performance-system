import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import type { Prisma } from "@/app/generated/prisma/client";
import { unauthorized, internal } from "@/lib/http/api-error";
import { buildExportQuery } from "@/lib/exporter/query";
import { EXPORT_SELECT } from "@/lib/exporter/fields";
import { buildExportCsv, buildExportFilename } from "@/lib/exporter/csv";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

// GET /api/export — ekspor CSV seluruh record sesuai filter (sama persis
// GET /api/records: status/from/to/model/models/areaId/area/shift/sort/order;
// page/perPage DIABAIKAN — semuanya diekspor, cap EXPORT_MAX_ROWS baris).
// Format CSV identik mock frontend (BOM \uFEFF + ";" + desimal titik + header
// 17 kolom "Date;Model;Shift;UPH Target;...") lewat buildExportCsv (REUSE
// lib/imports/csv.ts). Audit EXPORTED dicatat (entityType PRODUCTION_RECORD,
// before = filter, after = count) — tanpa entityId (bukan mutasi satu record).
export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const { filter, where, orderBy, take } = buildExportQuery(new URL(req.url));

  try {
    const [rows, total] = await Promise.all([
      prisma.productionRecord.findMany({ where, orderBy, take, select: EXPORT_SELECT }),
      prisma.productionRecord.count({ where }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: session.sub,
        action: "EXPORTED",
        entityType: "PRODUCTION_RECORD",
        entityId: null,
        before: { filter } as Prisma.InputJsonValue,
        after: { count: total, exportedCount: rows.length } as Prisma.InputJsonValue,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });

    const csv = buildExportCsv(rows);
    const filename = buildExportFilename();
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return internal("Gagal mengekspor data.", err);
  }
}