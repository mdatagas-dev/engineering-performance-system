// Definisi kolom CSV Impor/Ekspor — satu sumber kebenaran label & alias header.
// Format "Excel" antar muka = CSV UTF-8 (BOM \uFEFF + pemisah ";", desimal titik).
// Label persis PRD/Excel (Indonesian) sama dengan Tabel Produksi Harian:
// 17 kolom = 13 input raw + 4 calculated (GAP UPH/HC/OP, UPPH).

export const INPUT_FIELD_IDS = [
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
export type InputFieldId = (typeof INPUT_FIELD_IDS)[number];

export const CALC_FIELD_IDS = ["gapUph", "gapHc", "gapOp", "upph"] as const;
export type CalcFieldId = (typeof CALC_FIELD_IDS)[number];

export type CsvFieldId = InputFieldId | CalcFieldId;

export const NUMERIC_INPUT_FIELD_IDS = [
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
export type NumericInputFieldId = (typeof NUMERIC_INPUT_FIELD_IDS)[number];

export const CSV_COLUMN_LABELS: Record<CsvFieldId, string> = {
  date: "Date",
  model: "Model",
  shift: "Shift",
  uphTarget: "UPH Target",
  uphResult: "UPH Result",
  gapUph: "GAP UPH",
  hcStandard: "HC Standard",
  hcActual: "HC Actual",
  gapHc: "GAP HC",
  plan: "Plan",
  outputProd: "Output Prod",
  gapOp: "GAP OP",
  upph: "UPPH",
  totalSetup: "Total Setup",
  workingHour: "Working Hour",
  totalSetupPacking: "Total Setup Packing",
  workingHourPacking: "Working Hour Packing",
};

// Urutan persis PRD/Excel — dipakai header ekspor & ekspektasi urutan fallback impor.
export const CSV_COLUMNS: readonly CsvFieldId[] = [
  "date",
  "model",
  "shift",
  "uphTarget",
  "uphResult",
  "gapUph",
  "hcStandard",
  "hcActual",
  "gapHc",
  "plan",
  "outputProd",
  "gapOp",
  "upph",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
];

export function isInputField(field: CsvFieldId): field is InputFieldId {
  return (INPUT_FIELD_IDS as readonly string[]).includes(field);
}

export function isNumericInputField(field: InputFieldId): field is NumericInputFieldId {
  return (NUMERIC_INPUT_FIELD_IDS as readonly string[]).includes(field);
}

// Normalisasi nama header utk pencocokan case/space/garis bawah-insensitif.
export function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Alias header: nama Indonesia resmi + Inggris/umum. Yang di-import hanya
// kolom INPUT; kolom calculated dikenali untuk ditampilkan sebagai
// "dihitung otomatis" tapi nilainya diabaikan.
const HEADER_ALIASES: Record<string, CsvFieldId> = {
  date: "date",
  tanggal: "date",
  model: "model",
  shift: "shift",
  uphtarget: "uphTarget",
  targetuph: "uphTarget",
  uphresult: "uphResult",
  resultuph: "uphResult",
  hasiluph: "uphResult",
  gapuph: "gapUph",
  uphgap: "gapUph",
  hcstandard: "hcStandard",
  standardhc: "hcStandard",
  hcstandar: "hcStandard",
  hcactual: "hcActual",
  actualhc: "hcActual",
  hcaktual: "hcActual",
  aktualhc: "hcActual",
  gaphc: "gapHc",
  hcgap: "gapHc",
  plan: "plan",
  outputprod: "outputProd",
  output: "outputProd",
  outputproduction: "outputProd",
  outputproduksi: "outputProd",
  gapop: "gapOp",
  opgap: "gapOp",
  gapoutput: "gapOp",
  upph: "upph",
  totalsetup: "totalSetup",
  setup: "totalSetup",
  workinghour: "workingHour",
  workinghours: "workingHour",
  jamkerja: "workingHour",
  totalsetuppacking: "totalSetupPacking",
  setuppacking: "totalSetupPacking",
  workinghourpacking: "workingHourPacking",
  workinghourspacking: "workingHourPacking",
  jamkerjapacking: "workingHourPacking",
};

export function mapHeader(raw: string): CsvFieldId | null {
  return HEADER_ALIASES[normalizeHeader(raw)] ?? null;
}