import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { ImportStatus } from "@/app/generated/prisma/enums";
import { unauthorized } from "@/lib/http/api-error";

export const dynamic = "force-dynamic";

// GET /api/imports — daftar riwayat impor terbaru dulu (riwayat + dasar
// laporan). Query params opsional: page (min 1, default 1), perPage (diklem
// [1, 100], default 20), status (SUCCESS|PARTIAL|FAILED; invalid diabaikan).
// Response: { items: [{id, fileName, rowsTotal, rowsValid, rowsSkipped,
// status, createdAt (ISO), importedBy: {id,name}, recordCount}], total, page,
// perPage }. recordCount dari _count.records = jumlah record hasil impor
// (relevan utk rollback agen [id]).
const VALID_STATUSES = new Set<string>(Object.values(ImportStatus));

const ITEM_SELECT = {
  id: true,
  fileName: true,
  rowsTotal: true,
  rowsValid: true,
  rowsSkipped: true,
  status: true,
  createdAt: true,
  importedByUser: { select: { id: true, name: true } },
  _count: { select: { records: true } },
} as const;

type HistoryRow = {
  id: string;
  fileName: string;
  rowsTotal: number;
  rowsValid: number;
  rowsSkipped: number;
  status: ImportStatus;
  createdAt: Date;
  importedByUser: { id: string; name: string };
  _count: { records: number };
};

function serializeItem(row: HistoryRow) {
  return {
    id: row.id,
    fileName: row.fileName,
    rowsTotal: row.rowsTotal,
    rowsValid: row.rowsValid,
    rowsSkipped: row.rowsSkipped,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    importedBy: row.importedByUser,
    recordCount: row._count.records,
  };
}

export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 20) || 20));
  const statusParam = url.searchParams.get("status");
  const where = statusParam && VALID_STATUSES.has(statusParam) ? { status: statusParam as ImportStatus } : {};

  const [items, total] = await Promise.all([
    prisma.importHistory.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: ITEM_SELECT,
    }),
    prisma.importHistory.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(serializeItem),
    total,
    page,
    perPage,
  });
}