// Whitelist & parser kolom input raw ProductionRecord — dipakai bersama oleh
// koreksi (lib/records/correction.ts) dan edit DRAFT (lib/records/edit.ts).
// Calculated (gap*, upph), status, version, kolom actor: tidak pernah editable.

export const EDITABLE_FIELDS = [
  "date",
  "model",
  "shift",
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
] as const;

export const NUMERIC_FIELDS = [
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
] as const;

export const CALC_INPUT_FIELDS = [
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
] as const;

// Batas numeric-safe (1:1 keputusan validasi form frontend): 1e15 <
// Number.MAX_SAFE_INTEGER sehingga tidak ada presisi yang hilang. Nilai di
// atas ini dianggap salah ketik, bukan batas bisnis (Excel PRD = source of
// truth untuk batas bisnis). Satu sumber kebenaran: dipakai fields.ts
// (backend) dan form.ts (frontend).
export const MAX_NUMERIC_MAGNITUDE = 1e15;

// String tanggal wajib YYYY-MM-DD sebelum divalidasi Date — mencegah parse
// lenient JS (new Date("0") = tahun 2000, new Date("2026") = Jan 2026).
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type RecordFieldValue = number | string | Date | null;
export type RecordFields = Record<string, RecordFieldValue>;

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type RecordFieldsResult = Ok<RecordFields> | Fail;

function parseFieldValue(field: string, v: unknown): Ok<RecordFieldValue> | Fail {
  if ((NUMERIC_FIELDS as readonly string[]).includes(field)) {
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      v < 0 ||
      v > MAX_NUMERIC_MAGNITUDE
    ) {
      return {
        ok: false,
        message: `Field ${field} harus berupa angka non-negatif maksimal ${MAX_NUMERIC_MAGNITUDE}.`,
      };
    }
    return { ok: true, data: v };
  }
  if (field === "date") {
    if (typeof v !== "string") {
      return { ok: false, message: "Field date harus berupa string tanggal (YYYY-MM-DD)." };
    }
    // Parse JS lenient (roll-over & tanpa format penuh) ditolak: regex ketat +
    // round-trip — new Date("2026-02-30") sukses di V8 (roll ke 2026-03-02),
    // jadi validitas hari/bulan dicek dengan membandingkan output ISO.
    if (!DATE_ONLY_RE.test(v)) {
      return { ok: false, message: "Field date tidak valid (format YYYY-MM-DD)." };
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
      return { ok: false, message: "Field date tidak valid." };
    }
    return { ok: true, data: d };
  }
  if (field === "model") {
    if (typeof v !== "string" || v.trim() === "") {
      return { ok: false, message: "Field model wajib diisi." };
    }
    return { ok: true, data: v.trim() };
  }
  if (field === "shift") {
    if (typeof v !== "string" && v !== null) {
      return { ok: false, message: "Field shift harus berupa teks." };
    }
    return { ok: true, data: typeof v === "string" ? v.trim() || null : null };
  }
  return { ok: false, message: `Field ${field} tidak dapat diubah.` };
}

export function parseRecordFields(fields: unknown): RecordFieldsResult {
  if (!isPlainObject(fields)) {
    return { ok: false, message: "fields harus berupa objek." };
  }
  const data: RecordFields = {};
  for (const [key, value] of Object.entries(fields)) {
    const parsed = parseFieldValue(key, value);
    if (!parsed.ok) return parsed;
    data[key] = parsed.data;
  }
  return { ok: true, data };
}
