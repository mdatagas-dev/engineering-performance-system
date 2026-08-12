import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_NUMERIC_MAGNITUDE,
  buildRecordFromRow,
  calcPreview,
  duplicateRowKeys,
  parseNumeric,
  recordToDraftValues,
  validateRow,
} from "./form";
import { calculateCalculated } from "./calculate";

const EMPTY = {
  uphTarget: "",
  uphResult: "",
  hcStandard: "",
  hcActual: "",
  plan: "",
  outputProd: "",
  totalSetup: "",
  workingHour: "",
  totalSetupPacking: "",
  workingHourPacking: "",
};

describe("parseNumeric", () => {
  it("angka valid → number", () => {
    assert.equal(parseNumeric("12"), 12);
    assert.equal(parseNumeric(" 12.5 "), 12.5);
    assert.equal(parseNumeric("0"), 0);
    assert.equal(parseNumeric("-3"), -3); // negatif lolos parse; ditolak validateRow
  });

  it("kosong / bukan angka → null", () => {
    assert.equal(parseNumeric(""), null);
    assert.equal(parseNumeric("   "), null);
    assert.equal(parseNumeric("abc"), null);
  });
});

describe("calcPreview", () => {
  it("semua input kalkulasi terisi → GAP & UPPH (reuse calculateCalculated)", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000" };
    assert.deepEqual(calcPreview(values), calculateCalculated({ uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 32, plan: 960, outputProd: 1000 }));
  });

  it("satu input kosong → null (preview '—')", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "" };
    assert.equal(calcPreview(values), null);
  });

  it("HC Actual 0 → GAP tetap, UPPH null", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "0", plan: "960", outputProd: "1000" };
    const p = calcPreview(values);
    assert.ok(p);
    assert.equal(p.upph, null);
    assert.equal(p.gapOp, 40);
  });

  it("field non-kalkulasi (totalSetup) tidak memengaruhi preview", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "999" };
    assert.ok(calcPreview(values));
  });
});

describe("validateRow", () => {
  it("baris kosong → error wajib diisi (date, model, 10 numerik)", () => {
    const errors = validateRow({ date: "", model: "", values: EMPTY });
    assert.ok(errors.date);
    assert.ok(errors.model);
    assert.ok(errors.uphTarget);
    assert.ok(errors.totalSetupPacking);
  });

  it("nilai negatif → 'Minimal 0'", () => {
    const errors = validateRow({ date: "2026-08-12", model: "LV-3000", values: { ...EMPTY, uphTarget: "-1" } });
    assert.equal(errors.uphTarget, "Minimal 0");
    assert.equal(errors.hcActual, "Wajib diisi");
  });

  it("baris valid → tanpa error", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "0", workingHour: "8", totalSetupPacking: "0", workingHourPacking: "2" };
    assert.deepEqual(validateRow({ date: "2026-08-12", model: "LV-3000", values }), {});
  });

  it("numeric-safe: Infinity/NaN → 'Harus angka', |n| > 1e15 → 'Terlalu besar'", () => {
    const errors = validateRow({
      date: "2026-08-12",
      model: "LV-3000",
      values: { ...EMPTY, uphTarget: "1e999", plan: String(MAX_NUMERIC_MAGNITUDE * 10), outputProd: "abc" },
    });
    assert.equal(errors.uphTarget, "Harus angka");
    assert.equal(errors.plan, "Terlalu besar");
    assert.equal(errors.outputProd, "Harus angka");
    assert.equal(errors.hcActual, "Wajib diisi");
  });

  it("nilai besar tapi masih numeric-safe (≤ 1e15) → lolos", () => {
    const errors = validateRow({
      date: "2026-08-12",
      model: "LV-3000",
      values: { ...EMPTY, uphTarget: String(MAX_NUMERIC_MAGNITUDE), uphResult: "0", hcStandard: "0", hcActual: "1", plan: "0", outputProd: "0", totalSetup: "0", workingHour: "8", totalSetupPacking: "0", workingHourPacking: "2" },
    });
    assert.deepEqual(errors, {});
  });

  it("tanggal masa depan TIDAK divalidasi (keputusan: data lintas tanggal sah)", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "0", workingHour: "8", totalSetupPacking: "0", workingHourPacking: "2" };
    assert.deepEqual(validateRow({ date: "2999-12-31", model: "LV-3000", values }), {});
  });
});

