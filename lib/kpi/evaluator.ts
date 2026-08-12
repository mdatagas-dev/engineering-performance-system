// Service murni evaluasi ambang batas KPI — deterministic, tanpa IO/UI.
// Keputusan boundary: perbandingan STRICT. Nilai persis sama dengan ambang
// dianggap BELUM melampaui (value < critical → CRITICAL; value == critical → WARNING).
// Keputusan threshold null: level yang tidak bisa dinilai dilewati.
//   - critical null → tidak pernah CRITICAL.
//   - warning null tapi critical terisi → lompat langsung bandingkan critical
//     (WARNING tidak pernah terpicu, tapi nilai yang menembus critical tetap CRITICAL).
// Keputusan NaN/Infinity pada value: status "ERROR" (bukan crash, bukan OK diam-diam)
// supaya pemanggil bisa melewatkan pembuatan alert — data invalid jangan dihitung OK.
// Threshold diasumsikan finite (dijamin validateThresholdOrder/parseThreshold).

export type KpiEvaluationStatus = "OK" | "WARNING" | "CRITICAL" | "ERROR";

export type KpiEvaluationInput = {
  key?: string;
  value: number;
  target: number;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  higherIsBetter: boolean;
};

export type KpiEvaluationResult = {
  status: KpiEvaluationStatus;
  value: number;
  threshold?: number;
  reason?: string;
};

function beyond(value: number, threshold: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? value < threshold : value > threshold;
}

function levelLabel(status: "WARNING" | "CRITICAL"): string {
  return status === "CRITICAL" ? "ambang kritis" : "ambang peringatan";
}

function directionLabel(higherIsBetter: boolean): string {
  return higherIsBetter ? "di bawah" : "di atas";
}

export function evaluateKpiValue(input: KpiEvaluationInput): KpiEvaluationResult {
  const { key, value, target, warningThreshold, criticalThreshold, higherIsBetter } = input;
  const label = key ? `${key}: ` : "";

  if (!Number.isFinite(value)) {
    return { status: "ERROR", value, reason: `${label}Nilai KPI tidak valid (${value}).` };
  }

  const crossed = (t: number | null) => t !== null && beyond(value, t, higherIsBetter);

  if (crossed(criticalThreshold)) {
    return {
      status: "CRITICAL",
      value,
      threshold: criticalThreshold as number,
      reason: `${label}Nilai ${value} ${directionLabel(higherIsBetter)} ${levelLabel("CRITICAL")} ${criticalThreshold}. Target ${target}.`,
    };
  }
  if (crossed(warningThreshold)) {
    return {
      status: "WARNING",
      value,
      threshold: warningThreshold as number,
      reason: `${label}Nilai ${value} ${directionLabel(higherIsBetter)} ${levelLabel("WARNING")} ${warningThreshold}. Target ${target}.`,
    };
  }
  return { status: "OK", value };
}

export type KpiAlertNotificationData = {
  type: "KPI_ALERT";
  title: string;
  message: string;
  severity: "WARNING" | "CRITICAL";
  link?: string;
  recipientId: string;
};

export type KpiAlertMeta = {
  recipientId: string;
  link?: string;
};

export type KpiAlertSource = {
  name: string;
  unit: string | null;
  decimals: number;
  higherIsBetter: boolean;
};

function formatValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(value);
}

// Hasilkan data Notification siap insert (type KPI_ALERT) dari hasil evaluasi.
// Murni: tidak insert DB. Mengembalikan null untuk OK/ERROR (tidak ada alert).
// Dedup (hindari spam alert berulang) ditangani task berikutnya.
export function createKpiAlertNotification(
  kpi: KpiAlertSource,
  result: KpiEvaluationResult,
  meta: KpiAlertMeta
): KpiAlertNotificationData | null {
  if (result.status !== "WARNING" && result.status !== "CRITICAL") return null;
  if (result.threshold === undefined) return null;

  const unit = kpi.unit ? `${kpi.unit}` : "";
  const level = levelLabel(result.status);
  const op = kpi.higherIsBetter ? "<" : ">";
  const message =
    `${kpi.name} ${directionLabel(kpi.higherIsBetter)} ${level}: ` +
    `${formatValue(result.value, kpi.decimals)}${unit} ${op} ${formatValue(result.threshold, kpi.decimals)}${unit}`;
  const title = `${kpi.name}: ${result.status === "CRITICAL" ? "Ambang Kritis" : "Ambang Peringatan"}`;

  return {
    type: "KPI_ALERT",
    title,
    message,
    severity: result.status,
    ...(meta.link ? { link: meta.link } : {}),
    recipientId: meta.recipientId,
  };
}
