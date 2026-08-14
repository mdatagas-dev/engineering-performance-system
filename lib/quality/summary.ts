// Ringkasan kualitas (summary quality inspection) — murni & testable.
// Totals diagregasi dulu (Sigma inspected/passed/failed/defectCount), lalu
// persen dihitung DARI totals (yield = Sigma passed / Sigma inspected),
// konsisten dengan aturan totals.ts / dashboard/summary.ts (bukan rata-rata
// persen per baris). byDate & byModel dikelompokkan, pareto = buildPareto(defects),
// trend = byDate yang dipetakan. Input kosong -> totals nol dengan persen 0.

import { calculateQualityMetrics, round2 } from "./calculate";
import { buildPareto, type ParetoInput, type ParetoRow } from "./pareto";

export type QualityCheck = {
  date: string;
  model: string;
  shift?: string;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectCount: number;
};

export type QualityTotals = {
  inspected: number;
  passed: number;
  failed: number;
  defectCount: number;
  yieldPct: number;
  passRatePct: number;
  rejectRatePct: number;
  defectRatePct: number;
};

export type QualityDateRow = {
  date: string;
  inspected: number;
  passed: number;
  failed: number;
  defectCount: number;
  yieldPct: number;
  defectRatePct: number;
};

export type QualityModelRow = {
  model: string;
  inspected: number;
  passed: number;
  failed: number;
  defectCount: number;
  yieldPct: number;
  defectRatePct: number;
};

export type QualityTrendPoint = {
  date: string;
  yieldPct: number;
  defectRatePct: number;
};

export type QualitySummary = {
  totals: QualityTotals;
  byDate: QualityDateRow[];
  byModel: QualityModelRow[];
  pareto: ParetoRow[];
  trend: QualityTrendPoint[];
};

type GroupSums = {
  date: string;
  model: string;
  inspected: number;
  passed: number;
  failed: number;
  defectCount: number;
};

function groupMetrics(inspected: number, passed: number, defectCount: number) {
  const yieldPct = inspected === 0 ? 0 : round2((passed / inspected) * 100);
  const defectRatePct = inspected === 0 ? 0 : round2((defectCount / inspected) * 100);
  return { yieldPct, defectRatePct };
}

export function buildQualitySummary(
  checks: QualityCheck[],
  defects: ParetoInput[]
): QualitySummary {
  let inspected = 0;
  let passed = 0;
  let failed = 0;
  let defectCount = 0;

  const dateMap = new Map<string, GroupSums>();
  const modelMap = new Map<string, GroupSums>();

  for (const c of checks) {
    inspected += c.inspectedQty;
    passed += c.passedQty;
    failed += c.failedQty;
    defectCount += c.defectCount;

    const d = dateMap.get(c.date) ?? {
      date: c.date,
      model: "",
      inspected: 0,
      passed: 0,
      failed: 0,
      defectCount: 0,
    };
    d.inspected += c.inspectedQty;
    d.passed += c.passedQty;
    d.failed += c.failedQty;
    d.defectCount += c.defectCount;
    dateMap.set(c.date, d);

    const m = modelMap.get(c.model) ?? {
      date: "",
      model: c.model,
      inspected: 0,
      passed: 0,
      failed: 0,
      defectCount: 0,
    };
    m.inspected += c.inspectedQty;
    m.passed += c.passedQty;
    m.failed += c.failedQty;
    m.defectCount += c.defectCount;
    modelMap.set(c.model, m);
  }

  const totals: QualityTotals = {
    inspected,
    passed,
    failed,
    defectCount,
    ...calculateQualityMetrics({ inspectedQty: inspected, passedQty: passed, failedQty: failed, defectCount }),
  };

  const byDate: QualityDateRow[] = [...dateMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((g) => ({
      date: g.date,
      inspected: g.inspected,
      passed: g.passed,
      failed: g.failed,
      defectCount: g.defectCount,
      ...groupMetrics(g.inspected, g.passed, g.defectCount),
    }));

  const byModel: QualityModelRow[] = [...modelMap.values()]
    .sort((a, b) => a.model.localeCompare(b.model))
    .map((g) => ({
      model: g.model,
      inspected: g.inspected,
      passed: g.passed,
      failed: g.failed,
      defectCount: g.defectCount,
      ...groupMetrics(g.inspected, g.passed, g.defectCount),
    }));

  const trend: QualityTrendPoint[] = byDate.map((g) => ({
    date: g.date,
    yieldPct: g.yieldPct,
    defectRatePct: g.defectRatePct,
  }));

  return {
    totals,
    byDate,
    byModel,
    pareto: buildPareto(defects),
    trend,
  };
}
