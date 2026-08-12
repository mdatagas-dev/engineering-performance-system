// Query ekspor (GET /api/export) — REUSE buildRecordsQuery (lib/records/query.ts):
// filter sama persis GET /api/records (status/from/to/model/models/areaId/area/
// shift/sort/order), TIDAK ada pagination: seluruh hasil filter diekspor.
// Keamanan: cap EXPORT_MAX_ROWS baris (ambil take) supaya satu request tidak
// bisa men-download seluruh DB.

import { buildRecordsQuery } from "@/lib/records/query";
import type { Prisma } from "@/app/generated/prisma/client";

export const EXPORT_MAX_ROWS = 50_000;

// Param filter yang dikirim frontend (hanya key valid — snapshot auditori;
// nilai undefined dibuang dari objek agar JSON bersih).
const FILTER_KEYS = [
  "status",
  "from",
  "to",
  "model",
  "models",
  "areaId",
  "area",
  "shift",
  "sort",
  "order",
] as const;

export type ExportFilter = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export type ExportQuery = {
  filter: ExportFilter;
  where: Prisma.ProductionRecordWhereInput;
  orderBy: Prisma.ProductionRecordOrderByWithRelationInput[];
  take: number;
};

export function buildExportFilter(url: URL): ExportFilter {
  const filter: ExportFilter = {};
  for (const key of FILTER_KEYS) {
    const value = url.searchParams.get(key);
    if (value !== null && value !== "") filter[key] = value;
  }
  return filter;
}

// where/orderBy identik GET /api/records; page/perPage DIABAIKAN (export semua
// hasil, cap take via EXPORT_MAX_ROWS) — keputusan task: ekspor penuh, bukan
// halaman saat ini.
export function buildExportQuery(url: URL): ExportQuery {
  const filter = buildExportFilter(url);
  const built = buildRecordsQuery(filter);
  return { filter, where: built.where, orderBy: built.orderBy, take: EXPORT_MAX_ROWS };
}