// Service simpan impor — murni & testable (node:test): ubah baris valid jadi
// data createMany & simpan lewat transaction client. Calculated dihitung ulang
// via calculateCalculated (mesin 1:1 Excel/PRD yang sama dengan create/edit);
// status DRAFT + version 1 + createdBy + importHistoryId (link rollback).
// Baris error dilewati dan dilaporkan — kontrak saveValidRows:
// { valid, skipped, errors[] }. Version snapshot per record TIDAK dibuat
// (bulk: rollback lewat importHistoryId; restore per versi tidak relevan utk
// data mentah impor).

import { Prisma } from "@/app/generated/prisma/client";
import { ImportStatus, RecordStatus } from "@/app/generated/prisma/enums";
import { calculateCalculated } from "@/lib/records/calculate";
import type { ParsedCsvRow } from "@/lib/imports/parse";
import type { NumericInputFieldId } from "@/lib/imports/columns";
import {
  normalizeShift,
  parseNumericCell,
  type ImportValidationResult,
  type ImportRowReportEntry,
} from "./validate";

export type BuildImportedRecordInput = {
  row: ParsedCsvRow;
  delimiter: ";" | ",";
  areaId: string | null;
  importedBy: string;
  importHistoryId: string;
};

// Data createMany lengkap (FK scalar; id di-generate DB). Nilai numerik
// dijamin valid — saveValidRows hanya menerima baris lolos validasi.
export function buildImportedRecordData(
  input: BuildImportedRecordInput
): Prisma.ProductionRecordCreateManyInput {
  const values = input.row.values;
  const num = (field: NumericInputFieldId): number => {
    const n = parseNumericCell(values[field], input.delimiter);
    if (n === null) {
      throw new Error(`Baris ${input.row.index}: nilai numerik tidak valid setelah validasi.`);
    }
    return n;
  };

  const uphTarget = num("uphTarget");
  const uphResult = num("uphResult");
  const hcStandard = num("hcStandard");
  const hcActual = num("hcActual");
  const plan = num("plan");
  const outputProd = num("outputProd");
  const calculated = calculateCalculated({ uphTarget, uphResult, hcStandard, hcActual, plan, outputProd });

  return {
    date: new Date((values.date ?? "").trim()),
    model: (values.model ?? "").trim(),
    shift: normalizeShift(values.shift),
    areaId: input.areaId,
    uphTarget,
    uphResult,
    hcStandard,
    hcActual,
    plan,
    outputProd,
    totalSetup: num("totalSetup"),
    workingHour: num("workingHour"),
    totalSetupPacking: num("totalSetupPacking"),
    workingHourPacking: num("workingHourPacking"),
    gapUph: calculated.gapUph,
    gapHc: calculated.gapHc,
    gapOp: calculated.gapOp,
    upph: calculated.upph ?? 0,
    status: RecordStatus.DRAFT,
    version: 1,
    createdBy: input.importedBy,
    importHistoryId: input.importHistoryId,
  };
}

export type SaveValidRowsInput = {
  tx: Prisma.TransactionClient;
  rows: readonly ParsedCsvRow[];
  validation: ImportValidationResult;
  delimiter: ";" | ",";
  areaId: string | null;
  importedBy: string;
  importHistoryId: string;
};

export type SaveValidRowsResult = {
  valid: number;
  skipped: number;
  errors: ImportRowReportEntry[];
};

export async function saveValidRows(input: SaveValidRowsInput): Promise<SaveValidRowsResult> {
  const byIndex = new Map(input.rows.map((r) => [r.index, r]));
  const validRows = input.validation.rows.filter((r) => r.status === "ok");

  if (validRows.length > 0) {
    const data: Prisma.ProductionRecordCreateManyInput[] = [];
    for (const v of validRows) {
      const row = byIndex.get(v.index);
      if (!row) continue;
      data.push(
        buildImportedRecordData({
          row,
          delimiter: input.delimiter,
          areaId: input.areaId,
          importedBy: input.importedBy,
          importHistoryId: input.importHistoryId,
        })
      );
    }
    await input.tx.productionRecord.createMany({ data });
  }

  return {
    valid: validRows.length,
    skipped: input.validation.errorCount,
    errors: input.validation.errors,
  };
}

// Status riwayat: FAILED bila tidak ada baris valid sama sekali, PARTIAL bila
// ada baris dilewati, SUCCESS bila semua baris terimpor.
export function deriveImportStatus(validCount: number, skippedCount: number): ImportStatus {
  if (validCount === 0) return ImportStatus.FAILED;
  return skippedCount > 0 ? ImportStatus.PARTIAL : ImportStatus.SUCCESS;
}