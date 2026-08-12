import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/http/api-error";

export const dynamic = "force-dynamic";

// GET /api/imports/[id]/report — detail satu riwayat + laporan error per
// baris (snapshot ImportHistory.errors: [{rowIndex, errors:[{field,message}]}],
// null → []). SUBPATH [id]/report dipilih supaya tidak bentrok dengan DELETE
// rollback milik agen lain di app/api/imports/[id]/route.ts.
// Response: { item: {id, fileName, rowsTotal, rowsValid, rowsSkipped, status,
// createdAt (ISO), importedBy: {id,name}, recordCount, errors: [...]} }.
const ITEM_SELECT = {
  id: true,
  fileName: true,
  rowsTotal: true,
  rowsValid: true,
  rowsSkipped: true,
  status: true,
  errors: true,
  createdAt: true,
  importedByUser: { select: { id: true, name: true } },
  _count: { select: { records: true } },
} as const;

type Params = { params: Promise<{ id: string }> };

type HistoryRow = {
  id: string;
  fileName: string;
  rowsTotal: number;
  rowsValid: number;
  rowsSkipped: number;
  status: string;
  errors: unknown;
  createdAt: Date;
  importedByUser: { id: string; name: string };
  _count: { records: number };
};

export async function GET(req: Request, { params }: Params) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const { id } = await params;
  const history = await prisma.importHistory.findUnique({
    where: { id },
    select: ITEM_SELECT,
  });
  if (!history) return notFound("Riwayat impor tidak ditemukan.");

  const row = history as HistoryRow;
  return NextResponse.json({
    item: {
      id: row.id,
      fileName: row.fileName,
      rowsTotal: row.rowsTotal,
      rowsValid: row.rowsValid,
      rowsSkipped: row.rowsSkipped,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      importedBy: row.importedByUser,
      recordCount: row._count.records,
      errors: Array.isArray(row.errors) ? row.errors : [],
    },
  });
}