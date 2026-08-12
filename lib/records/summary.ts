// Ringkasan KPI data produksi (TASK tampilkan-kpi-cards-dan-ringkasan) — murni
// & testable di node:test; UI (components/kpi-summary.tsx) hanya memformat.
//
// Aturan angka mengikuti mesin kalkulasi 1:1 Excel:
//  - GAP OP & GAP HC dihitung DARI TOTAL (ΣOutput − ΣPlan, ΣHC Act − ΣHC Std),
//    bukan jumlah gap per baris (bisa beda akibat pembulatan — sama seperti
//    totals.ts / buildMockRecordTotal).
//  - avgUpph = ΣuphResult ÷ ΣhcActual (round 2), null bila HC total 0.
//  - hitRateUph = proporsi record dengan UPH Result ≥ UPH Target (%). Tidak
//    memakai Σ karena target per model bisa beda.
// Tidak ada nilai mock — semua dihitung dari data yang diberikan.

import { calculateCalculated, round2 } from "./calculate";
import type { MockProductionRecord } from "@/lib/mocks/records";

export type ProductionSummary = {
  count: number;
  totalOutput: number;
  totalPlan: number;
  gapOp: number;
  avgUpph: number | null;
  totalSetup: number;
  hcActual: number;
  hcStandard: number;
  gapHc: number;
  uphHitCount: number;
  uphTotalCount: number;
  hitRateUph: number;
};

function sum(list: MockProductionRecord[], field: "outputProd" | "plan" | "totalSetup" | "hcActual" | "hcStandard" | "uphResult"): number {
  return list.reduce((acc, r) => acc + r[field], 0);
}

export function buildProductionSummary(records: MockProductionRecord[]): ProductionSummary {
  const totalOutput = sum(records, "outputProd");
  const totalPlan = sum(records, "plan");
  const hcActual = sum(records, "hcActual");
  const hcStandard = sum(records, "hcStandard");
  const avgUpph = hcActual === 0 ? null : round2(sum(records, "uphResult") / hcActual);
  const uphHitCount = records.filter((r) => r.uphResult >= r.uphTarget).length;
  const uphTotalCount = records.length;
  const calc = calculateCalculated({
    uphTarget: 0,
    uphResult: 0,
    hcStandard,
    hcActual,
    plan: totalPlan,
    outputProd: totalOutput,
  });
  return {
    count: records.length,
    totalOutput,
    totalPlan,
    gapOp: calc.gapOp,
    avgUpph,
    totalSetup: sum(records, "totalSetup"),
    hcActual,
    hcStandard,
    gapHc: calc.gapHc,
    uphHitCount,
    uphTotalCount,
    hitRateUph: uphTotalCount === 0 ? 0 : round2((uphHitCount / uphTotalCount) * 100),
  };
}