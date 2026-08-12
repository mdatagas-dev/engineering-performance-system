import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRecordFields, MAX_NUMERIC_MAGNITUDE } from "./fields";

function withNumeric(over: Record<string, unknown> = {}) {
  return {
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
    totalSetup: 10,
    workingHour: 8,
    totalSetupPacking: 5,
    workingHourPacking: 2,
    ...over,
  };
}

describe("parseRecordFields — validasi numerik", () => {
  it("0 diterima (plan 0 sah)", () => {
    const r = parseRecordFields(withNumeric({ plan: 0 }));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.plan, 0);
  });

  it("negatif ditolak", () => {
    assert.equal(parseRecordFields(withNumeric({ plan: -1 })).ok, false);
  });

  it("NaN / ±Infinity ditolak (numeric-safe)", () => {
    assert.equal(parseRecordFields(withNumeric({ plan: Number.NaN })).ok, false);
    assert.equal(parseRecordFields(withNumeric({ plan: Number.POSITIVE_INFINITY })).ok, false);
    assert.equal(parseRecordFields(withNumeric({ plan: Number.NEGATIVE_INFINITY })).ok, false);
  });

  it(`> ${MAX_NUMERIC_MAGNITUDE} ditolak; = ${MAX_NUMERIC_MAGNITUDE} diterima`, () => {
    assert.equal(parseRecordFields(withNumeric({ plan: MAX_NUMERIC_MAGNITUDE + 1 })).ok, false);
    assert.equal(parseRecordFields(withNumeric({ plan: MAX_NUMERIC_MAGNITUDE })).ok, true);
  });

  it("string angka ditolak (hanya number)", () => {
    assert.equal(parseRecordFields(withNumeric({ plan: "100" })).ok, false);
  });
});

describe("parseRecordFields — date", () => {
  it("YYYY-MM-DD valid → Date", () => {
    const r = parseRecordFields({ date: "2026-08-12", model: "M-1" });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.ok(r.data.date instanceof Date);
      assert.equal((r.data.date as Date).toISOString().slice(0, 10), "2026-08-12");
    }
  });

  it("tanggal kalender invalid ditolak (2026-02-30)", () => {
    assert.equal(parseRecordFields({ date: "2026-02-30", model: "M-1" }).ok, false);
  });

  it("format bukan YYYY-MM-DD ditolak (cegah parse lenient JS)", () => {
    for (const bad of ["12/08/2026", "2026", "0", "2026-08", "bukan-tanggal", "2026-08-12T00:00:00Z"]) {
      assert.equal(parseRecordFields({ date: bad, model: "M-1" }).ok, false, `harus tolak ${bad}`);
    }
  });

  it("bukan string ditolak", () => {
    assert.equal(parseRecordFields({ date: new Date(), model: "M-1" }).ok, false);
  });
});

describe("parseRecordFields — model & shift", () => {
  it("model non-empty, di-trim", () => {
    const r = parseRecordFields({ date: "2026-08-12", model: "  M-1  " });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.model, "M-1");
  });

  it("model kosong / whitespace-only ditolak", () => {
    assert.equal(parseRecordFields({ date: "2026-08-12", model: "" }).ok, false);
    assert.equal(parseRecordFields({ date: "2026-08-12", model: "   " }).ok, false);
  });

  it("model non-string ditolak", () => {
    assert.equal(parseRecordFields({ date: "2026-08-12", model: 5 }).ok, false);
  });

  it("shift teks bebas/null diterima (tanpa whitelist enum — kompatibilitas form)", () => {
    for (const shift of ["1", "2", "3", "Day A"]) {
      const r = parseRecordFields({ date: "2026-08-12", model: "M-1", shift });
      assert.equal(r.ok, true, `harus terima shift ${shift}`);
      if (r.ok) assert.equal(r.data.shift, shift);
    }
    const nul = parseRecordFields({ date: "2026-08-12", model: "M-1", shift: null });
    assert.equal(nul.ok, true);
    if (nul.ok) assert.equal(nul.data.shift, null);
  });

  it("shift non-string non-null ditolak", () => {
    assert.equal(parseRecordFields({ date: "2026-08-12", model: "M-1", shift: 1 }).ok, false);
  });
});

describe("parseRecordFields — whitelist", () => {
  it("field di luar 13 kolom raw ditolak", () => {
    for (const key of ["gapUph", "gapHc", "gapOp", "upph", "status", "version", "createdBy", "areaId", "apa-saja"]) {
      assert.equal(parseRecordFields({ ...withNumeric(), [key]: key === "apa-saja" ? "x" : 1 }).ok, false, `harus tolak ${key}`);
    }
  });
});