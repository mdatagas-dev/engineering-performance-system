// Parser CSV impor produksi — murni & testable (node:test). TANPA pustaka
// excel: format antar muka = CSV UTF-8, pemisah ";" atau "," (auto-detect).
// Keputusan & limitasi:
//  - Baris = split plain per delimiter; nilai TIDAK mendukung kutipan
//    (nilai berisi delimiter/kutip akan terpecah) — didokumentasikan di modal.
//  - Baris kosong dilewati; baris dengan kolom > 17 diberi warning & kelebihan
//    kolom diabaikan (bukan error).
//  - Header = baris non-kosong pertama; pemetaan kolom by nama (alias
//    Indonesia + Inggris). Header tak dikenal → fallback urutan template.
//  - BOM UTF-8 (\uFEFF) di awal file dibuang bila ada.

import {
  CSV_COLUMNS,
  INPUT_FIELD_IDS,
  isInputField,
  mapHeader,
  type CsvFieldId,
  type InputFieldId,
} from "./columns";

export type ParsedCsvRow = {
  /** Nomor baris dalam file (1-based, termasuk baris header). */
  index: number;
  /** Sel mentah hasil split (panjang bisa > 17 bila ada kolom ekstra). */
  cells: string[];
  /** Nilai input yang dikenali, sudah di-trim (field calculated diabaikan). */
  values: Partial<Record<InputFieldId, string>>;
};

export type ColumnMapping = {
  position: number;
  label: string;
  field: CsvFieldId | null;
};

export type ParseCsvResult = {
  rows: ParsedCsvRow[];
  delimiter: ";" | ",";
  warnings: string[];
  /** Nomor baris header (1-based); -1 = file kosong. */
  headerIndex: number;
  columnMap: ColumnMapping[];
  unknownColumns: string[];
};

export const MAX_CSV_COLUMNS = CSV_COLUMNS.length;

const EMPTY_RESULT: ParseCsvResult = {
  rows: [],
  delimiter: ";",
  warnings: [],
  headerIndex: -1,
  columnMap: [],
  unknownColumns: [],
};

// Deteksi delimiter: hitung ";" vs "," pada baris sampel (header) — lebih
// banyak menang; seri → ";" (standar Excel Indonesia).
export function detectDelimiter(sampleLine: string): ";" | "," {
  const semis = (sampleLine.match(/;/g) ?? []).length;
  const commas = (sampleLine.match(/,/g) ?? []).length;
  return commas > semis ? "," : ";";
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter);
}

export function parseCsv(text: string): ParseCsvResult {
  const warnings: string[] = [];
  let body = text;
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);

  const lines = body.split(/\r?\n/);
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    warnings.push("File kosong — tidak ada baris header.");
    return { ...EMPTY_RESULT, warnings };
  }

  const delimiter = detectDelimiter(lines[headerIndex]);
  const headerRaw = splitLine(lines[headerIndex], delimiter);
  headerRaw[0] = headerRaw[0].replace(/^\uFEFF/, "").trim();

  let columnMap: ColumnMapping[] = headerRaw.map((label, position) => ({
    position,
    label: label.trim(),
    field: mapHeader(label),
  }));
  const unknownColumns = columnMap.filter((c) => c.field === null).map((c) => c.label);
  if (unknownColumns.length > 0) {
    warnings.push(`Kolom tidak dikenali (diabaikan): ${unknownColumns.join(", ")}`);
  }

  const recognizedCount = columnMap.filter((c) => c.field !== null).length;
  if (recognizedCount === 0) {
    warnings.push("Header tidak dikenali — kolom dipetakan menurut urutan template (Date, Model, Shift, ...).");
    columnMap = columnMap.map((c, position) => ({
      position,
      label: c.label,
      field: INPUT_FIELD_IDS[position] ?? null,
    }));
  }

  const rows: ParsedCsvRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "") continue;
    const cells = splitLine(raw, delimiter);
    if (cells.length > MAX_CSV_COLUMNS) {
      warnings.push(`Baris ${i + 1}: ${cells.length} kolom (maks ${MAX_CSV_COLUMNS}) — kolom ekstra diabaikan.`);
    }
    const values: Partial<Record<InputFieldId, string>> = {};
    for (const mapping of columnMap) {
      const field = mapping.field;
      if (field === null || !isInputField(field)) continue;
      const cell = cells[mapping.position] ?? "";
      values[field] = cell.trim();
    }
    rows.push({ index: i + 1, cells, values });
  }

  return {
    rows,
    delimiter,
    warnings: [...new Set(warnings)],
    headerIndex: headerIndex + 1,
    columnMap,
    unknownColumns,
  };
}