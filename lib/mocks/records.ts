// Mock ProductionRecord untuk halaman Input Data Produksi — frontend-first
// (backend phase 2 belum ada API). Shape meniru prisma/schema.prisma
// ProductionRecord. Calculated field (gapUph/gapHc/gapOp/upph) TIDAK di-hardcode:
// dihitung via calculateCalculated (lib/records/calculate.ts, murni & 1:1 Excel)
// supaya mock selalu konsisten dengan mesin kalkulasi backend.

import { calculateCalculated, type CalculatedFields } from "@/lib/records/calculate";
import { RecordStatus } from "@/app/generated/prisma/enums";

export type MockProductionRecord = {
  id: string;
  date: string; // YYYY-MM-DD
  model: string;
  shift: string | null;
  area: { id: string; name: string; lineCode: string | null } | null;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
  status: RecordStatus;
  version: number;
  createdByName: string;
} & CalculatedFields;

const AREA = { id: "area_machining", name: "Machining Line 1", lineCode: "L1" };

// Data contoh mengikuti contoh validasi PRD: model 1 UPH 90/90 → GAP 0,
// HC 30/32 → GAP 2, Plan 960/Output 1000 → GAP 40; model 2 Plan 0/Output 1+1
// → total Output 1002 & GAP OP 42.
function build(
  id: string,
  raw: Pick<
    MockProductionRecord,
    | "date"
    | "model"
    | "shift"
    | "uphTarget"
    | "uphResult"
    | "hcStandard"
    | "hcActual"
    | "plan"
    | "outputProd"
    | "totalSetup"
    | "workingHour"
    | "totalSetupPacking"
    | "workingHourPacking"
  >,
  status: RecordStatus
): MockProductionRecord {
  const { uphTarget, uphResult, hcStandard, hcActual, plan, outputProd, ...rest } = raw;
  return {
    id,
    ...rest,
    uphTarget,
    uphResult,
    hcStandard,
    hcActual,
    plan,
    outputProd,
    ...calculateCalculated({ uphTarget, uphResult, hcStandard, hcActual, plan, outputProd }),
    area: AREA,
    status,
    version: 1,
    createdByName: "Engineering Staff",
  };
}

export const mockProductionRecords: MockProductionRecord[] = [
  build(
    "rec_mock_1",
    {
      date: "2026-08-12",
      model: "LV-3000",
      shift: "1",
      uphTarget: 90,
      uphResult: 90,
      hcStandard: 30,
      hcActual: 32,
      plan: 960,
      outputProd: 1000,
      totalSetup: 12,
      workingHour: 8,
      totalSetupPacking: 6,
      workingHourPacking: 2,
    },
    RecordStatus.APPROVED
  ),
  build(
    "rec_mock_2",
    {
      date: "2026-08-12",
      model: "LV-5000",
      shift: "1",
      uphTarget: 100,
      uphResult: 102,
      hcStandard: 25,
      hcActual: 26,
      plan: 0,
      outputProd: 2,
      totalSetup: 8,
      workingHour: 8,
      totalSetupPacking: 4,
      workingHourPacking: 2,
    },
    RecordStatus.DRAFT
  ),
  build(
    "rec_mock_3",
    {
      date: "2026-08-12",
      model: "LV-3000",
      shift: "2",
      uphTarget: 90,
      uphResult: 85,
      hcStandard: 30,
      hcActual: 30,
      plan: 700,
      outputProd: 680,
      totalSetup: 10,
      workingHour: 8,
      totalSetupPacking: 5,
      workingHourPacking: 2,
    },
    RecordStatus.DRAFT
  ),
  build(
    "rec_mock_4",
    {
      date: "2026-08-11",
      model: "LV-8000",
      shift: "1",
      uphTarget: 75,
      uphResult: 80,
      hcStandard: 28,
      hcActual: 30,
      plan: 600,
      outputProd: 640,
      totalSetup: 15,
      workingHour: 8,
      totalSetupPacking: 7,
      workingHourPacking: 2,
    },
    RecordStatus.APPROVED
  ),
];

// Record yang disimpan user lewat form (mock) — disimpan terpisah dari seed di
// localStorage supaya refresh tidak kehilangan input. Pattern meniru
// lib/mocks/audit.ts / roleChange.ts. Backend CRUD menggantikan di fase nanti.
export const RECORDS_STORAGE_KEY = "eps_mock_records";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadSavedRecords(storage: StorageLike | null | undefined): MockProductionRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockProductionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSavedRecords(storage: StorageLike, records: MockProductionRecord[]): void {
  storage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

// Daftar model unik dari seed — saran datalist input model (free text tetap jalan).
export const mockModelOptions: string[] = [...new Set(mockProductionRecords.map((r) => r.model))].sort();

export type MockRecordTotal = {
  count: number;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
} & CalculatedFields;

// Baris TOTAL: sum numerik, lalu GAP & UPPH dihitung DARI TOTAL (bukan jumlah
// GAP per baris) — formula Excel/PRD, sama seperti lib/records/totals.ts.
export function buildMockRecordTotal(records: MockProductionRecord[]): MockRecordTotal {
  const sum = (f: "uphTarget" | "uphResult" | "hcStandard" | "hcActual" | "plan" | "outputProd" | "totalSetup" | "workingHour" | "totalSetupPacking" | "workingHourPacking") =>
    records.reduce((acc, r) => acc + r[f], 0);
  return {
    count: records.length,
    uphTarget: sum("uphTarget"),
    uphResult: sum("uphResult"),
    hcStandard: sum("hcStandard"),
    hcActual: sum("hcActual"),
    plan: sum("plan"),
    outputProd: sum("outputProd"),
    totalSetup: sum("totalSetup"),
    workingHour: sum("workingHour"),
    totalSetupPacking: sum("totalSetupPacking"),
    workingHourPacking: sum("workingHourPacking"),
    ...calculateCalculated({
      uphTarget: sum("uphTarget"),
      uphResult: sum("uphResult"),
      hcStandard: sum("hcStandard"),
      hcActual: sum("hcActual"),
      plan: sum("plan"),
      outputProd: sum("outputProd"),
    }),
  };
}
