// Total per kelompok untuk Tabel Produksi Harian — murni & testable.
// Mengikuti pattern lib/records/totals.ts + lib/mocks/records.ts: GAP & UPPH
// TIDAK dijumlahkan per baris — dihitung ulang DARI TOTAL grup memakai
// calculateCalculated (lib/records/calculate.ts, formula Excel/PRD 1:1).
//
// Keputusan grouping: kelompok = TANGGAL. Bila satu tanggal punya >1 shift,
// ada subtotal BONUS per shift (breakdown). TIDAK ada total global — baris
// total ditampilkan per grup tanggal saja. Urutan: tanggal desc, shift asc.

import { calculateCalculated, type CalculatedFields } from "@/lib/records/calculate";

// Shape minimal baris produksi (struktural: MockProductionRecord & TableTotal
// cocok di sini — tidak tergantung lib/mocks supaya tetap murni).
export type ProductionRow = {
  date: string; // YYYY-MM-DD
  shift: string | null;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
};

export type TableTotal = ProductionRow & {
  count: number;
} & CalculatedFields;

export type ProductionDateGroup<T extends ProductionRow = ProductionRow> = {
  date: string;
  /** shift key terurut ("" = null), biar UI tahu kapan perlu breakdown. */
  shifts: readonly string[];
  /** baris asli per shift key — key "" = shift null. */
  rows: ReadonlyMap<string, readonly T[]>;
  /** subtotal per shift — kosong bila tanggal hanya punya 1 shift. */
  shiftTotals: readonly TableTotal[];
  /** total seluruh record pada tanggal tsb. */
  dateTotal: TableTotal;
};

const SHIFT_NULL_KEY = "";

export function groupProductionTotals<T extends ProductionRow>(
  rows: readonly T[]
): ProductionDateGroup<T>[] {
  const byDate = new Map<string, Map<string, T[]>>();
  for (const row of rows) {
    const shiftKey = row.shift ?? SHIFT_NULL_KEY;
    let shifts = byDate.get(row.date);
    if (!shifts) {
      shifts = new Map();
      byDate.set(row.date, shifts);
    }
    let list = shifts.get(shiftKey);
    if (!list) {
      list = [];
      shifts.set(shiftKey, list);
    }
    list.push(row);
  }

  const groups: ProductionDateGroup<T>[] = [];
  for (const [date, shifts] of byDate) {
    const shiftKeys = [...shifts.keys()].sort((a, b) => a.localeCompare(b));
    const shiftTotals = shiftKeys.map((key) => {
      const shift = key === SHIFT_NULL_KEY ? null : key;
      return sumRows(date, shift, shifts.get(key) ?? []);
    });
    const dateTotal = sumRows(date, null, shiftTotals);
    groups.push({ date, shifts: shiftKeys, rows: shifts, shiftTotals, dateTotal });
  }

  // Tanggal desc (ISO string aman diurutkan leksikografis), urutan baris di
  // dalam grup mengikuti urutan input (sudah diurutkan shift asc / model asc).
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

function sumRows<T extends ProductionRow>(
  date: string,
  shift: string | null,
  rows: readonly T[]
): TableTotal {
  let count = 0;
  let uphTarget = 0;
  let uphResult = 0;
  let hcStandard = 0;
  let hcActual = 0;
  let plan = 0;
  let outputProd = 0;
  let totalSetup = 0;
  let workingHour = 0;
  let totalSetupPacking = 0;
  let workingHourPacking = 0;
  for (const r of rows) {
    // dateTotal dihitung dari shiftTotals (yang punya count agregat) — jangan
    // menghitung entri, tapi jumlah record asli di dalamnya.
    const aggregatedCount = (r as { count?: number }).count;
    count += typeof aggregatedCount === "number" ? aggregatedCount : 1;
    uphTarget += r.uphTarget;
    uphResult += r.uphResult;
    hcStandard += r.hcStandard;
    hcActual += r.hcActual;
    plan += r.plan;
    outputProd += r.outputProd;
    totalSetup += r.totalSetup;
    workingHour += r.workingHour;
    totalSetupPacking += r.totalSetupPacking;
    workingHourPacking += r.workingHourPacking;
  }
  return {
    date,
    shift,
    count,
    uphTarget,
    uphResult,
    hcStandard,
    hcActual,
    plan,
    outputProd,
    totalSetup,
    workingHour,
    totalSetupPacking,
    workingHourPacking,
    ...calculateCalculated({ uphTarget, uphResult, hcStandard, hcActual, plan, outputProd }),
  };
}