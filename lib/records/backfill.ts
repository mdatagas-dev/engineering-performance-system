// Backfill versi awal "Riwayat Versi Data" (PRD Fase 3): record produksi yang
// sudah ada SEBELUM fitur versioning belum punya snapshot. Snapshot = state
// data record (raw + calculated + status + version) saat ini; version diambil
// dari kolom version record (default 1) agar nomor snapshot cocok dengan nomor
// versi record. Action "BACKFILL" — bukan "CREATED" — agar jujur: ini bukan
// event create yang direkam live, tapi riwayat awal yang diisi belakangan.
// Kolom actor & timestamp tidak masuk snapshot (state data saja); changedBy
// record mencakup aktor.

import type { Prisma } from "@/app/generated/prisma/client";
import type { ProductionRecord } from "@/app/generated/prisma/client";

export const BACKFILL_ACTION = "BACKFILL" as const;
export const BACKFILL_REASON = "Backfill versi awal (sebelum fitur versioning)";

export function buildBackfillSnapshot(record: ProductionRecord): Prisma.InputJsonValue {
  return {
    date: record.date.toISOString(),
    model: record.model,
    shift: record.shift,
    areaId: record.areaId,
    uphTarget: record.uphTarget,
    uphResult: record.uphResult,
    hcStandard: record.hcStandard,
    hcActual: record.hcActual,
    plan: record.plan,
    outputProd: record.outputProd,
    totalSetup: record.totalSetup,
    workingHour: record.workingHour,
    totalSetupPacking: record.totalSetupPacking,
    workingHourPacking: record.workingHourPacking,
    gapUph: record.gapUph,
    gapHc: record.gapHc,
    gapOp: record.gapOp,
    upph: record.upph,
    status: record.status,
    version: record.version,
  };
}
