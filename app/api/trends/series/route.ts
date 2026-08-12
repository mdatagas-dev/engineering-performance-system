import { NextResponse } from "next/server";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildRecordsQuery } from "@/lib/records/query";
import { internal } from "@/lib/http/api-error";
import { buildTrendPoints, TREND_SUM } from "@/lib/trends/backend";

export const dynamic = "force-dynamic";

// GET /api/trends/series — seri tren historis (Σ numerik per tanggal, asc).
//
// QUERY PARAMS (semua optional, semantik DITURUNKAN dari buildRecordsQuery —
// single source-of-truth filter records, termasuk NaN-guard & date end-of-day):
// - from/to   — rentang ISO YYYY-MM-DD inklusif; tanpa keduanya = semua data.
// - model     — partial match case-insensitive.
// - models    — daftar exact comma-separated (mengoverride model).
// - areaId    — equality.
// - area      — nama area, partial match case-insensitive.
// - shift     — equality.
// - groupShift — "true" → groupBy by [date, shift] (drill-down shift; default
//   by [date] SAMA dengan buildSeries frontend: Σ per tanggal).
//
// RESPONSE: { points: [{ date: "YYYY-MM-DD", uphResult, outputProd, hcActual,
// hcStandard, totalSetup }] } — nilai numerik selalu angka (null → 0; kolom
// schema NOT NULL, lihat summarizeSums). Date diambil dari kolom @db.Date via
// toISOString().slice(0,10), format sama buildRecordTotals.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { where } = buildRecordsQuery({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
    models: url.searchParams.get("models") ?? undefined,
    areaId: url.searchParams.get("areaId") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    shift: url.searchParams.get("shift") ?? undefined,
  });

  const groupShift = url.searchParams.get("groupShift") === "true";
  const by: Prisma.ProductionRecordScalarFieldEnum[] = groupShift ? ["date", "shift"] : ["date"];

  try {
    const rows = await prisma.productionRecord.groupBy({
      where,
      by,
      _sum: TREND_SUM,
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ points: buildTrendPoints(rows, groupShift) });
  } catch (err) {
    return internal("Gagal mengambil data tren.", err);
  }
}