describe("duplicateRowKeys", () => {
  const rows = [
    { key: "a", date: "2026-08-12", model: "LV-3000", shift: "1" },
    { key: "b", date: "2026-08-12", model: "LV-3000", shift: "2" },
  ];

  it("date+model+shift sama antar baris → duplikat", () => {
    const dups = duplicateRowKeys([rows[0], { ...rows[0], key: "c" }], []);
    assert.deepEqual([...dups].sort(), ["a", "c"]);
  });

  it("shift beda / model beda → bukan duplikat", () => {
    assert.equal(duplicateRowKeys(rows, []).size, 0);
  });

  it("bentrok dengan record existing → duplikat", () => {
    const dups = duplicateRowKeys([rows[0]], [{ date: "2026-08-12", model: "LV-3000", shift: "1" }]);
    assert.deepEqual([...dups], ["a"]);
  });

  it("shift kosong ≈ null pada existing", () => {
    const dups = duplicateRowKeys([{ ...rows[0], shift: "" }], [{ date: "2026-08-12", model: "lv-3000", shift: null }]);
    assert.deepEqual([...dups], ["a"]);
  });

  it("baris tanpa date/model diabaikan", () => {
    assert.equal(duplicateRowKeys([{ key: "x", date: "", model: "", shift: "" }], []).size, 0);
  });
});

describe("buildRecordFromRow", () => {
  it("record mock lengkap + calculated 1:1 calculateCalculated", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "12", workingHour: "8", totalSetupPacking: "6", workingHourPacking: "2" };
    const r = buildRecordFromRow({
      id: "rec_form_1",
      date: "2026-08-12",
      model: " LV-3000 ",
      shift: "1",
      area: null,
      values,
      createdByName: "Engineering Staff",
    });
    assert.equal(r.id, "rec_form_1");
    assert.equal(r.model, "LV-3000");
    assert.equal(r.status, "DRAFT");
    assert.equal(r.version, 1);
    assert.deepEqual(
      { gapUph: r.gapUph, gapHc: r.gapHc, gapOp: r.gapOp, upph: r.upph },
      calculateCalculated({ uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 32, plan: 960, outputProd: 1000 })
    );
    assert.equal(r.upph, 2.81);
  });
});

describe("konsistensi Simpan vs preview", () => {
  it("buildRecordFromRow(validateRow-lolos) → calculated SAMA dgn calcPreview", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "12", workingHour: "8", totalSetupPacking: "6", workingHourPacking: "2" };
    const r = buildRecordFromRow({
      id: "rec_form_cons",
      date: "2026-08-12",
      model: "LV-3000",
      shift: "1",
      area: null,
      values,
      createdByName: "x",
    });
    assert.deepEqual(
      { gapUph: r.gapUph, gapHc: r.gapHc, gapOp: r.gapOp, upph: r.upph },
      calcPreview(values)
    );
  });

  it("recordToDraftValues → validateRow identik dgn baris form asli (jalur Simpan quick-entry = jalur form)", () => {
    const values = { ...EMPTY, uphTarget: "90", uphResult: "90", hcStandard: "30", hcActual: "32", plan: "960", outputProd: "1000", totalSetup: "0", workingHour: "8", totalSetupPacking: "0", workingHourPacking: "2" };
    const r = buildRecordFromRow({
      id: "rec_form_rtd",
      date: "2026-08-12",
      model: "LV-3000",
      shift: "1",
      area: null,
      values,
      createdByName: "x",
    });
    assert.deepEqual(recordToDraftValues(r), values);
    assert.deepEqual(validateRow({ date: r.date, model: r.model, values: recordToDraftValues(r) }), {});
  });
});
