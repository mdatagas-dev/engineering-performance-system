// Helper murni form isian harian (frontend): parse input → preview kalkulasi
// instan (reuse calculateCalculated), validasi ringan (non-negatif; GAP boleh
// negatif), deteksi duplikat date+model+shift, dan bangun record mock untuk
// disimpan. Tanpa akses DOM/window — diuji lewat node:test (form.test.ts).
// Validasi penuh (rentang, anomali, duplikat backend) di fase backend nanti.
//
// Keputusan validasi (TASK implementasikan-validasi-input-frontend):
//  - Batas Maksimum: hanya numeric-safe (bukan NaN/±Infinity, |n| ≤ 1e15) —
//    TIDAK menebak batas bisnis (Excel PRD = source of truth untuk itu).
//  - Tanggal masa depan TIDAK divalidasi: data produksi sah diinput lintas
//    tanggal (backdate/planning), tanpa justifikasi bisnis untuk menolaknya.
//  - Simpan & preview memakai validateRow/calcPreview yang sama → konsisten.

import { calculateCalculated, type CalculatedFields } from "./calculate";
import { CALC_INPUT_FIELDS, NUMERIC_FIELDS, MAX_NUMERIC_MAGNITUDE } from "./fields";
import type { MockProductionRecord } from "@/lib/mocks/records";

export type NumericField = (typeof NUMERIC_FIELDS)[number];

// Re-export konstanta batas numeric-safe (definisi tunggal di fields.ts) —
// backend & frontend berbagi satu sumber kebenaran.
export { MAX_NUMERIC_MAGNITUDE };

export type DraftRowValues = Record<NumericField, string>;

// "" / non-parseable → null (preview "—"); nilai negatif tetap di-parse, penolakan
// ada di validateRow (error "Minimal 0").
export function parseNumeric(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Preview GAP/UPPH live saat ketik. null bila salah satu dari 6 input kalkulasi
// kosong/invalid; UPPH null (HC Actual 0) dihandle calculateCalculated.
export function calcPreview(values: DraftRowValues): CalculatedFields | null {
  const input = {} as Record<string, number>;
  for (const f of CALC_INPUT_FIELDS) {
    const n = parseNumeric(values[f]);
    if (n === null) return null;
    input[f] = n;
  }
  return calculateCalculated({
    uphTarget: input.uphTarget,
    uphResult: input.uphResult,
    hcStandard: input.hcStandard,
    hcActual: input.hcActual,
    plan: input.plan,
    outputProd: input.outputProd,
  });
}

export type RowErrors = Partial<Record<"date" | "model" | NumericField, string>>;

// Validasi ringan frontend: wajib date/model, numerik wajib + non-negatif +
// numeric-safe (bukan NaN/±Infinity, |n| ≤ 1e15). GAP (hasil pengurangan)
// boleh negatif — tidak divalidasi di sini. Tanggal masa depan dibiarkan lolos.
export function validateRow(row: { date: string; model: string; values: DraftRowValues }): RowErrors {
  const errors: RowErrors = {};
  if (row.date.trim() === "") errors.date = "Wajib diisi";
  if (row.model.trim() === "") errors.model = "Wajib diisi";
  for (const f of NUMERIC_FIELDS) {
    const t = row.values[f].trim();
    if (t === "") {
      errors[f] = "Wajib diisi";
    } else if (!Number.isFinite(Number(t))) {
      errors[f] = "Harus angka";
    } else if (Number(t) < 0) {
      errors[f] = "Minimal 0";
    } else if (Math.abs(Number(t)) > MAX_NUMERIC_MAGNITUDE) {
      errors[f] = "Terlalu besar";
    }
  }
  return errors;
}

// Deteksi duplikat date+model+shift ringan: antar baris form + terhadap record
// yang sudah ada (seed/saved). Signature case-insensitive utk model/shift,
// shift kosong ≈ null. Backend mendeteksi duplikat final di fase nanti.
export function duplicateRowKeys(
  rows: { key: string; date: string; model: string; shift: string }[],
  existing: { date: string; model: string; shift: string | null }[]
): Set<string> {
  const sigOf = (date: string, model: string, shift: string | null) =>
    `${date.trim()}|${model.trim().toLowerCase()}|${(shift ?? "").trim().toLowerCase()}`;
  const bySig = new Map<string, string>();
  const dups = new Set<string>();
  for (const r of rows) {
    if (r.date.trim() === "" || r.model.trim() === "") continue;
    const sig = sigOf(r.date, r.model, r.shift);
    const other = bySig.get(sig);
    if (other !== undefined) {
      dups.add(other);
      dups.add(r.key);
    } else {
      bySig.set(sig, r.key);
    }
  }
  const existingSigs = new Set(
    existing.filter((e) => e.date !== "" && e.model !== "").map((e) => sigOf(e.date, e.model, e.shift))
  );
  for (const r of rows) {
    if (r.date.trim() === "" || r.model.trim() === "") continue;
    if (existingSigs.has(sigOf(r.date, r.model, r.shift))) dups.add(r.key);
  }
  return dups;
}

// Bangun record mock dari baris yang SUDAH lolos validateRow. Numerik yang
// tertulis string di-parse ulang (dijamin valid); calculated via
// calculateCalculated supaya konsisten 1:1 mesin backend.
export function buildRecordFromRow(input: {
  id: string;
  date: string;
  model: string;
  shift: string | null;
  area: { id: string; name: string; lineCode: string | null } | null;
  values: DraftRowValues;
  createdByName: string;
}): MockProductionRecord {
  const nums = {} as Record<NumericField, number>;
  for (const f of NUMERIC_FIELDS) nums[f] = parseNumeric(input.values[f]) ?? 0;
  return {
    id: input.id,
    date: input.date,
    model: input.model.trim(),
    shift: input.shift,
    area: input.area,
    ...nums,
    ...calculateCalculated({
      uphTarget: nums.uphTarget,
      uphResult: nums.uphResult,
      hcStandard: nums.hcStandard,
      hcActual: nums.hcActual,
      plan: nums.plan,
      outputProd: nums.outputProd,
    }),
    status: "DRAFT",
    version: 1,
    createdByName: input.createdByName,
  } as MockProductionRecord;
}

// Kebalikan dari buildRecordFromRow: record → DraftRowValues (sring). Dipakai
// quick-entry & editor lain supaya validasi Simpan memakai jalur validateRow
// yang SAMA dengan form per-baris (konsistensi Simpan vs preview).
export function recordToDraftValues(record: MockProductionRecord): DraftRowValues {
  const values = {} as DraftRowValues;
  for (const f of NUMERIC_FIELDS) values[f] = String(record[f]);
  return values;
}
