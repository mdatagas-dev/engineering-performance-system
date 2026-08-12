// Gabung & urutkan record produksi utk halaman impor/ekspor — murni,
// dipakai bersama app/import dan app/export (seed + simpanan localStorage).
// Saved record menang atas seed bila id kembar; urutan: tanggal (asc/desc
// sesuai pilihan UI) → shift asc → model asc (paralel production-table).

import type { MockProductionRecord } from "@/lib/mocks/records";

export type DateSortOrder = "asc" | "desc";

export function mergeAndSortRecords(
  saved: readonly MockProductionRecord[],
  mock: readonly MockProductionRecord[],
  order: DateSortOrder = "desc"
): MockProductionRecord[] {
  const byId = new Map<string, MockProductionRecord>();
  for (const r of mock) byId.set(r.id, r);
  for (const r of saved) byId.set(r.id, r);
  const dir = order === "asc" ? 1 : -1;
  return [...byId.values()].sort(
    (a, b) =>
      dir * a.date.localeCompare(b.date) ||
      (a.shift ?? "").localeCompare(b.shift ?? "") ||
      a.model.localeCompare(b.model)
  );
}