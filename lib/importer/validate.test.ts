import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, type ParsedCsvRow } from "@/lib/imports/parse";
import { importRowKey } from "./duplicates";
import {
  parseNumericCell,
  validateImportRows,
  type ImportRowReportEntry,
  type ImportRowError,
} from "./validate";

const HEADER =
  "Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing";
const VALID_LINE =
  "2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2";

function parseLines(lines: string[]): ParsedCsvRow[] {
  return parseCsv([HEADER, ...lines].join("\n")).rows;
}

function errorsOf(result: ReturnType<typeof validateImportRows>, index: number): ImportRowError[] {
  return result.rows.find((r) => r.index === index)?.errors ?? [];
}

function fieldMessages(result: ReturnType<typeof validateImportRows>, index: number): string[] {
  return errorsOf(result, index).map((e) => `${e.field}=${e.message}`);
}

describe("parseNumericCell", () => {
  it("desimal koma diterima dengan delimiter ';'", () => {
    assert.equal(parseNumericCell("90,5", ";"), 90.5);
  });
  it("desimal titik selalu diterima", () => {
    assert.equal(parseNumericCell("90.5", ","), 90.5);
    assert.equal(parseNumericCell("90.5", ";"), 90.5);
  });
  it("\"\", spasi, teks → null", () => {
    assert.equal(parseNumericCell("", ";"), null);
    assert.equal(parseNumericCell("  ", ";"), null);
    assert.equal(parseNumericCell("abc", ";"), null);
    assert.equal(parseNumericCell("90,5", ","), null);
  });
});

describe("validateImportRows — field dasar", () => {
  const rows = parseLines([VALID_LINE]);
  it("baris valid → status ok, tanpa laporan", () => {
    const result = validateImportRows(rows, { delimiter: ";" });
    assert.equal(result.validCount, 1);
    assert.equal(result.errorCount, 0);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0].status, "ok");
  });

  it("tanggal kosong / format salah / roll-over ditolak", () => {
    const result = validateImportRows(
      parseLines(["2026-02-30;LV-3000;1;90;90;30;32;960;1000;12;8;6;2"]),
      { delimiter: ";" }
    );
    assert.equal(result.errorCount, 1);
    assert.ok(errorsOf(result, 2).some((e) => e.field === "date"));
  });

  it("model kosong → error wajib", () => {
    const result = validateImportRows(parseLines([`2026-08-12;;1;90;90;30;32;960;1000;12;8;6;2`]), { delimiter: ";" });
    assert.ok(fieldMessages(result, 2).includes("model=Wajib diisi"));
  });

  it("numerik: kosong → wajib, teks → harus angka, negatif → minimal 0, >1e15 → terlalu besar", () => {
    const result = validateImportRows(
      parseLines(["2026-08-12;LV-3000;1;;90;30;32;abc;-5;1000000000000001;8;6;2"]),
      { delimiter: ";" }
    );
    const messages = fieldMessages(result, 2);
    assert.ok(messages.includes("uphTarget=Wajib diisi"));
    assert.ok(messages.includes("plan=Harus angka"));
    assert.ok(messages.includes("outputProd=Minimal 0"));
    assert.ok(messages.includes("totalSetup=Terlalu besar"));
  });
});

describe("validateImportRows — duplikat lapis 1 (antar baris file)", () => {
  it("baris ke-2 dst dengan kunci sama error; baris pertama tetap valid", () => {
    const rows = parseLines([VALID_LINE, "2026-08-12;LV-3000;1;91;90;30;32;960;1000;12;8;6;2"]);
    const result = validateImportRows(rows, { delimiter: ";" });
    assert.equal(result.validCount, 1);
    assert.equal(result.errorCount, 1);
    const dup = errorsOf(result, 3);
    assert.equal(dup.length, 1);
    assert.equal(dup[0].field, "duplicate");
    assert.match(dup[0].message, /bentrok dengan baris 2/);
  });
  it("file dengan kunci berbeda tidak error duplikat", () => {
    const rows = parseLines([VALID_LINE, "2026-08-12;LV-3000;2;91;90;30;32;960;1000;12;8;6;2"]);
    const result = validateImportRows(rows, { delimiter: ";" });
    assert.equal(result.errorCount, 0);
    assert.equal(result.validCount, 2);
  });
});

describe("validateImportRows — duplikat lapis 2 (terhadap DB)", () => {
  it("kunci existing → error duplikat", () => {
    const key = importRowKey({ date: "2026-08-12", model: "LV-3000", shift: "1", areaId: "p1" });
    const result = validateImportRows(parseLines([VALID_LINE]), { delimiter: ";", areaId: "p1", existingKeys: new Set([key]) });
    assert.equal(result.validCount, 0);
    assert.equal(errorsOf(result, 2)[0].field, "duplicate");
  });
  it("kunci existing beda areaId tidak bentrok", () => {
    const key = importRowKey({ date: "2026-08-12", model: "LV-3000", shift: "1", areaId: "p2" });
    const result = validateImportRows(parseLines([VALID_LINE]), { delimiter: ";", areaId: "p1", existingKeys: new Set([key]) });
    assert.equal(result.validCount, 1);
  });
});

describe("validateImportRows — laporan & hitungan", () => {
  it("errors = [{rowIndex, errors:[{field,message}]}] hanya baris error", () => {
    const rows = parseLines([VALID_LINE, "bad-line;LV-3000;1;90;90;30;32;960;1000;12;8;6;2"]);
    const result = validateImportRows(rows, { delimiter: ";" });
    assert.equal(result.totalCount, 2);
    assert.equal(result.validCount, 1);
    assert.equal(result.errorCount, 1);
    const report: ImportRowReportEntry[] = result.errors;
    assert.equal(report.length, 1);
    assert.equal(report[0].rowIndex, 3);
    assert.equal(report[0].errors[0].field, "date");
    assert.equal(result.byIndex.get(3)?.length, 1);
  });
});