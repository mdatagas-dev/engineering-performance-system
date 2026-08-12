import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRecordsQuery } from "@/lib/records/query";
import { badRequest, internal } from "@/lib/http/api-error";
import { buildCompareResponse, TREND_SUM } from "@/lib/trends/backend";
import { windowDays } from "@/lib/trends/compare";
import { addDays } from "@/lib/dashboard/dates";

export const dynamic = "force-dynamic";

// GET /api/trends/compare — perbandingan periode kini vs N hari sebelumnya.
// Algoritma 1:1 dengan lib/trends/compare.ts comparePeriods (frontend):
//   N = diffDays(from,to) + 1; window sebelumnya = addDays(from,-N)..
//   addDays(to,-N); avgUpph = Σ uphResult ÷ Σ hcActual (round2);
//   avgHc = Σ hcActual ÷ JUMLAH RECORD (round2); delta persen guard /0 → null.
//
// QUERY PARAMS:
// - from/to — WAJIB, ISO YYYY-MM-DD valid; to < from → 400.
// - model / models / areaId / area / shift — opsional, semantik
//   buildRecordsQuery (sama dengan /api/trends/series).
//
// RESPONSE: PeriodComparison frontend — { windowDays, previousFrom,
// previousTo, current: {totalOutput, avgUpph, totalSetup, avgHc}, previous:
// {...}, deltas: {output, upph, setup, hc: {absolute, percent}} }.

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return badRequest("Parameter from dan to wajib berupa tanggal valid (YYYY-MM-DD).");
  }
  if (to < from) {
    return badRequest("Parameter to harus sama dengan atau setelah from.");
  }

  const days = windowDays(from, to);
  const previousFrom = addDays(from, -days);
  const previousTo = addDays(to, -days);

  const filters = {
    model: url.searchParams.get("model") ?? undefined,
    models: url.searchParams.get("models") ?? undefined,
    areaId: url.searchParams.get("areaId") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    shift: url.searchParams.get("shift") ?? undefined,
  };

  try {
    const [current, previous] = await Promise.all([
      prisma.productionRecord.aggregate({
        where: buildRecordsQuery({ ...filters, from, to }).where,
        _sum: TREND_SUM,
        _count: true,
      }),
      prisma.productionRecord.aggregate({
        where: buildRecordsQuery({ ...filters, from: previousFrom, to: previousTo }).where,
        _sum: TREND_SUM,
        _count: true,
      }),
    ]);
    return NextResponse.json(buildCompareResponse(current, previous, from, to));
  } catch (err) {
    return internal("Gagal membandingkan periode.", err);
  }
}