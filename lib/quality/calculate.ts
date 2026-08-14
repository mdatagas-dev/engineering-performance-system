// Mesin perhitungan KPI kualitas (Quality Inspection) — murni & testable,
// tanpa IO. Semua persen = (nilai / inspected) * 100, dibulatkan 2 desimal
// (round2, half-up pada skala-100). inspectedQty <= 0 diperlakukan sebagai
// pembagian nol -> semua persen 0 (bukan null/NaN). Tidak ada clamping nilai
// negatif: validasi (validation.ts) sudah memaksa input >= 0.

export type QualityMetricsInput = {
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectCount: number;
};

export type QualityMetrics = {
  yieldPct: number;
  passRatePct: number;
  rejectRatePct: number;
  defectRatePct: number;
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateQualityMetrics(input: QualityMetricsInput): QualityMetrics {
  const { inspectedQty, passedQty, failedQty, defectCount } = input;
  if (inspectedQty <= 0) {
    return { yieldPct: 0, passRatePct: 0, rejectRatePct: 0, defectRatePct: 0 };
  }
  const pct = (n: number): number => round2((n / inspectedQty) * 100);
  return {
    yieldPct: pct(passedQty),
    passRatePct: pct(passedQty),
    rejectRatePct: pct(failedQty),
    defectRatePct: pct(defectCount),
  };
}
