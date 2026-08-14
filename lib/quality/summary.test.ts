// Kunci perilaku buildQualitySummary — jangan ubah tanpa menyesuaikan test.
// Totals = Sigma lalu persen dari totals (yield = Sigma passed / Sigma
// inspected). byDate/byModel dikelompokkan, pareto = buildPareto(defects),
// trend = byDate dipetakan. Kosong -> totals nol persen 0, array kosong.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildQualitySummary, type QualityCheck } from "./summary";
import { round2 } from "./calculate";
import type { ParetoInput } from "./pareto";

const checks: QualityCheck[] = [
  { date: "2026-08-10", model: "M-1", inspectedQty: 100, passedQty: 95, failedQty: 5, defectCount: 3 },
  { date: "2026-08-11", model: "M-2", inspectedQty: 200, passedQty: 180, failedQty: 20, defectCount: 8 },
  { date: "2026-08-10", model: "M-2", inspectedQty: 300, passedQty: 270, failedQty: 30, defectCount: 12 },
];

const defects: ParetoInput[] = [
  { defectCode: "A", defectName: "Scratch", quantity: 50 },
  { defectCode: "B", defectName: "Dent", quantity: 30 },
];

describe("buildQualitySummary", () => {
  it("empty checks & defects -> totals nol persen 0, array kosong", () => {
    const r = buildQualitySummary([], []);
    assert.deepEqual(r, {
      totals: { inspected: 0, passed: 0, failed: 0, defectCount: 0, yieldPct: 0, passRatePct: 0, rejectRatePct: 0, defectRatePct: 0 },
      byDate: [],
      byModel: [],
      pareto: [],
      trend: [],
    });
  });

  it("totals dari Sigma: yield = Sigma passed / Sigma inspected", () => {
    const r = buildQualitySummary(checks, []);
    assert.deepEqual(r.totals, {
      inspected: 600,
      passed: 545,
      failed: 55,
      defectCount: 23,
      yieldPct: round2((545 / 600) * 100), // 90.83
      passRatePct: round2((545 / 600) * 100),
      rejectRatePct: round2((55 / 600) * 100), // 9.17
      defectRatePct: round2((23 / 600) * 100), // 3.83
    });
  });

  it("byDate dikelompokkan per tanggal & diurutkan asc", () => {
    const r = buildQualitySummary(checks, []);
    assert.deepEqual(r.byDate.map((d) => d.date), ["2026-08-10", "2026-08-11"]);
    assert.equal(r.byDate[0].inspected, 400);
    assert.equal(r.byDate[0].passed, 365);
    assert.equal(r.byDate[0].failed, 35);
    assert.equal(r.byDate[0].defectCount, 15);
    assert.equal(r.byDate[0].yieldPct, round2((365 / 400) * 100)); // 91.25
    assert.equal(r.byDate[0].defectRatePct, round2((15 / 400) * 100)); // 3.75
    assert.equal(r.byDate[1].inspected, 200);
    assert.equal(r.byDate[1].yieldPct, 90);
  });

  it("byModel dikelompokkan per model & diurutkan asc", () => {
    const r = buildQualitySummary(checks, []);
    assert.deepEqual(r.byModel.map((m) => m.model), ["M-1", "M-2"]);
    assert.equal(r.byModel[0].inspected, 100);
    assert.equal(r.byModel[0].yieldPct, 95);
    assert.equal(r.byModel[1].inspected, 500);
    assert.equal(r.byModel[1].passed, 450);
    assert.equal(r.byModel[1].yieldPct, 90);
  });

  it("grup dengan inspected 0 -> persen 0 (bukan NaN)", () => {
    const r = buildQualitySummary([{ date: "2026-08-10", model: "M-0", inspectedQty: 0, passedQty: 0, failedQty: 0, defectCount: 0 }], []);
    assert.equal(r.totals.yieldPct, 0);
    assert.equal(r.byDate[0].yieldPct, 0);
    assert.equal(r.byDate[0].defectRatePct, 0);
    assert.equal(r.byModel[0].yieldPct, 0);
    assert.equal(r.trend[0].yieldPct, 0);
  });

  it("pareto = buildPareto(defects)", () => {
    const r = buildQualitySummary([], defects);
    assert.deepEqual(r.pareto, [
      { rank: 1, defectCode: "A", defectName: "Scratch", quantity: 50, percentPct: 62.5, cumulativePct: 62.5 },
      { rank: 2, defectCode: "B", defectName: "Dent", quantity: 30, percentPct: 37.5, cumulativePct: 100 },
    ]);
  });

  it("trend = byDate dipetakan (yieldPct & defectRatePct)", () => {
    const r = buildQualitySummary(checks, []);
    assert.deepEqual(r.trend, [
      { date: "2026-08-10", yieldPct: round2((365 / 400) * 100), defectRatePct: round2((15 / 400) * 100) },
      { date: "2026-08-11", yieldPct: 90, defectRatePct: 4 },
    ]);
  });
});
