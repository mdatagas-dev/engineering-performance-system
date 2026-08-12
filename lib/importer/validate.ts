// Validasi per-baris impor server — murni & testable (node:test), paralel
// logika lib/imports/validation.ts (frontend) dengan penyesuaian server:
//  - Tanggal wajib YYYY-MM-DD dan benar-benar valid (regex ketat + round-trip
//    ISO, mencegah roll-over JS seperti 2026-02-30 → 2026-03-02).
//  - Model wajib non-kosong. Shift opsional (kosong → null).
//  - 10 numerik wajib: angka finite ≥ 0 dan ≤ 1e15 (numeric-safe). Desimal
//    koma (Indonesia) diterima bila delimiter ";" — koma diganti titik sebelum
//    Number(); dengan delimiter "," koma berarti pemisah kolom.
//  - Duplikat 2 lapis: antar baris file (findWithinFileDuplicates — baris ke-2
//    dst error, pertama menang) DAN terhadap DB (existingKeys = Set kunci dari
//    lib/importer/duplicates.ts). Kunci duplikat termasuk areaId (satu impor =
//    satu area, default null dari sesi).
// Laporan per baris {rowIndex, errors:[{field,message}]} — bentuk snapshot
// ImportHistory.errors utk endpoint laporan.

import { MAX_NUMERIC_MAGNITUDE } from "@/lib/records/fields";
import { isValidDateOnly } from "@/lib/imports/validation";
import { NUMERIC_INPUT_FIELD_IDS, type NumericInputFieldId } from "@/lib/imports/columns";
import type { ParsedCsvRow } from "@/lib/imports/parse";
import { findWithinFileDuplicates, importRowKey } from "./duplicates";

export type ImportRowError = { field: string; message: string };

export type ImportRowReportEntry = { rowIndex: number; errors: ImportRowError[] };

export type ValidatedImportRow = {
  index: number;
  status: "ok" | "error";
  errors: ImportRowError[];
};

export type ValidateImportRowsOptions = {
  delimiter: ";" | ",";
  /** areaId importer (opsional) — bagian dari kunci duplikat. */
  areaId?: string | null;
  /** Set kunci existing dari DB (lapis 2 duplikat). */
  existingKeys?: ReadonlySet<string>;
};

export type ImportValidationResult = {
  rows: ValidatedImportRow[];
  byIndex: ReadonlyMap<number, ImportRowError[]>;
  validCount: number;
  errorCount: number;
  totalCount: number;
  /** Laporan per baris error — bentuk ImportHistory.errors. */
  errors: ImportRowReportEntry[];
};

export function normalizeShift(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  return t === "" ? null : t;
}

// Parse numerik tunggal (dipakai validasi & build data): desimal koma utk
// delimiter ";"; null bila tidak numerik.
export function parseNumericCell(raw: string | undefined, delimiter: ";" | ","): number | null {
  const t = (raw ?? "").trim();
  if (t === "") return null;
  const normalized = delimiter === ";" ? t.replace(",", ".") : t;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function validateImportRows(
  rows: readonly ParsedCsvRow[],
  opts: ValidateImportRowsOptions
): ImportValidationResult {
  const areaId = opts.areaId ?? null;
  const withinFile = findWithinFileDuplicates(
    rows.map((r) => ({
      index: r.index,
      date: r.values.date ?? "",
      model: r.values.model ?? "",
      shift: r.values.shift ?? "",
      areaId,
    }))
  );

  const validated: ValidatedImportRow[] = [];
  const errorsReport: ImportRowReportEntry[] = [];
  const byIndex = new Map<number, ImportRowError[]>();

  for (const row of rows) {
    const errors: ImportRowError[] = [];

    const date = (row.values.date ?? "").trim();
    if (date === "") {
      errors.push({ field: "date", message: "Wajib diisi" });
    } else if (!isValidDateOnly(date)) {
      errors.push({ field: "date", message: "Format tanggal harus YYYY-MM-DD dan valid" });
    }

    if ((row.values.model ?? "").trim() === "") {
      errors.push({ field: "model", message: "Wajib diisi" });
    }

    for (const field of NUMERIC_INPUT_FIELD_IDS) {
      validateNumericCell(field, row.values[field], opts.delimiter, errors);
    }

    const first = withinFile.get(row.index);
    if (first !== undefined) {
      errors.push({
        field: "duplicate",
        message: `Duplikat dalam file — bentrok dengan baris ${first} (date+model+shift+area sama)`,
      });
    } else if (
      opts.existingKeys?.has(
        importRowKey({
          date,
          model: row.values.model ?? "",
          shift: normalizeShift(row.values.shift),
          areaId,
        })
      )
    ) {
      errors.push({
        field: "duplicate",
        message: "Duplikat dengan data yang sudah ada (date+model+shift+area sama)",
      });
    }

    validated.push({ index: row.index, status: errors.length === 0 ? "ok" : "error", errors });
    if (errors.length > 0) {
      byIndex.set(row.index, errors);
      errorsReport.push({ rowIndex: row.index, errors });
    }
  }

  const validCount = validated.filter((r) => r.status === "ok").length;
  return {
    rows: validated,
    byIndex,
    validCount,
    errorCount: validated.length - validCount,
    totalCount: validated.length,
    errors: errorsReport,
  };
}

function validateNumericCell(
  field: NumericInputFieldId,
  raw: string | undefined,
  delimiter: ";" | ",",
  errors: ImportRowError[]
): void {
  const t = (raw ?? "").trim();
  if (t === "") {
    errors.push({ field, message: "Wajib diisi" });
    return;
  }
  const n = parseNumericCell(t, delimiter);
  if (n === null) {
    errors.push({ field, message: "Harus angka" });
    return;
  }
  if (n < 0) {
    errors.push({ field, message: "Minimal 0" });
    return;
  }
  if (Math.abs(n) > MAX_NUMERIC_MAGNITUDE) {
    errors.push({ field, message: "Terlalu besar" });
  }
}