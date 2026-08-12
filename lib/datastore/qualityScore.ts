// Service perhitungan Skor Kualitas Data (phase 1 backend) — murni, deterministic,
// tanpa IO/UI. Memakai record data mentah produksi (ProductionRecord belum ada;
// nama field ditetapkan sebagai default dan bisa di-override via options).
//
// Keputusan yang diambil:
// - Skor 0-100 = rata-rata berbobot komponen yang TERSEDIA (bobot sama: 25% tiap).
//   Komponen null = "tidak dapat dinilai" (lihat per-komponen), tidak ikut dalam
//   rata-rata supaya skor tidak menyesatkan (mis. duplikasi tak dinilai tanpa key).
// - completeness: rata-rata proporsi field wajib terisi per record. Terisi = bukan
//   null/undefined/string kosong/NaN.
// - validity: proporsi record yang SEMUA field cek-nya terisi DAN masuk rentang.
//   Field hilang = tidak valid (nilai yang tak ada tak bisa diverifikasi; sekaligus
//   dihukum completeness). GAP (gapUph/gapHc/gapOp) TIDAK dicek — memang boleh
//   negatif. Raw input wajib >= 0, UPPH wajib > 0.
// - duplication: proporsi record unik berdasarkan duplicateKey. Record tanpa key
//   tidak dinilai (bukan dianggap unik — bisa menyembunyikan duplikat). Bila tidak
//   ada key sama sekali → null.
// - anomaly: rule statistik sederhana — nilai ekstrem vs rata-rata:
//   |value − mean| > sigma × stddev (sigma 3, standar deviasi populasi, dihitung
//   per field kunci). stddev 0 (semua nilai sama) → tidak ada anomali. Record
//   anomali bila anomali di minimal satu field kunci. Butuh ≥ 2 nilai valid per
//   field; bila tak ada field yang memenuhi → null. ponytail: sigma-rule kurang
//   sensitif di dataset kecil (< ~10 record, z-score maksimum terbatas √(n−1));
//   kalau fase 2 butuh deteksi lebih tajam, upgrade ke median absolute deviation.
//   Rule konsistensi lintas-field (mis. UPH Result 0 tapi Output Prod > 0) juga
//   ditunda ke fase 2.
// - List kosong → score null + reason (0 menyesatkan: bukan data jelek, melainkan
//   tidak ada data).
// - Nilai numerik WAJIB bertipe number (parse dilakukan layer validasi/input).

export type QualityScoreRecord = {
  duplicateKey?: string;
  [field: string]: unknown;
};

export type QualityScoreOptions = {
  requiredFields?: string[];
  nonNegativeFields?: string[];
  positiveFields?: string[];
  anomalyFields?: string[];
  anomalySigma?: number;
};

export type QualityIssueType = "incomplete" | "invalid" | "duplicate" | "anomalous";

export type QualityIssue = {
  type: QualityIssueType;
  recordIndex: number;
  detail: string;
};

export type QualityComponents = {
  completeness: number | null;
  validity: number | null;
  duplication: number | null;
  anomaly: number | null;
};

export type QualityWeights = {
  completeness: number;
  validity: number;
  duplication: number;
  anomaly: number;
};

export const QUALITY_ISSUE_TYPE_BY_COMPONENT = {
  completeness: "incomplete",
  validity: "invalid",
  duplication: "duplicate",
  anomaly: "anomalous",
} as const;

export type QualityComponentKey = keyof typeof QUALITY_ISSUE_TYPE_BY_COMPONENT;

export type QualityComponentSummary = {
  component: QualityComponentKey;
  score: number | null;
  issueCount: number;
  sampleIssues: QualityIssue[];
};

export const ISSUE_SAMPLE_LIMIT = 5;

export type QualityScoreResult = {
  score: number | null;
  reason?: string;
  totalRecords: number;
  weights: QualityWeights;
  components: QualityComponents;
  perComponent: QualityComponentSummary[];
  issueCount: number;
  issues: QualityIssue[];
};

export function summarizeQualityComponents(
  components: QualityComponents,
  issues: QualityIssue[]
): QualityComponentSummary[] {
  return (Object.keys(QUALITY_ISSUE_TYPE_BY_COMPONENT) as QualityComponentKey[]).map((component) => {
    const type = QUALITY_ISSUE_TYPE_BY_COMPONENT[component];
    const ofType = issues.filter((i) => i.type === type);
    return {
      component,
      score: components[component],
      issueCount: ofType.length,
      sampleIssues: ofType.slice(0, ISSUE_SAMPLE_LIMIT),
    };
  });
}

export const QUALITY_WEIGHTS: QualityWeights = {
  completeness: 0.25,
  validity: 0.25,
  duplication: 0.25,
  anomaly: 0.25,
};

export const DEFAULT_ANOMALY_SIGMA = 3;

// 12 field raw input produksi (ProductionRecord belum ada — ini kontrak default).
export const DEFAULT_REQUIRED_FIELDS = [
  "date",
  "model",
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
] as const;

export const DEFAULT_NON_NEGATIVE_FIELDS = [
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
] as const;

export const DEFAULT_POSITIVE_FIELDS = ["upph"] as const;

