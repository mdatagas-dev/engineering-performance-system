// Formula calculated field ProductionRecord — murni & testable 1:1 Excel/PRD:
// GAP UPH = UPH Result − UPH Target, GAP HC = HC Actual − HC Standard,
// GAP OP = Output Prod − Plan, UPPH = UPH Result ÷ HC Actual.
// Pembulatan 2 desimal; guard pembagian nol (HC Actual = 0) → null.

import { CALC_INPUT_FIELDS } from "./fields";

export type RecordCalcInput = {
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
};

export type CalculatedFields = {
  gapUph: number;
  gapHc: number;
  gapOp: number;
  upph: number | null;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateCalculated(input: RecordCalcInput): CalculatedFields {
  const gapUph = round2(input.uphResult - input.uphTarget);
  const gapHc = round2(input.hcActual - input.hcStandard);
  const gapOp = round2(input.outputProd - input.plan);
  const upph = input.hcActual === 0 ? null : round2(input.uphResult / input.hcActual);
  return { gapUph, gapHc, gapOp, upph };
}

// Hitung ulang calculated bila ada input perhitungan yang diubah; null kalau
// hanya field non-perhitungan (totalSetup, model, shift, ...) yang berubah.
export function recomputeCalculated(
  current: RecordCalcInput,
  fields: Record<string, unknown>
): CalculatedFields | null {
  const hasCalcInput = CALC_INPUT_FIELDS.some((f) => fields[f] !== undefined);
  if (!hasCalcInput) return null;
  const merged: RecordCalcInput = { ...current };
  for (const f of CALC_INPUT_FIELDS) {
    const v = fields[f];
    if (typeof v === "number") merged[f] = v;
  }
  return calculateCalculated(merged);
}
