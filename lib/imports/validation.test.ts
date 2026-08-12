import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./parse";
import { isValidDateOnly, validateRows } from "./validation";
import { SAMPLE_CSV } from "./sample";
import { mockProductionRecords } from "@/lib/mocks/records";

const HEADER = "Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing";

function parseRows(rows: string[]): ReturnType<typeof parseCsv> {
  return parseCsv(`${HEADER}\n${rows.join("\n")}`);
}

const VALID_ROW = "2026-08-13;LV-3000;1;90;92;30;32;960;984;12;8;6;2";

describe("isValidDateOnly", () => {
  it("YYYY-MM-DD valid → true", () => {
    assert.equal(isValidDateOnly("2026-08-12"), true);
    assert.equal(isValidDateOnly("2026-02-28"), true);
  });
  it("format rusak / tanggal tak ada → false", () => {
    assert.equal(isValidDateOnly("2026-02-30"), false);
    assert.equal(isValidDateOnly("2026-13-01"), false);
    assert.equal(isValidDateOnly("12-08-2026"), false);
    assert.equal(isValidDateOnly("2026-8-12"), false);
    assert.equal(isValidDateOnly("abc"), false);
  });
});

describe("validateRows", () => {
  it("baris valid → ok, tanpa error, tanpa map", () => {
    const parsed = parseRows([VALID_ROW]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    assert.equal(result.totalCount, 1);
    assert.equal(result.validCount, 1);
    assert.equal(result.errorCount, 0);
    assert.equal(result.rows[0].status, "ok");
    assert.equal(result.byIndex.size, 0);
  });

  it("semua numerik wajib terisi", () => {
    const parsed = parseRows(["2026-08-13;LV-3000;1;90;;30;32;960;984;12;8;6;2"]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    assert.equal(result.rows[0].status, "error");
    const errors = [...(result.byIndex.get(parsed.rows[0].index) ?? [])];
    assert.ok(errors.some((e) => e.field === "uphResult" && e.message === "Wajib diisi"));
  });

  it("angka: bukan angka / negatif / terlalu besar / Infinity", () => {
    const parsed = parseRows(["2026-08-13;LV-3000;1;abc;-1;30;1e999;960;1000000000000001;12;8;6;2"]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    const errors = [...(result.byIndex.get(parsed.rows[0].index) ?? [])];
    assert.ok(errors.some((e) => e.field === "uphTarget" && e.message === "Harus angka"));
    assert.ok(errors.some((e) => e.field === "uphResult" && e.message === "Minimal 0"));
    assert.ok(errors.some((e) => e.field === "hcActual" && e.message === "Harus angka"));
    assert.ok(errors.some((e) => e.field === "outputProd" && e.message === "Terlalu besar"));
  });

  it("model kosong → error", () => {
    const parsed = parseRows(["2026-08-13;;1;90;92;30;32;960;984;12;8;6;2"]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    const errors = [...(result.byIndex.get(parsed.rows[0].index) ?? [])];
    assert.ok(errors.some((e) => e.field === "model"));
  });

  it("desimal koma diterima bila delimiter ';'; ditolak bila delimiter ','", () => {
    const parsed = parseRows([VALID_ROW.replace("92", "92,5")]);
    const ok = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    assert.equal(ok.validCount, 1);
  });

  it("duplikat antar-baris → kedua baris error", () => {
    const same = parseRows([VALID_ROW, VALID_ROW]);
    const result = validateRows({ rows: same.rows, existing: [], delimiter: same.delimiter });
    assert.equal(result.validCount, 0);
    const errorsA = result.byIndex.get(same.rows[0].index) ?? [];
    assert.ok(errorsA.some((e) => e.field === "duplicate"));
  });

  it("duplikat vs existing (case-insensitive model/shift) → error; shift beda → ok", () => {
    const parsed = parseRows(["2026-08-12;lv-3000;1;90;90;30;30;960;960;12;8;6;2"]);
    const existing = [{ date: "2026-08-12", model: "LV-3000", shift: "1" }];
    const dup = validateRows({ rows: parsed.rows, existing, delimiter: parsed.delimiter });
    assert.equal(dup.validCount, 0);
    const parsed2 = parseRows(["2026-08-12;LV-3000;2;90;90;30;30;960;960;12;8;6;2"]);
    const notDup = validateRows({ rows: parsed2.rows, existing, delimiter: parsed2.delimiter });
    assert.equal(notDup.validCount, 1);
  });

  it("shift kosong → null; tidak duplikat dgn shift '1'", () => {
    const parsed = parseRows(["2026-08-12;LV-3000;;90;90;30;30;960;960;12;8;6;2"]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    assert.equal(result.validCount, 1);
  });

  it("semua error terakumulasi dalam satu baris", () => {
    const parsed = parseRows(["2026-02-30;LV-3000;1;-1;-1;-1;-1;-1;-1;-1;-1;-1;-1"]);
    const result = validateRows({ rows: parsed.rows, existing: [], delimiter: parsed.delimiter });
    const errors = [...(result.byIndex.get(parsed.rows[0].index) ?? [])];
    assert.ok(errors.some((e) => e.field === "date"));
    assert.equal(errors.filter((e) => e.message === "Minimal 0").length, 10);
  });

  it("contoh bawaan (SAMPLE_CSV) versus seed mock: 4 valid, 3 error", () => {
    const parsed = parseCsv(SAMPLE_CSV);
    assert.equal(parsed.rows.length, 7);
    const result = validateRows({
      rows: parsed.rows,
      existing: mockProductionRecords.map((r) => ({ date: r.date, model: r.model, shift: r.shift })),
      delimiter: parsed.delimiter,
    });
    assert.equal(result.validCount, 4);
    assert.equal(result.errorCount, 3);
    assert.ok(parsed.warnings.some((w) => w.includes("kolom ekstra")));
    assert.ok(result.rows.every((r) => r.status === "ok" || r.errors.length > 0));
  });
});