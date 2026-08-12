import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BULK_MAX,
  BULK_MIN,
  bulkDefaultValues,
  generateBulkRows,
  validateBulkInput,
} from "./bulk";
import { calculateCalculated } from "./calculate";

const BASE = {
  date: "2026-08-12",
  model: "LV-3000",
  shift: "1",
  areaName: "L1",
  makeId: (i: number) => `qe_bulk_${i}`,
  createdByName: "Engineering Staff",
};

describe("validateBulkInput", () => {
  it("count valid (1..50) + date/model terisi → ok", () => {
    assert.equal(validateBulkInput({ ...BASE, count: 1 }), null);
    assert.equal(validateBulkInput({ ...BASE, count: BULK_MAX }), null);
  });

  it("count di luar rentang / bukan integer → error", () => {
    assert.ok(validateBulkInput({ ...BASE, count: 0 }));
    assert.ok(validateBulkInput({ ...BASE, count: BULK_MAX + 1 }));
    assert.ok(validateBulkInput({ ...BASE, count: 2.5 }));
  });

  it("date / model kosong → error", () => {
    assert.ok(validateBulkInput({ ...BASE, count: 5, date: "  " }));
    assert.ok(validateBulkInput({ ...BASE, count: 5, model: "" }));
  });
});

describe("generateBulkRows", () => {
  it("count baris + id berurutan via makeId; shift/area default", () => {
    const rows = generateBulkRows({ ...BASE, count: 3 });
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((r) => r.id),
      ["qe_bulk_0", "qe_bulk_1", "qe_bulk_2"]
    );
    assert.ok(rows.every((r) => r.model === "LV-3000" && r.date === "2026-08-12" && r.shift === "1"));
    assert.equal(rows[0].area?.name, "L1");
  });

  it("all: default numerik 0 (WH 8) & calculated = calculateCalculated", () => {
    const rows = generateBulkRows({ ...BASE, count: 2 });
    for (const r of rows) {
      assert.equal(r.totalSetup, 0);
      assert.equal(r.workingHour, 8);
      assert.deepEqual(
        { gapUph: r.gapUph, gapHc: r.gapHc, gapOp: r.gapOp, upph: r.upph },
        calculateCalculated({ uphTarget: 0, uphResult: 0, hcStandard: 0, hcActual: 0, plan: 0, outputProd: 0 })
      );
    }
  });

  it("values override diterapkan (mis. target UPH sama utk semua baris) + calculated ikut", () => {
    const rows = generateBulkRows({
      ...BASE,
      count: 2,
      values: { uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000" },
    });
    for (const r of rows) {
      assert.equal(r.uphTarget, 90);
      assert.equal(r.gapUph, 0);
      assert.equal(r.gapOp, 40);
      assert.equal(r.upph, 2.81);
    }
  });

  it("shift '' & areaName '' → null", () => {
    const rows = generateBulkRows({ ...BASE, count: 1, shift: "", areaName: "" });
    assert.equal(rows[0].shift, null);
    assert.equal(rows[0].area, null);
  });

  it("input tidak valid → throw", () => {
    assert.throws(() => generateBulkRows({ ...BASE, count: BULK_MAX + 1 }), /1-50/);
    assert.throws(() => generateBulkRows({ ...BASE, count: 3, model: "" }), /Model wajib/);
  });

  it("bulkDefaultValues lengkap 10 kolom numerik", () => {
    assert.equal(Object.keys(bulkDefaultValues()).length, 10);
  });
});

describe("batas konstanta", () => {
  it("BULK_MIN = 1, BULK_MAX = 50 (keputusan UI dialog)", () => {
    assert.equal(BULK_MIN, 1);
    assert.equal(BULK_MAX, 50);
  });
});