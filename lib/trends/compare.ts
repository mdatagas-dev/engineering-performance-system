import type { MockProductionRecord } from "@/lib/mocks/records";
import { round2 } from "@/lib/records/calculate";
import { addDays } from "@/lib/dashboard/dates";

// Perbandingan periode (sekarang vs N-HARI SAMA sebelumnya) — PURE & testable.
// Formula mengikuti baris total Tabel Produksi Harian: numerik dijumlahkan;
// UPPH rata-rata = Σ UPH Result ÷ Σ HC Actual (bukan rata-rata per record);
// HC rata-rata = Σ HC Actual ÷ jumlah record periode.
// Delta persen guard pembagian nol: previous 0/null → null (UI tampil "—").
// Input dianggap SUDAH terfilter.

export type PeriodMetrics = {
  totalOutput: number; // Σ Output Prod
  avgUpph: number | null; // Σ UPH Result ÷ Σ HC Actual (round2) · null bila HC = 0
  totalSetup: number; // Σ Total Setup
  avgHc: number | null; // Σ HC Actual ÷ count (round2) · null bila periode kosong
};

export type PeriodDelta = {
  absolute: number | null; // kini − sebelumnya · null bila salah satu null
  percent: number | null; // (kini − sebelumnya) ÷ sebelumnya × 100 (round2) · null bila sebelumnya 0/null
};

export type PeriodComparison = {
  windowDays: number; // panjang jendela kini dalam hari kalender (≥ 1)
  previousFrom: string; // YYYY-MM-DD awal jendela sebelumnya
  previousTo: string; // YYYY-MM-DD akhir jendela sebelumnya
  current: PeriodMetrics;
  previous: PeriodMetrics;
  deltas: { output: PeriodDelta; upph: PeriodDelta; setup: PeriodDelta; hc: PeriodDelta };
};

export function recordsInRange(records: MockProductionRecord[], from: string, to: string): MockProductionRecord[] {
  return records.filter((r) => r.date >= from && r.date <= to);
}

// Jumlah hari kalender antar dua tanggal inklusif (sama-sama null never — from/to wajib).
// Di-export agar endpoint /api/trends/compare memakai perhitungan window yang
// sama persis dengan banding frontend (single source-of-truth algoritma).
export function windowDays(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

// Total Σ dari kelima numerik seri tren — input agregat (groupBy/aggregate
// SQL) maupun penjumlahan manual record. hcStandard ikut di-Σ hanya untuk
// seri; metrik periode TIDAK memakainya (selaras frontend PeriodMetrics).
export type TrendSums = {
  uphResult: number;
  outputProd: number;
  hcActual: number;
  hcStandard: number;
  totalSetup: number;
};

// Input metrik periode dari agregat SQL: Σ + jumlah RECORD (bukan jumlah
// tanggal!) — avgHc = Σ HC Actual ÷ jumlah record, sama dengan metricsFor.
export type CompareMetricsInput = {
  sums: TrendSums;
  count: number;
};

// metrik periode dari agregat — jalur tunggal yang dipakai API; metricsFor
// (jalur record-array frontend) memanggil ini agar tidak ada drift formula.
export function metricsFromSums(sums: TrendSums, count: number): PeriodMetrics {
  return {
    totalOutput: sums.outputProd,
    avgUpph: sums.hcActual === 0 ? null : round2(sums.uphResult / sums.hcActual),
    totalSetup: sums.totalSetup,
    avgHc: count === 0 ? null : round2(sums.hcActual / count),
  };
}

function sumsOf(records: MockProductionRecord[]): TrendSums {
  return {
    uphResult: records.reduce((acc, r) => acc + r.uphResult, 0),
    outputProd: records.reduce((acc, r) => acc + r.outputProd, 0),
    hcActual: records.reduce((acc, r) => acc + r.hcActual, 0),
    hcStandard: records.reduce((acc, r) => acc + r.hcStandard, 0),
    totalSetup: records.reduce((acc, r) => acc + r.totalSetup, 0),
  };
}

function deltaFor(current: number | null, previous: number | null): PeriodDelta {
  if (current === null || previous === null) return { absolute: null, percent: null };
  const absolute = round2(current - previous);
  const percent = previous === 0 ? null : round2(((current - previous) / previous) * 100);
  return { absolute, percent };
}

// Perbandingan dua jendela AGREGAT (dipakai endpoint /api/trends/compare):
// window sebelumnya dihitung dengan algoritma PERSIS comparePeriods
// (N = diffDays+1 hari kalender, digeser mundur N hari). Endpoint memakai ini
// agar respons API = hasil frontend comparePeriods bila diterapkan pada data
// yang sama.
export function compareWindowSums(
  current: CompareMetricsInput,
  previous: CompareMetricsInput,
  from: string,
  to: string
): PeriodComparison {
  const days = windowDays(from, to);
  const previousFrom = addDays(from, -days);
  const previousTo = addDays(to, -days);
  const cur = metricsFromSums(current.sums, current.count);
  const prev = metricsFromSums(previous.sums, previous.count);
  return {
    windowDays: days,
    previousFrom,
    previousTo,
    current: cur,
    previous: prev,
    deltas: {
      output: deltaFor(cur.totalOutput, prev.totalOutput),
      upph: deltaFor(cur.avgUpph, prev.avgUpph),
      setup: deltaFor(cur.totalSetup, prev.totalSetup),
      hc: deltaFor(cur.avgHc, prev.avgHc),
    },
  };
}

export function comparePeriods(records: MockProductionRecord[], from: string, to: string): PeriodComparison {
  const days = windowDays(from, to);
  const previousFrom = addDays(from, -days);
  const previousTo = addDays(to, -days);
  const current = recordsInRange(records, from, to);
  const previous = recordsInRange(records, previousFrom, previousTo);
  return compareWindowSums(
    { sums: sumsOf(current), count: current.length },
    { sums: sumsOf(previous), count: previous.length },
    from,
    to
  );
}