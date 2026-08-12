// Select & pemetaan kolom untuk ekspor CSV (GET /api/export) — murni.
// Select lokal (route records tidak mengekspor RECORD_SELECT-nya): 17 kolom
// scalar persis CsvRecord (lib/imports/csv.ts) supaya buildCsv bisa dipakai
// apa adanya. Tanggal di-serialisasi YYYY-MM-DD (kolom @db.Date = tengah
// malam UTC). Semua angka ditulis String(number) oleh buildCsv → desimal titik.

import type { Prisma } from "@/app/generated/prisma/client";
import { CSV_COLUMNS } from "@/lib/imports/columns";

export const EXPORT_SELECT = {
  date: true,
  model: true,
  shift: true,
  uphTarget: true,
  uphResult: true,
  gapUph: true,
  hcStandard: true,
  hcActual: true,
  gapHc: true,
  plan: true,
  outputProd: true,
  gapOp: true,
  upph: true,
  totalSetup: true,
  workingHour: true,
  totalSetupPacking: true,
  workingHourPacking: true,
} as const satisfies Prisma.ProductionRecordSelect;

// Shape baris hasil findMany({ select: EXPORT_SELECT }).
export type ExportRecordRow = {
  date: Date;
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
  upph: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
};

// Tanggal @db.Date dari Prisma = tengah malam UTC → slice ISO aman lintas TZ.
export function formatExportDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Pemetaan row DB → CsvRecord (lib/imports/csv.ts) 1:1. Kolom urut persis
// CSV_COLUMNS (17) — header "Date;Model;Shift;UPH Target;..." tanpa remap.
export function toCsvRecord(row: ExportRecordRow) {
  const record: Record<string, unknown> = {};
  for (const id of CSV_COLUMNS) {
    record[id] = id === "date" ? formatExportDate(row.date) : row[id];
  }
  return record as unknown as {
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
}