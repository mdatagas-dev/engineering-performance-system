import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { round2 } from "@/lib/records/calculate";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";
import { buildDashboardSummary } from "./summary";

function mk(over: Partial<MockProductionRecord>): MockProductionRecord {
  return {
    id: "x",
    date: "2026-08-12",
    model: "M",
    shift: "1",
    area: null,
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
    totalSetup: 0,
    workingHour: 0,
    totalSetupPacking: 0,
    workingHourPacking: 0,
    status: "DRAFT" as MockProductionRecord["status"],
    version: 1,
    createdByName: "x",
    gapUph: 0,
    gapHc: 2,
    gapOp: 40,
    upph: 2.81,
    ...over,
  };
}

describe("buildDashboardSummary", () => {
  it("KPI seed: output, GAP OP (dari total), UPPH (dari total), setup, hit-rate", () => {
    const s = buildDashboardSummary(mockProductionRecords);

    assert.equal(s.count, 4);
    assert.equal(s.output, 2322); // 1000 + 2 + 680 + 640
    assert.equal(s.plan, 2260); // 960 + 0 + 700 + 600
    assert.equal(s.gapOp, 62); // Σ output − Σ plan = 2322 − 2260 (bukan jumlah GAP per baris)
    assert.equal(s.uphResult, 357);
    assert.equal(s.uphTarget, 355);
    assert.equal(s.hcActual, 118);
    assert.equal(s.hcStandard, 113);
    assert.equal(s.upph, round2(357 / 118)); // 3.03 — formula baris total
    assert.equal(s.setup, 45); // 12 + 8 + 10 + 15
    assert.equal(s.hitRateUph, 75); // GAP UPH ≥ 0: rec 1(0), 2(2), 4(5) → 3/4
  });

  it("byDate terurut naik, kunci per tanggal", () => {
    const s = buildDashboardSummary(mockProductionRecords);
    assert.deepEqual(
      s.byDate.map((d) => d.date),
      ["2026-08-11", "2026-08-12"]
    );
    const d11 = s.byDate[0];
    assert.deepEqual({ plan: d11.plan, output: d11.output, records: d11.records }, { plan: 600, output: 640, records: 1 });
    const d12 = s.byDate[1];
    assert.deepEqual({ plan: d12.plan, output: d12.output, records: d12.records }, { plan: 1660, output: 1682, records: 3 });
  });

  it("byModel: rata-rata UPH, gap dari rata-rata, UPPH dari Σ per model", () => {
    const s = buildDashboardSummary(mockProductionRecords);

    const lv3 = s.byModel.find((m) => m.model === "LV-3000");
    assert.ok(lv3);
    assert.equal(lv3.records, 2);
    assert.equal(lv3.uphTargetAvg, 90);
    assert.equal(lv3.uphResultAvg, 87.5);
    assert.equal(lv3.gapUphAvg, -2.5);
    assert.equal(lv3.hcStandard, 60);
    assert.equal(lv3.hcActual, 62);
    assert.equal(lv3.gapHc, 2);
    assert.equal(lv3.plan, 1660);
    assert.equal(lv3.output, 1680);
    assert.equal(lv3.gapOp, 20);
    assert.equal(lv3.upph, round2(175 / 62)); // 2.82
    assert.equal(lv3.setup, 22);

    const lv5 = s.byModel.find((m) => m.model === "LV-5000");
    assert.ok(lv5);
    assert.equal(lv5.upph, 3.92); // 102 / 26
    assert.equal(lv5.gapOp, 2);

    const lv8 = s.byModel.find((m) => m.model === "LV-8000");
    assert.ok(lv8);
    assert.equal(lv8.upph, 2.67); // 80 / 30
    assert.equal(lv8.gapOp, 40);
  });

  it("input kosong: semua nol, UPPH null, hit-rate 0", () => {
    const s = buildDashboardSummary([]);
    assert.equal(s.count, 0);
    assert.equal(s.output, 0);
    assert.equal(s.gapOp, 0);
    assert.equal(s.upph, null);
    assert.equal(s.hitRateUph, 0);
    assert.deepEqual(s.byDate, []);
    assert.deepEqual(s.byModel, []);
  });

  it("UPPH null bila Σ HC Actual = 0", () => {
    const s = buildDashboardSummary([
      mk({ id: "a", uphResult: 50, hcActual: 0 }),
      mk({ id: "b", uphResult: 30, hcActual: 0 }),
    ]);
    assert.equal(s.upph, null);
    assert.equal(s.uphResult, 80);
  });
});