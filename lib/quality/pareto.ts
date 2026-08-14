// Pareto chart (diagram pareto / ABC) defek kualitas — murni & testable.
// Dikelompokkan per defectCode (nama diambil dari entri pertama), diurutkan
// dari jumlah terbesar, persen terhadap total kumulatif. cumulativePct =
// akumulasi percentPct (yang sudah round2) per baris, dibulatkan 2 desimal.

import { round2 } from "./calculate";

export type ParetoInput = {
  defectCode: string;
  defectName: string;
  quantity: number;
};

export type ParetoRow = {
  rank: number;
  defectCode: string;
  defectName: string;
  quantity: number;
  percentPct: number;
  cumulativePct: number;
};

export function buildPareto(items: ParetoInput[]): ParetoRow[] {
  if (items.length === 0) return [];

  const groups = new Map<string, { defectCode: string; defectName: string; quantity: number }>();
  for (const item of items) {
    const g = groups.get(item.defectCode);
    if (g) {
      g.quantity += item.quantity;
    } else {
      groups.set(item.defectCode, {
        defectCode: item.defectCode,
        defectName: item.defectName,
        quantity: item.quantity,
      });
    }
  }

  const sorted = [...groups.values()].sort((a, b) => b.quantity - a.quantity);
  const total = sorted.reduce((sum, g) => sum + g.quantity, 0);

  let running = 0;
  return sorted.map((g, i) => {
    const percentPct = total === 0 ? 0 : round2((g.quantity / total) * 100);
    running += percentPct;
    return {
      rank: i + 1,
      defectCode: g.defectCode,
      defectName: g.defectName,
      quantity: g.quantity,
      percentPct,
      cumulativePct: round2(running),
    };
  });
}
