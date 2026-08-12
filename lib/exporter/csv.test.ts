import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CSV_COLUMNS, CSV_COLUMN_LABELS } from "@/lib/imports/columns";
import { buildExportCsv, buildExportFilename } from "./csv";
import { formatExportDate, toCsvRecord, type ExportRecordRow } from "./fields";

function row(overrides: Partial<ExportRecordRow> = {}): ExportRecordRow {
  return {
    date: new Date("2026-08-12T00:00:00.000Z"),
    model: "LV-3000",
    shift: "1",
    uphTarget: 90,
    uphResult: 90,
    gapUph: 0,
    hcStandard: 30,
    hcActual: 32,
    gapHc: 2,
    plan: 960,
    outputProd: 1000,
    gapOp: 40,
    upph: 2.8125,
    totalSetup: 12,
    workingHour: 8,
    totalSetupPacking: 6,
    workingHourPacking: 2,
    ...overrides,
  };
}

describe("buildExportCsv — adapter REUSE lib/imports/csv", () => {
  it("header 17 kolom label persis PRD, BOM, pemisah ';'", () => {
    const csv = buildExportCsv([row()]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    const firstLine = csv.slice(1).split("\n")[0];
    assert.equal(firstLine, CSV_COLUMNS.map((id) => CSV_COLUMN_LABELS[id]).join(";"));
  });

  it("baris data: tanggal YYYY-MM-DD + angka desimal titik, tanpa ribuan", () => {
    const csv = buildExportCsv([row()]);
    const line = csv.slice(1).split("\n")[1];
    assert.equal(
      line,
      ["2026-08-12", "LV-3000", "1", "90", "90", "0", "30", "32", "2", "960", "1000", "40", "2.8125", "12", "8", "6", "2"].join(";")
    );
  });

  it("shift null → sel kosong (konsisten csvCell)", () => {
    const csv = buildExportCsv([row({ shift: null })]);
    const line = csv.slice(1).split("\n")[1];
    assert.ok(line.startsWith("2026-08-12;LV-3000;;"));
  });

  it("1 header + N baris data", () => {
    const csv = buildExportCsv([row(), row(), row()]);
    assert.equal(csv.slice(1).split("\n").length, 4);
  });
});

describe("formatExportDate", () => {
  it("@db.Date tengah malam UTC → YYYY-MM-DD", () => {
    assert.equal(formatExportDate(new Date("2026-08-12T00:00:00.000Z")), "2026-08-12");
    assert.equal(formatExportDate(new Date("2026-01-05T00:00:00.000Z")), "2026-01-05");
  });
});

describe("toCsvRecord — mapping row DB → CsvRecord", () => {
  it("mempertahankan 17 kolom urut CSV_COLUMNS", () => {
    const record = toCsvRecord(row()) as unknown as Record<string, unknown>;
    assert.deepEqual(Object.keys(record), [...CSV_COLUMNS]);
  });
});

describe("buildExportFilename", () => {
  it("EPS_<yyyy-MM-dd>.csv — konsisten mock frontend", () => {
    assert.equal(buildExportFilename(new Date("2026-08-12T12:00:00.000Z")), "EPS_2026-08-12.csv");
  });
});