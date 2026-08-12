// Builder CSV ekspor & template impor — murni & testable (node:test).
// Format "Excel" antar muka = CSV UTF-8: BOM \uFEFF di awal, pemisah ";"
// (standar Excel Indonesia), desimal titik "." dan TANPA pemisah ribuan agar
// Excel membaca nilai sebagai angka (angka id-ID "1.000,5" akan dibaca teks).
// GAP & UPPH sudah precomputed (round2 dari calculateCalculated) — ditulis
// apa adanya; null (UPPH saat HC Actual 0) → sel kosong.

import {
  CSV_COLUMNS,
  CSV_COLUMN_LABELS,
  INPUT_FIELD_IDS,
  type CsvFieldId,
} from "./columns";

// Shape minimal record untuk ekspor (MockProductionRecord cocok struktural;
// tidak bergantung lib/mocks supaya tetap murni).
export type CsvRecord = {
  date: string;
  model: string;
  shift: string | null;
  uphTarget: number;
  uphResult: number;
  gapUph: number;
  hcStandard: number;
  hcActual: number;
  gapHc: number;
  plan: number;
  outputProd: number;
  gapOp: number;
  upph: number | null;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
};

export const CSV_LINE_ENDING = "\n";
export const CSV_SEPARATOR = ";";

const CSV_INJECTION_PREFIX = ["=", "+", "-", "@", "\t", "\r"] as const;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let out = value;
  // CSV formula injection (OWASP): sel berawalan =, +, -, @, tab, CR akan
  // dieksekusi Excel/LibreOffice saat file dibuka → prefix apostrof.
  if (CSV_INJECTION_PREFIX.some((p) => out.startsWith(p))) out = `'${out}`;
  // Kutip ganda sel yang mengandung pemisah/kutip/baris baru agar tidak
  // merusak struktur baris (RFC 4180-style; kutip ganda didobel).
  if (/[;"\n\r]/.test(out)) out = `"${out.replace(/"/g, '""')}"`;
  return out;
}

// Ekspor penuh: header 17 kolom + 1 baris per record. Nilai angka ditulis
// String(number) → desimal titik (JS), tanpa ribuan. Dimulai BOM.
export function buildCsv(records: readonly CsvRecord[]): string {
  const header = CSV_COLUMNS.map((id) => CSV_COLUMN_LABELS[id]).join(CSV_SEPARATOR);
  const lines: string[] = [header];
  for (const record of records) {
    lines.push(CSV_COLUMNS.map((id) => csvCell(record[id as CsvFieldId])).join(CSV_SEPARATOR));
  }
  return "\uFEFF" + lines.join(CSV_LINE_ENDING);
}

// Template impor: header 13 kolom INPUT SAJA (tanpa 4 kolom calculated —
// GAP & UPPH dihitung otomatis saat impor) + 1 baris contoh yang konsisten
// dengan calculateCalculated (UPH 90/90 → GAP UPH 0; HC 30/32 → GAP HC 2;
// Plan 960/Output 1000 → GAP OP 40; UPPH = 90/32 = 2.81).
export function buildTemplateCsv(): string {
  const headers = INPUT_FIELD_IDS.map((id) => CSV_COLUMN_LABELS[id]).join(CSV_SEPARATOR);
  const sample = ["2026-08-12", "LV-3000", "1", "90", "90", "30", "32", "960", "1000", "12", "8", "6", "2"].join(CSV_SEPARATOR);
  return "\uFEFF" + [headers, sample].join(CSV_LINE_ENDING);
}

// Unduh client-side: Blob + URL.createObjectURL (pola React, tanpa library).
// buildCsv sudah menyertakan BOM — Blob tidak menambah lagi.
export function toCsvDownload(csv: string, filename: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}