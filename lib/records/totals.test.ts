import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRecordTotals, type RecordTotalInput } from "./totals";

const sums = (over: Partial<RecordTotalInput["sums"]> = {}): RecordTotalInput["sums"] => ({
  uphTarget: 100,
  uphResult: 120,
  hcStandard: 50,
  hcActual: 60,
  plan: 1000,
  outputProd: 1150,
  totalSetup: 10,
  workingHour: 8,
  totalSetupPacking: 5,
  workingHourPacking: 2,
  ...over,
});

describe("buildRecordTotals", () => {
  it("input kosong → output kosong", () => {
    assert.deepEqual(buildRecordTotals([]), []);
  });

  it("gap & upph dihitung dari total, bukan dari gap per baris", () => {
    const rows: RecordTotalInput[] = [
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums() },
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums() },
    ];
    const totals = buildRecordTotals(rows);
    assert.equal(totals.length, 1);
    const t = totals[0];
    assert.equal(t.outputProd, 2300);
    assert.equal(t.plan, 2000);
    assert.equal(t.gapOp, 300);
    assert.equal(t.gapUph, 40);
    assert.equal(t.gapHc, 20);
    assert.equal(t.upph, 2);
  });

  it("group per (date, shift) terpisah, urut date desc", () => {
    const rows: RecordTotalInput[] = [
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums() },
      { date: new Date("2026-08-11T00:00:00.000Z"), shift: "1", sums: sums() },
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "2", sums: sums() },
    ];
    const totals = buildRecordTotals(rows);
    assert.deepEqual(
      totals.map((t) => [t.date, t.shift]),
      [
        ["2026-08-11", "1"],
        ["2026-08-10", "1"],
        ["2026-08-10", "2"],
      ]
    );
  });

  it("null pada sum diabaikan (diperlakukan 0)", () => {
    const rows: RecordTotalInput[] = [
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: null, sums: sums({ outputProd: null, plan: null }) },
    ];
    const t = buildRecordTotals(rows)[0];
    assert.equal(t.outputProd, 0);
    assert.equal(t.plan, 0);
    assert.equal(t.gapOp, 0);
    assert.equal(t.shift, null);
  });

  it("hcActual total 0 → upph null", () => {
    const rows: RecordTotalInput[] = [
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums({ hcActual: 0, uphResult: 150 }) },
    ];
    const t = buildRecordTotals(rows)[0];
    assert.equal(t.upph, null);
  });

  it("pembulatan 2 desimal (float noise tidak bocor)", () => {
    const rows: RecordTotalInput[] = [
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums({ uphResult: 120.1 }) },
      { date: new Date("2026-08-10T00:00:00.000Z"), shift: "1", sums: sums({ uphResult: 120.2 }) },
    ];
    const t = buildRecordTotals(rows)[0];
    assert.equal(t.uphResult, 240.3);
    assert.equal(t.gapUph, 40.3);
  });
});
