// Helper murni "Tambah Banyak Baris" (TASK tambahkan-fitur-tambah-baris-massal):
// generate N baris quick-entry berisi default (date/shift/area/model + nilai
// kolom sama), memakai buildRecordFromRow supaya calculated (gap*/upph) selalu
// konsisten dengan mesin kalkulasi 1:1 Excel. Murni & testable di node:test;
// UI (quick-entry-table) memvalidasi count & kelengkapan sebelum memanggil.

import type { MockProductionRecord } from "@/lib/mocks/records";
import { buildRecordFromRow, type DraftRowValues } from "./form";

export const BULK_MIN = 1;
export const BULK_MAX = 50;

// Default nilai kolom untuk baris massal — "0" (angka kosong di form = wajib,
// jadi baris baru diisi 0 supaya langsung valid saat disimpan).
export function bulkDefaultValues(): DraftRowValues {
  return {
    uphTarget: "0",
    uphResult: "0",
    hcStandard: "0",
    hcActual: "0",
    plan: "0",
    outputProd: "0",
    totalSetup: "0",
    workingHour: "8",
    totalSetupPacking: "0",
    workingHourPacking: "0",
  };
}

export type GenerateBulkRowsInput = {
  count: number;
  date: string;
  model: string;
  /** "" → null. */
  shift: string;
  /** Nama area opsional; "" → null. */
  areaName?: string;
  /** Override default kolom (mis. target UPH sama utk semua baris). */
  values?: Partial<DraftRowValues>;
  /** Factory id per baris (0-based) — dipisah supaya pure & testable. */
  makeId: (index: number) => string;
  createdByName?: string;
};

export function validateBulkInput(input: GenerateBulkRowsInput): string | null {
  if (!Number.isInteger(input.count) || input.count < BULK_MIN || input.count > BULK_MAX) {
    return `Jumlah baris harus ${BULK_MIN}-${BULK_MAX}.`;
  }
  if (input.date.trim() === "") return "Tanggal wajib diisi.";
  if (input.model.trim() === "") return "Model wajib diisi.";
  return null;
}

export function generateBulkRows(input: GenerateBulkRowsInput): MockProductionRecord[] {
  const invalid = validateBulkInput(input);
  if (invalid) throw new Error(invalid);
  const rows: MockProductionRecord[] = [];
  for (let i = 0; i < input.count; i++) {
    const values = { ...bulkDefaultValues(), ...input.values };
    rows.push(
      buildRecordFromRow({
        id: input.makeId(i),
        date: input.date.trim(),
        model: input.model.trim(),
        shift: input.shift.trim() === "" ? null : input.shift.trim(),
        area:
          input.areaName && input.areaName.trim() !== ""
            ? { id: `area_bulk_${i}_${input.makeId(i)}`, name: input.areaName.trim(), lineCode: null }
            : null,
        values,
        createdByName: input.createdByName ?? "Engineering Staff",
      })
    );
  }
  return rows;
}