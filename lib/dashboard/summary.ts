import type { MockProductionRecord } from "@/lib/mocks/records";
import { round2 } from "@/lib/records/calculate";

// Agregasi KPI dashboard — murni & testable. Semua KPI dihitung DARI data,
// bukan hardcode, dengan formula yang sama seperti baris total Excel/PRD:
// gapOp = Σ output − Σ plan, UPPH = Σ uphResult ÷ Σ hcActual (round 2, null
// bila HC Actual 0), hit-rate UPH = % record dengan GAP UPH ≥ 0.

export type DateGroup = {
  date: string;
  plan: number;
  output: number;
  records: number;
};

export type ModelGroup = {
  model: string;
  records: number;
  uphTargetAvg: number;
  uphResultAvg: number;
  gapUphAvg: number;
  hcStandard: number;
  hcActual: number;
  gapHc: number;
  plan: number;
  output: number;
  gapOp: number;
  upph: number | null;
  setup: number;
};

export type DashboardSummary = {
  count: number;
  plan: number;
  output: number;
  gapOp: number;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  upph: number | null;
  setup: number;
  hitRateUph: number; // persen 0..100 (0 bila tidak ada record)
  byDate: DateGroup[];
  byModel: ModelGroup[];
};

export function buildDashboardSummary(records: MockProductionRecord[]): DashboardSummary {
  let count = 0;
  let plan = 0;
  let output = 0;
  let uphTarget = 0;
  let uphResult = 0;
  let hcStandard = 0;
  let hcActual = 0;
  let setup = 0;
  let hits = 0;

  const dateMap = new Map<string, DateGroup>();
  type ModelSums = {
    records: number;
    uphTarget: number;
    uphResult: number;
    hcStandard: number;
    hcActual: number;
    plan: number;
    output: number;
    setup: number;
  };
  const modelSums = new Map<string, ModelSums>();

  for (const r of records) {
    count += 1;
    plan += r.plan;
    output += r.outputProd;
    uphTarget += r.uphTarget;
    uphResult += r.uphResult;
    hcStandard += r.hcStandard;
    hcActual += r.hcActual;
    setup += r.totalSetup;
    if (r.gapUph >= 0) hits += 1;

    const d = dateMap.get(r.date) ?? { date: r.date, plan: 0, output: 0, records: 0 };
    d.plan += r.plan;
    d.output += r.outputProd;
    d.records += 1;
    dateMap.set(r.date, d);

    const m = modelSums.get(r.model) ?? {
      records: 0,
      uphTarget: 0,
      uphResult: 0,
      hcStandard: 0,
      hcActual: 0,
      plan: 0,
      output: 0,
      setup: 0,
    };
    m.records += 1;
    m.uphTarget += r.uphTarget;
    m.uphResult += r.uphResult;
    m.hcStandard += r.hcStandard;
    m.hcActual += r.hcActual;
    m.plan += r.plan;
    m.output += r.outputProd;
    m.setup += r.totalSetup;
    modelSums.set(r.model, m);
  }

  const byDate = [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const byModel = [...modelSums.entries()]
    .map(([model, m]) => ({
      model,
      records: m.records,
      uphTargetAvg: round2(m.uphTarget / m.records),
      uphResultAvg: round2(m.uphResult / m.records),
      gapUphAvg: round2(m.uphResult / m.records - m.uphTarget / m.records),
      hcStandard: m.hcStandard,
      hcActual: m.hcActual,
      gapHc: round2(m.hcActual - m.hcStandard),
      plan: m.plan,
      output: m.output,
      gapOp: round2(m.output - m.plan),
      upph: m.hcActual === 0 ? null : round2(m.uphResult / m.hcActual),
      setup: m.setup,
    }))
    .sort((a, b) => a.model.localeCompare(b.model));

  return {
    count,
    plan,
    output,
    gapOp: round2(output - plan),
    uphTarget,
    uphResult,
    hcStandard,
    hcActual,
    upph: hcActual === 0 ? null : round2(uphResult / hcActual),
    setup,
    hitRateUph: count === 0 ? 0 : round2((hits / count) * 100),
    byDate,
    byModel,
  };
}