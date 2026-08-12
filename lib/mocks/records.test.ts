import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCalculated, round2 } from "@/lib/records/calculate";
import { buildRecordTotals, type RecordTotalInput } from "@/lib/records/totals";
import { buildMockRecordTotal, mockProductionRecords, type MockProductionRecord } from "./records";

describe("mockProductionRecords", () => {
  it("calculated field tiap record konsisten dengan mesin kalkulasi", () => {
    for (const r of mockProductionRecords) {
      const calc = calculateCalculated({
        uphTarget: r.uphTarget,
        uphResult: r.uphResult,
        hcStandard: r.hcStandard,
        hcActual: r.hcActual,
        plan: r.plan,
        outputProd: r.outputProd,
      });
      assert.deepEqual(
        { gapUph: r.gapUph, gapHc: r.gapHc, gapOp: r.gapOp, upph: r.upph },
        calc
      );
    }
  });

  it("contoh PRD: 90/90 → GAP UPH 0, HC 30/32 → GAP HC 2, Plan 960/Output 1000 → GAP OP 40", () => {
    const r = mockProductionRecords[0];
    assert.equal(r.gapUph, 0);
    assert.equal(r.gapHc, 2);
    assert.equal(r.gapOp, 40);
    assert.equal(r.upph, 2.81); // 90/32 = 2.8125 → 2.81
  });
});

describe("buildMockRecordTotal", () => {
  const mk = (over: Partial<MockProductionRecord>): MockProductionRecord => ({
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
  });

  it("GAP & UPPH dihitung dari total, bukan jumlah GAP per baris", () => {
    // Skenario PRD: model 2 Plan 0 + Output 1+1 → total Output 1002, GAP OP 42.
    const total = buildMockRecordTotal([
      mk({}),
      mk({ id: "y", uphTarget: 0, uphResult: 0, hcStandard: 0, hcActual: 0, plan: 0, outputProd: 2, gapUph: 0, gapHc: 0, gapOp: 2, upph: null }),
    ]);
    assert.equal(total.plan, 960);
    assert.equal(total.outputProd, 1002);
    assert.equal(total.gapOp, 42);
    assert.equal(total.gapUph, 0);
    assert.equal(total.gapHc, 2);
  });

  it("upph total = ΣuphResult ÷ ΣhcActual, null bila HC Actual 0", () => {
    const rows = mockProductionRecords;
    const total = buildMockRecordTotal(rows);
    const sumResult = rows.reduce((a, r) => a + r.uphResult, 0);
    const sumHc = rows.reduce((a, r) => a + r.hcActual, 0);
    assert.equal(total.upph, round2(sumResult / sumHc));

    const zero = buildMockRecordTotal([mk({ hcActual: 0, outputProd: 0 }), mk({ id: "y", hcActual: 0, uphTarget: 0, uphResult: 0, hcStandard: 0, plan: 0, outputProd: 0, gapUph: 0, gapHc: -32, gapOp: -1000, upph: null })]);
    assert.equal(zero.upph, null);
  });

  it("konsisten dgn lib/records/totals.ts (GAP & UPPH dihitung dari TOTAL)", () => {
    // Kelompok (date, shift) yang sama di seed: 2026-08-12 shift "1" → 2 record.
    const group = mockProductionRecords.filter((r) => r.date === "2026-08-12" && r.shift === "1");
    assert.equal(group.length, 2);
    const inputs: RecordTotalInput[] = group.map((r) => ({
      date: new Date(`${r.date}T00:00:00.000Z`),
      shift: r.shift,
      sums: {
        uphTarget: r.uphTarget,
        uphResult: r.uphResult,
        hcStandard: r.hcStandard,
        hcActual: r.hcActual,
        plan: r.plan,
        outputProd: r.outputProd,
        totalSetup: r.totalSetup,
        workingHour: r.workingHour,
        totalSetupPacking: r.totalSetupPacking,
        workingHourPacking: r.workingHourPacking,
      },
    }));
    const mock = buildMockRecordTotal(group);
    const [dbTotal] = buildRecordTotals(inputs);
    assert.ok(dbTotal);
    for (const f of ["gapUph", "gapHc", "gapOp"] as const) {
      assert.equal(mock[f], dbTotal[f], `gap ${f}`);
    }
    assert.equal(mock.upph, dbTotal.upph);
    assert.equal(mock.outputProd, dbTotal.outputProd);
    assert.equal(mock.plan, dbTotal.plan);
  });
});
