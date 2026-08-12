import type { MockProductionRecord } from "@/lib/mocks/records";

// Seri tren — PURE & testable. Agregasi per tanggal mengikuti konvensi "baris
// total" Tabel Produksi Harian (lib/records/totals.ts): numerik dijumlahkan
// (uphResult/outputProd/hcActual/hcStandard/totalSetup), bukan dirata-rata.
// Input dianggap SUDAH terfilter (lib/dashboard/filters.ts); output diurutkan
// kronologis naik (user asc) untuk garis tren SVG kiri→kanan.

export type TrendPoint = {
  date: string; // YYYY-MM-DD
  uphResult: number; // Σ UPH Result
  outputProd: number; // Σ Output Prod
  hcActual: number; // Σ HC Actual
  hcStandard: number; // Σ HC Standard
  totalSetup: number; // Σ Total Setup
};

const ZERO: Omit<TrendPoint, "date"> = {
  uphResult: 0,
  outputProd: 0,
  hcActual: 0,
  hcStandard: 0,
  totalSetup: 0,
};

// Group per tanggal → angka total (atas dasar tanggal leksikografis =
// kronologis). Tanpa ranking/resampling: semua record untuk tanggal yang sama
// dijumlahkan menjadi satu titik.
export function buildSeries(records: MockProductionRecord[]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();
  for (const r of records) {
    const p = byDate.get(r.date) ?? { date: r.date, ...ZERO };
    p.uphResult += r.uphResult;
    p.outputProd += r.outputProd;
    p.hcActual += r.hcActual;
    p.hcStandard += r.hcStandard;
    p.totalSetup += r.totalSetup;
    byDate.set(r.date, p);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}