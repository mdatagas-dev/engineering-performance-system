// Validasi baris CSV impor produksi — murni & testable (node:test).
// Aturan (paralel dengan lib/records/form.ts validateRow + backend fields.ts):
//  - Tanggal wajib YYYY-MM-DD dan benar-benar valid (regex ketat + round-trip
//    ISO, mencegah roll-over JS seperti 2026-02-30 → 2026-03-02).
//  - Model wajib non-kosong. Shift opsional (kosong → null).
//  - 10 numerik wajib: angka finite ≥ 0 dan ≤ 1e15 (numeric-safe, sama dengan
//    form data-entry). Desimal koma (Indonesia) diterima bila delimiter ";" —
//    koma diganti titik sebelum Number(); dengan delimiter "," auto-detect,
//    koma berarti pemisah kolom sehingga "90,5" terpecah → error.
//  - Duplikat date+model+shift: antar-baris file DAN terhadap data yang sudah
//    ada (seed/simpanan) — reuse duplicateRowKeys (lib/records/form.ts).
// Status per baris: "ok" | "error" + daftar pesan per field.

import { MAX_NUMERIC_MAGNITUDE } from "@/lib/records/fields";
import { duplicateRowKeys } from "@/lib/records/form";
import { NUMERIC_INPUT_FIELD_IDS, type NumericInputFieldId } from "./columns";
import type { ParsedCsvRow } from "./parse";

export type ImportRowError = { field: string; message: string };

export type ValidatedRow = {
  index: number;
  status: "ok" | "error";
  errors: ImportRowError[];
};

export type ExistingRow = { date: string; model: string; shift: string | null };

export type ValidateRowsInput = {
  rows: ParsedCsvRow[];
  existing: ExistingRow[];
  delimiter: ";" | ",";
};

export type ValidateRowsResult = {
  rows: ValidatedRow[];
  /** Map index baris (nomor baris file) → error; baris valid tidak ada di sini. */
  byIndex: ReadonlyMap<number, ImportRowError[]>;
  validCount: number;
  errorCount: number;
  totalCount: number;
  warnings: string[];
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function validateRows(input: ValidateRowsInput): ValidateRowsResult {
  const dupKeys = duplicateRowKeys(
    input.rows.map((r) => ({
      key: String(r.index),
      date: r.values.date ?? "",
      model: r.values.model ?? "",
      shift: r.values.shift ?? "",
    })),
    input.existing
  );

  const rows: ValidatedRow[] = [];
  const byIndex = new Map<number, ImportRowError[]>();

  for (const row of input.rows) {
    const errors: ImportRowError[] = [];

    const date = row.values.date ?? "";
    if (date === "") {
      errors.push({ field: "date", message: "Wajib diisi" });
    } else if (!isValidDateOnly(date)) {
      errors.push({ field: "date", message: "Format tanggal harus YYYY-MM-DD dan valid" });
    }

    if ((row.values.model ?? "").trim() === "") {
      errors.push({ field: "model", message: "Wajib diisi" });
    }

    for (const field of NUMERIC_INPUT_FIELD_IDS) {
      validateNumericCell(field, row.values[field], input.delimiter, errors);
    }

    if (dupKeys.has(String(row.index))) {
      errors.push({
        field: "duplicate",
        message: "Duplikat date+model+shift — bentrok dengan baris lain atau data yang sudah ada",
      });
    }

    rows.push({ index: row.index, status: errors.length === 0 ? "ok" : "error", errors });
    if (errors.length > 0) byIndex.set(row.index, errors);
  }

  const validCount = rows.filter((r) => r.status === "ok").length;
  return {
    rows,
    byIndex,
    validCount,
    errorCount: rows.length - validCount,
    totalCount: rows.length,
    warnings: [],
  };
}

function validateNumericCell(
  field: NumericInputFieldId,
  raw: string | undefined,
  delimiter: ";" | ",",
  errors: ImportRowError[]
): void {
  const t = raw?.trim() ?? "";
  if (t === "") {
    errors.push({ field, message: "Wajib diisi" });
    return;
  }
  const normalized = delimiter === ";" ? t.replace(",", ".") : t;
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
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