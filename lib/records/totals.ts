import type { Prisma } from "@/app/generated/prisma/client";

// Field numerik yang dijumlahkan untuk baris total. GAP & UPPH TIDAK dijumlahkan
// langsung — dihitung ulang dari total (formula Excel/PRD): gap = sum(A) − sum(B),
// upph = sum(uphResult) ÷ sum(hcActual). Menjumlahkan gap per baris bisa berbeda
// akibat pembulatan, jadi total dihitung dari total.
export const RECORD_TOTAL_SUM = {
  uphTarget: true,
  uphResult: true,
  hcStandard: true,
  hcActual: true,
  plan: true,
  outputProd: true,
  totalSetup: true,
  workingHour: true,
  totalSetupPacking: true,
  workingHourPacking: true,
} satisfies Prisma.ProductionRecordSumAggregateInputType;

export type RecordTotalSums = { [K in keyof typeof RECORD_TOTAL_SUM]: number | null };

export type RecordTotalInput = {
  date: Date;
  shift: string | null;
  sums: Partial<RecordTotalSums>;
};

export type RecordTotal = {
  date: string;
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
  gapUph: number;
  gapHc: number;
  gapOp: number;
  upph: number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Murni & testable: menerima hasil prisma groupBy by:[date, shift] (atau baris
// apa pun), menggabungkan per (date, shift), lalu menghitung derived dari total.
export function buildRecordTotals(inputs: RecordTotalInput[]): RecordTotal[] {
  const zero: RecordTotalSums = {
    uphTarget: 0,
    uphResult: 0,
    hcStandard: 0,
    hcActual: 0,
    plan: 0,
    outputProd: 0,
    totalSetup: 0,
    workingHour: 0,
    totalSetupPacking: 0,
    workingHourPacking: 0,
  };
  const fields = Object.keys(zero) as (keyof typeof zero)[];

  const byKey = new Map<string, { date: Date; shift: string | null; sums: RecordTotalSums }>();
  for (const { date, shift, sums } of inputs) {
    const key = `${date.toISOString().slice(0, 10)}|${shift ?? ""}`;
    let acc = byKey.get(key);
    if (!acc) {
      acc = { date, shift, sums: { ...zero } };
      byKey.set(key, acc);
    }
    for (const f of fields) {
      const v = sums[f];
      if (v != null && Number.isFinite(v)) acc.sums[f] = (acc.sums[f] ?? 0) + v;
    }
  }

  return [...byKey.values()]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(({ date, shift, sums }) => {
      const uphTarget = round2(sums.uphTarget ?? 0);
      const uphResult = round2(sums.uphResult ?? 0);
      const hcStandard = round2(sums.hcStandard ?? 0);
      const hcActual = round2(sums.hcActual ?? 0);
      const plan = round2(sums.plan ?? 0);
      const outputProd = round2(sums.outputProd ?? 0);
      const upph = (sums.hcActual ?? 0) === 0 ? null : round2((sums.uphResult ?? 0) / (sums.hcActual ?? 0));
      return {
        date: date.toISOString().slice(0, 10),
        shift,
        uphTarget,
        uphResult,
        hcStandard,
        hcActual,
        plan,
        outputProd,
        totalSetup: round2(sums.totalSetup ?? 0),
        workingHour: round2(sums.workingHour ?? 0),
        totalSetupPacking: round2(sums.totalSetupPacking ?? 0),
        workingHourPacking: round2(sums.workingHourPacking ?? 0),
        gapUph: round2(uphResult - uphTarget),
        gapHc: round2(hcActual - hcStandard),
        gapOp: round2(outputProd - plan),
        upph,
      };
    });
}
