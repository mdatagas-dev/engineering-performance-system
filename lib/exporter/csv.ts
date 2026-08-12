// Adapter ekspor CSV (GET /api/export) — REUSE inti lib/imports/csv.ts tanpa
// merombak frontend: buildCsv (17 kolom, BOM \uFEFF, pemisah ";", desimal
// titik) dipakai apa adanya; lapisan ini hanya memetakan row DB → CsvRecord.

import { buildCsv, CSV_SEPARATOR, CSV_LINE_ENDING } from "@/lib/imports/csv";
import { toCsvRecord, type ExportRecordRow } from "./fields";

// Nama file ekspor konsisten dengan mock frontend app/export: EPS_<yyyy-MM-dd>.csv.
export function buildExportFilename(date: Date = new Date()): string {
  return `EPS_${date.toISOString().slice(0, 10)}.csv`;
}

// CSV lengkap (header + N baris) dari hasil findMany EXPORT_SELECT.
export function buildExportCsv(rows: readonly ExportRecordRow[]): string {
  return buildCsv(rows.map(toCsvRecord));
}

export { CSV_SEPARATOR, CSV_LINE_ENDING };