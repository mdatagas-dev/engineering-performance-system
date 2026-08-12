import type { MockProductionRecord } from "@/lib/mocks/records";
import { addDays, todayIso } from "./dates";

// Filter dashboard — murni & testable, dipakai sebelum grup/agregasi (konsisten
// dengan baris total: filter dulu, baru total dihitung dari hasil filter).
// Tanggal string YYYY-MM-DD → perbandingan leksikografis = kronologis.

export type DateRangeFilter = { from: string | null; to: string | null };

export type DashboardFilters = DateRangeFilter & {
  model: string | null; // null = semua model
  area: string | null; // null = semua area
};

export const EMPTY_FILTERS: DashboardFilters = { from: null, to: null, model: null, area: null };

// Normalisasi rentang: dari harus ≤ sampai; bila terbalik, ditukar (bukan
// dibuang) supaya kontrol date range tetap punya nilai valid.
export function clampDateRange(from: string | null, to: string | null): DateRangeFilter {
  if (from !== null && to !== null && from > to) return { from: to, to: from };
  return { from, to };
}

export function uniqueDates(records: MockProductionRecord[]): string[] {
  return [...new Set(records.map((r) => r.date))].sort();
}

export function uniqueModels(records: MockProductionRecord[]): string[] {
  return [...new Set(records.map((r) => r.model))].sort();
}

export function uniqueAreas(records: MockProductionRecord[]): string[] {
  return [...new Set(records.map((r) => r.area?.name).filter((n): n is string => Boolean(n)))].sort();
}

// Terapkan filter ke record; record tanpa area akan lolos filter area hanya
// bila area = null (semua). Rentang inklusif di kedua ujung.
export function applyFilters(records: MockProductionRecord[], filters: DashboardFilters): MockProductionRecord[] {
  return records.filter((r) => {
    if (filters.from !== null && r.date < filters.from) return false;
    if (filters.to !== null && r.date > filters.to) return false;
    if (filters.model !== null && r.model !== filters.model) return false;
    if (filters.area !== null && (r.area?.name ?? "") !== filters.area) return false;
    return true;
  });
}

// ---- Preset chip cepat (Hari Ini / Minggu Ini / Bulan Ini) — murni. ----

export function presetToday(now?: Date): DateRangeFilter {
  const t = todayIso(now);
  return { from: t, to: t };
}

// N hari terakhir termasuk hari ini (Minggu Ini = 7 hari).
export function presetLastNDays(n: number, now?: Date): DateRangeFilter {
  const t = todayIso(now);
  return { from: addDays(t, -(n - 1)), to: t };
}

// Tanggal 1 bulan berjalan s.d. hari ini.
export function presetMonthToDate(now?: Date): DateRangeFilter {
  const t = todayIso(now);
  return { from: `${t.slice(0, 8)}01`, to: t };
}

export function isPresetActive(filters: DateRangeFilter, preset: DateRangeFilter): boolean {
  return filters.from === preset.from && filters.to === preset.to;
}