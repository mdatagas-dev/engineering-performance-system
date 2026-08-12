// Backend pure utk endpoint Analisis Tren (/api/trends/*) — testable tanpa DB.
// Route hanya bertugas: parse query → aggregate Prisma → service ini → JSON.
// Shape output = shape frontend (lib/trends/series.ts buildSeries &
// lib/trends/compare.ts comparePeriods) supaya frontend bisa migrasi
// mock→API tanpa rombak besar.

import type { Prisma } from "@/app/generated/prisma/client";
import type { TrendPoint } from "./series";
import { compareWindowSums, type PeriodComparison, type TrendSums } from "./compare";

// Lima numerik Σ per tanggal — subset RECORD_TOTAL_SUM (lib/records/totals.ts)
// yang dipakai garis tren & perbandingan periode. Tipe Prisma sama untuk
// groupBy._sum maupun aggregate._sum.
export const TREND_SUM = {
  uphResult: true,
  outputProd: true,
  hcActual: true,
  hcStandard: true,
  totalSetup: true,
} satisfies Prisma.ProductionRecordSumAggregateInputType;

export type TrendSumField = keyof typeof TREND_SUM;

export const TREND_SUM_FIELDS = Object.keys(TREND_SUM) as TrendSumField[];

// Baris hasil prisma groupBy by:["date"] (atau by:["date","shift"]).
export type TrendRawRow = {
  date: Date;
  shift?: string | null;
  _sum?: Partial<Record<TrendSumField, number | null>> | null;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// NULL-SAFETY (keputusan): kolom numerik ProductionRecord adalah Float NOT
// NULL (prisma/schema.prisma) → SUM Postgres atas grup non-kosong tidak pernah
// null; tipe `number | null` hanyalah warisan generik Prisma utk kolom
// nullable. groupBy hanya menghasilkan grup dengan ≥ 1 record, jadi `_sum`
// null ⇒ coerce ke 0 (konsisten ZERO buildSeries). Pola "null bila semua
// record null" dipertahankan sebagai komentar do-below: bila kelak ada kolom
// nullable di sini, coerce `_sum.X` dgn `X === null ? null : (X ?? 0)`.
export function summarizeSums(sums: Partial<Record<TrendSumField, number | null>> | null | undefined): TrendSums {
  return {
    uphResult: sums?.uphResult ?? 0,
    outputProd: sums?.outputProd ?? 0,
    hcActual: sums?.hcActual ?? 0,
    hcStandard: sums?.hcStandard ?? 0,
    totalSetup: sums?.totalSetup ?? 0,
  };
}

export type TrendPointWithShift = TrendPoint & { shift: string | null };

// groupBy by-date (default) → points asc SAMA SHAPE buildSeries. includeShift
// menambah field shift per titik (drill-down shift; bukan kontrak default).
export function buildTrendPoints(rows: TrendRawRow[], includeShift?: false): TrendPoint[];
export function buildTrendPoints(rows: TrendRawRow[], includeShift?: boolean): TrendPointWithShift[];
export function buildTrendPoints(rows: TrendRawRow[], includeShift = false): TrendPoint[] | TrendPointWithShift[] {
  return rows
    .map((row) => {
      const base: TrendPoint = { date: toIsoDate(row.date), ...summarizeSums(row._sum) };
      if (includeShift && "shift" in row) {
        return { ...base, shift: row.shift ?? null } as TrendPointWithShift;
      }
      return base;
    })
    .sort((a, b) => a.date.localeCompare(b.date)) as TrendPoint[] | TrendPointWithShift[];
}

// Hasil prisma aggregate `{ _sum: {...}, _count: true }` (count = JUMLAH
// RECORD, bukan tanggal — avgHc memakai denominator record, sama frontend).
export type TrendAggregateResult = {
  _sum?: Partial<Record<TrendSumField, number | null>> | null;
  _count: number | { _all: number };
};

// Agregat kedua jendela → PeriodComparison SAMA SHAPE comparePeriods.
// from/to = jendela KINI (valid di route); window sebelumnya dihitung ulang
// dengan windowDays(compare.ts) sehingga hasilnya identik dengan comparePeriods.
export function buildCompareResponse(
  current: TrendAggregateResult,
  previous: TrendAggregateResult,
  from: string,
  to: string
): PeriodComparison {
  return compareWindowSums(
    { sums: summarizeSums(current._sum), count: aggregateCount(current._count) },
    { sums: summarizeSums(previous._sum), count: aggregateCount(previous._count) },
    from,
    to
  );
}

function aggregateCount(count: number | { _all: number }): number {
  return typeof count === "number" ? count : count._all;
}