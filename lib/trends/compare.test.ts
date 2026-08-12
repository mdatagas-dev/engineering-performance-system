import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords } from "@/lib/mocks/records";
import { comparePeriods, recordsInRange } from "./compare";

const AUG11_RECORDS = mockProductionRecords.filter((r) => r.date === "2026-08-11");
const AUG12_RECORDS = mockProductionRecords.filter((r) => r.date === "2026-08-12");

describe("recordsInRange", () => {
  it("rentang inklusif di kedua ujung", () => {
    assert.equal(recordsInRange(mockProductionRecords, "2026-08-11", "2026-08-12").length, 4);
    assert.equal(recordsInRange(mockProductionRecords, "2026-08-12", "2026-08-12").length, 3);
    assert.equal(recordsInRange(mockProductionRecords, "2026-08-13", "2026-08-30").length, 0);
  });
});

describe("comparePeriods", () => {
  it("jendela sebelumnya = N hari kalender yang sama persis sebelum kini", () => {
    const c = comparePeriods(mockProductionRecords, "2026-08-06", "2026-08-12");
    assert.equal(c.windowDays, 7);
    assert.equal(c.previousFrom, "2026-07-30");
    assert.equal(c.previousTo, "2026-08-05");
  });

  it("Hari Ini (08-12) vs kemarin (08-11): metrik & delta benar", () => {
    const c = comparePeriods(mockProductionRecords, "2026-08-12", "2026-08-12");
    assert.equal(c.windowDays, 1);
    // Kini = 3 record 08-12.
    assert.equal(c.current.totalOutput, 1682);
    assert.equal(c.current.totalSetup, 30);
    assert.equal(c.current.avgUpph, 3.15); // Σ277 ÷ Σ88
    assert.equal(c.current.avgHc, 29.33); // Σ88 ÷ 3
    // Sebelumnya = 1 record 08-11.
    assert.equal(c.previous.totalOutput, 640);
    assert.equal(c.previous.totalSetup, 15);
    assert.equal(c.previous.avgUpph, 2.67); // 80 ÷ 30
    assert.equal(c.previous.avgHc, 30);
    // Delta.
    assert.deepEqual(c.deltas.output, { absolute: 1042, percent: 162.81 });
    assert.deepEqual(c.deltas.upph, { absolute: 0.48, percent: 17.98 });
    assert.deepEqual(c.deltas.setup, { absolute: 15, percent: 100 });
    assert.deepEqual(c.deltas.hc, { absolute: -0.67, percent: -2.23 });
  });

  it("guard pembagian nol: sebelumnya kosong/0 → delta persen null (UI '—')", () => {
    const c = comparePeriods(AUG12_RECORDS, "2026-08-12", "2026-08-12");
    assert.equal(c.previous.totalOutput, 0);
    assert.equal(c.previous.avgUpph, null);
    assert.equal(c.previous.avgHc, null);
    assert.deepEqual(c.deltas.output, { absolute: 1682, percent: null });
    assert.deepEqual(c.deltas.upph, { absolute: null, percent: null });
    assert.deepEqual(c.deltas.hc, { absolute: null, percent: null });
  });

  it("record di luar kedua window diabaikan", () => {
    const c = comparePeriods([...AUG11_RECORDS, ...AUG12_RECORDS], "2026-08-11", "2026-08-11");
    assert.equal(c.current.totalOutput, 640);
    assert.equal(c.previous.totalOutput, 0);
    assert.deepEqual(c.deltas.output, { absolute: 640, percent: null });
  });

  it("input kosong → metrik nol & delta null, tanpa error", () => {
    const c = comparePeriods([], "2026-08-01", "2026-08-07");
    assert.equal(c.current.totalOutput, 0);
    assert.equal(c.current.avgUpph, null);
    assert.equal(c.current.avgHc, null);
    assert.deepEqual(c.deltas.output, { absolute: 0, percent: null });
  });
});