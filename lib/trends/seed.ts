import { withTrendVariants } from "@/lib/dashboard/trend";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";

// Seed tren khusus Analisis Tren — PURE (pola lib/dashboard/trend.ts, reuse
// withTrendVariants). Mock shared (lib/mocks/records.ts) hanya punya 2 tanggal,
// kurang untuk garis tren & perbandingan periode; di sini tiap record seed
// dibuat varian tanggal mundur (nilai identik, id deterministik) sehingga
// rentang data cukup untuk preset 7/30 hari. Record user (localStorage) TIDAK
// pernah diubah — seed ini khusus mock.
export const TREND_VARIANTS_PER_ROW = 15;

export function buildTrendSeed(): MockProductionRecord[] {
  return withTrendVariants(mockProductionRecords, { variantsPerRow: TREND_VARIANTS_PER_ROW, daysStep: 1 });
}