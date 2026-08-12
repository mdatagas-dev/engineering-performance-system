// Seed riwayat impor tiruan — dipakai loadImportHistory saat localStorage
// kosong. Tipe entri di lib/imports/history.ts (type-only import: tidak ada
// siklus runtime).

import type { ImportHistoryEntry } from "./history";

export function mockImportHistory(): ImportHistoryEntry[] {
  return [
    {
      id: "imp_seed_1",
      fileName: "produksi_2026-08-10.csv",
      rowsImported: 18,
      rowsSkipped: 0,
      importedAt: "2026-08-10T09:12:00+07:00",
      importedBy: "staff@eps.local",
      status: "success",
    },
    {
      id: "imp_seed_2",
      fileName: "produksi_2026-08-11.csv",
      rowsImported: 22,
      rowsSkipped: 2,
      importedAt: "2026-08-11T10:05:00+07:00",
      importedBy: "staff@eps.local",
      status: "partial",
    },
    {
      id: "imp_seed_3",
      fileName: "produksi_2026-08-12.csv",
      rowsImported: 0,
      rowsSkipped: 5,
      importedAt: "2026-08-12T08:30:00+07:00",
      importedBy: "staff@eps.local",
      status: "failed",
    },
  ];
}