import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupProductionTotals, type ProductionRow } from "./totals";

function rec(date: string, shift: string | null, over: Partial<ProductionRow> = {}): ProductionRow {
  return {
    date,
    shift,
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
    totalSetup: 12,
    workingHour: 8,
    totalSetupPacking: 6,
    workingHourPacking: 2,
    ...over,
  };
}

describe("groupProductionTotals", () => {
  it("input kosong → tanpa grup", () => {
    assert.deepEqual(groupProductionTotals([]), []);
  });

  it("contoh PRD: Plan 960+0 → 960, Output 1000+2 → 1002, GAP OP 42 (subtotal shift 1)", () => {
    const groups = groupProductionTotals([
      rec("2026-08-12", "1", { plan: 960, outputProd: 1000 }),
      rec("2026-08-12", "1", { plan: 0, outputProd: 2 }),
    ]);
    assert.equal(groups.length, 1);
    // hanya 1 shift → 1 subtotal; UI menampilkan breakdown hanya bila >1 shift.
    assert.equal(groups[0].shiftTotals.length, 1);
    assert.equal(groups[0].shifts.length, 1);
    const t = groups[0].dateTotal;
    assert.equal(t.count, 2);
    assert.equal(t.plan, 960);
    assert.equal(t.outputProd, 1002);
    assert.equal(t.gapOp, 42);
  });

  it("grup per tanggal, urut tanggal desc", () => {
    const groups = groupProductionTotals([
      rec("2026-08-11", "1"),
      rec("2026-08-12", "1"),
      rec("2026-08-10", "1"),
    ]);
    assert.deepEqual(
      groups.map((g) => g.date),
      ["2026-08-12", "2026-08-11", "2026-08-10"]
    );
  });

  it("shift >1 → subtotal per shift + total tanggal (bukan total global)", () => {
    const groups = groupProductionTotals([
      rec("2026-08-12", "1", { plan: 960, outputProd: 1000 }),
      rec("2026-08-12", "2", { plan: 700, outputProd: 680 }),
    ]);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].shifts, ["1", "2"]);
    assert.equal(groups[0].shiftTotals.length, 2);
    const s1 = groups[0].shiftTotals[0];
    assert.equal(s1.shift, "1");
    assert.equal(s1.plan, 960);
    assert.equal(s1.outputProd, 1000);
    assert.equal(s1.gapOp, 40);
    const d = groups[0].dateTotal;
    assert.equal(d.shift, null);
    assert.equal(d.count, 2);
    assert.equal(d.plan, 1660);
    assert.equal(d.outputProd, 1680);
    assert.equal(d.gapOp, 20);
  });

  it("GAP & UPPH dihitung dari total, bukan dari jumlah gap per baris", () => {
    const groups = groupProductionTotals([
      rec("2026-08-12", "1", { uphTarget: 90, uphResult: 92, hcActual: 32 }),
      rec("2026-08-12", "1", { uphTarget: 90, uphResult: 88, hcActual: 32 }),
    ]);
    const t = groups[0].dateTotal;
    assert.equal(t.gapUph, 0); // (92+88) − (90+90)
    assert.equal(t.gapHc, 4); // (32+32) − (30+30)
    assert.equal(t.uphResult, 180);
    assert.equal(t.upph, 2.81); // 180 ÷ 64 = 2.8125 → 2.81
  });

  it("UPPH null guard: total HC Actual = 0 → null", () => {
    const groups = groupProductionTotals([rec("2026-08-12", "1", { hcActual: 0 })]);
    assert.equal(groups[0].dateTotal.upph, null);
    assert.equal(groups[0].dateTotal.gapUph, 0);
  });

  it("grup shift null (tanpa shift) memakai key sendiri", () => {
    const groups = groupProductionTotals([
      rec("2026-08-12", null, { plan: 100, outputProd: 120 }),
      rec("2026-08-12", null, { plan: 50, outputProd: 60 }),
    ]);
    assert.deepEqual(groups[0].shifts, [""]);
    assert.equal(groups[0].shiftTotals.length, 1);
    assert.equal(groups[0].shiftTotals[0].shift, null);
    assert.equal(groups[0].dateTotal.plan, 150);
    assert.equal(groups[0].dateTotal.outputProd, 180);
    assert.equal(groups[0].dateTotal.gapOp, 30);
  });

  it("baris asli tetap bisa diakses per shift utk render tabel", () => {
    const groups = groupProductionTotals([
      rec("2026-08-12", "1"),
      rec("2026-08-12", "2"),
      rec("2026-08-11", "1"),
    ]);
    assert.equal(groups[0].rows.get("1")?.length, 1);
    assert.equal(groups[0].rows.get("2")?.length, 1);
    assert.equal(groups[1].rows.get("1")?.length, 1);
  });
});