export const DEFAULT_ANOMALY_FIELDS = ["outputProd", "uphResult"] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFilled(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "number") return !Number.isNaN(v);
  return true;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function duplicateKeyOf(rec: Record<string, unknown>): string | null {
  const key = rec.duplicateKey;
  if (typeof key !== "string" || key.trim() === "") return null;
  return key.trim();
}

export function calculateQualityScore(
  records: QualityScoreRecord[],
  options: QualityScoreOptions = {}
): QualityScoreResult {
  const requiredFields = options.requiredFields ?? [...DEFAULT_REQUIRED_FIELDS];
  const nonNegativeFields = options.nonNegativeFields ?? [...DEFAULT_NON_NEGATIVE_FIELDS];
  const positiveFields = options.positiveFields ?? [...DEFAULT_POSITIVE_FIELDS];
  const anomalyFields = options.anomalyFields ?? [...DEFAULT_ANOMALY_FIELDS];
  const sigma = options.anomalySigma ?? DEFAULT_ANOMALY_SIGMA;

  const issues: QualityIssue[] = [];
  const totalRecords = records.length;

  if (totalRecords === 0) {
    const emptyComponents: QualityComponents = { completeness: null, validity: null, duplication: null, anomaly: null };
    return {
      score: null,
      reason: "Tidak ada record untuk dinilai.",
      totalRecords,
      weights: { ...QUALITY_WEIGHTS },
      components: emptyComponents,
      perComponent: summarizeQualityComponents(emptyComponents, issues),
      issueCount: 0,
      issues,
    };
  }

  const normalized = records.map((r) => (isObject(r) ? r : {}));

  // 1. Completeness
  const requiredCount = requiredFields.length;
  const completenessScores = normalized.map((rec, i) => {
    const missing = requiredFields.filter((f) => !isFilled(rec[f]));
    if (missing.length > 0) {
      issues.push({ type: "incomplete", recordIndex: i, detail: `field kosong: ${missing.join(", ")}` });
    }
    return requiredCount === 0 ? 1 : (requiredCount - missing.length) / requiredCount;
  });
  const completeness = completenessScores.reduce((a, b) => a + b, 0) / totalRecords;

  // 2. Validity — positive (mis. upph) menang atas nonNegative kalau sama-sama terdaftar.
  const rangeCheck: Record<string, "nonNegative" | "positive"> = {};
  for (const f of nonNegativeFields) rangeCheck[f] = "nonNegative";
  for (const f of positiveFields) rangeCheck[f] = "positive";

  let validCount = totalRecords;
  normalized.forEach((rec, i) => {
    const bad: string[] = [];
    for (const [field, kind] of Object.entries(rangeCheck)) {
      const v = rec[field];
      const valid = kind === "positive" ? isFiniteNumber(v) && v > 0 : isFiniteNumber(v) && v >= 0;
      if (!valid) bad.push(field);
    }
    if (bad.length > 0) {
      validCount -= 1;
      issues.push({ type: "invalid", recordIndex: i, detail: `nilai tidak valid: ${bad.join(", ")}` });
    }
  });
  const validity = validCount / totalRecords;

  // 3. Duplication
  const seen = new Set<string>();
  let duplicates = 0;
  let keyedCount = 0;
  normalized.forEach((rec, i) => {
    const key = duplicateKeyOf(rec);
    if (key === null) return;
    keyedCount += 1;
    if (seen.has(key)) {
      duplicates += 1;
      issues.push({ type: "duplicate", recordIndex: i, detail: `duplicateKey: ${key}` });
    } else {
      seen.add(key);
    }
  });
  const duplication = keyedCount === 0 ? null : (keyedCount - duplicates) / keyedCount;

  // 4. Anomaly
  const fieldStats: { field: string; mean: number; stddev: number }[] = [];
  for (const f of anomalyFields) {
    const values = normalized.map((r) => r[f]).filter(isFiniteNumber);
    if (values.length < 2) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    fieldStats.push({ field: f, mean, stddev: Math.sqrt(variance) });
  }

  let anomalousCount = 0;
  if (fieldStats.length > 0) {
    normalized.forEach((rec, i) => {
      const flaggedFields = fieldStats
        .filter(({ field, mean, stddev }) => {
          const v = rec[field];
          return isFiniteNumber(v) && stddev > 0 && Math.abs(v - mean) > sigma * stddev;
        })
        .map((s) => s.field);
      if (flaggedFields.length > 0) {
        anomalousCount += 1;
        issues.push({ type: "anomalous", recordIndex: i, detail: `nilai ekstrem: ${flaggedFields.join(", ")}` });
      }
    });
  }
  const anomaly = fieldStats.length === 0 ? null : (totalRecords - anomalousCount) / totalRecords;

  const components: QualityComponents = { completeness, validity, duplication, anomaly };

  const weightedKeys = (["completeness", "validity", "duplication", "anomaly"] as const).filter(
    (k) => components[k] !== null
  );
  const weights = { ...QUALITY_WEIGHTS };
  const totalWeight = weightedKeys.reduce((s, k) => s + weights[k], 0);
  const weightedSum = weightedKeys.reduce((s, k) => s + (components[k] as number) * weights[k], 0);
  const score = Math.round((weightedSum / totalWeight) * 1000) / 10;

  return {
    score,
    totalRecords,
    weights,
    components,
    perComponent: summarizeQualityComponents(components, issues),
    issueCount: issues.length,
    issues,
  };
}
