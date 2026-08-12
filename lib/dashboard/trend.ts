import type { MockProductionRecord } from "@/lib/mocks/records";
import { addDays } from "./dates";

export type TrendOptions = {
  // Jumlah varian tanggal per baris seed; 1 (default) cukup untuk tren ≥ 3 tanggal
  // (mock hanya 2 tanggal).
  variantsPerRow?: number;
  // Jarak mundur tiap varian berikutnya, dalam hari.
  daysStep?: number;
};

// Seed tren INLINE khusus dashboard — mock shared (lib/mocks/records.ts) TIDAK
// diedit. Untuk tiap record seed dibuat N varian dengan tanggal mundur, nilai
// identik, dan id deterministik; murni: input tidak pernah dimutasi, output
// adalah array baru (dengan [ ...records, ...variants ]).
export function withTrendVariants(records: MockProductionRecord[], options: TrendOptions = {}): MockProductionRecord[] {
  const { variantsPerRow = 1, daysStep = 1 } = options;
  const variants: MockProductionRecord[] = [];
  for (const r of records) {
    for (let i = 1; i <= variantsPerRow; i++) {
      variants.push({ ...r, id: `${r.id}__trend_v${i}`, date: addDays(r.date, -i * daysStep) });
    }
  }
  return [...records, ...variants];
}