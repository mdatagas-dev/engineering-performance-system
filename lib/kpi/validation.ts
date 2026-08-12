export type KpiCreateData = {
  key: string;
  name: string;
  formula: string;
  unit: string;
  decimals: number;
  target: number;
  higherIsBetter: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  definition: string | null;
  sourceData: string | null;
  isActive: boolean;
};

export type KpiUpdateData = Partial<Omit<KpiCreateData, "key">>;

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type KpiCreateResult = Ok<KpiCreateData> | Fail;
export type KpiUpdateResult = Ok<KpiUpdateData> | Fail;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function ok<T>(value: T): Ok<T> {
  return { ok: true, data: value };
}

function fail(message: string): Fail {
  return { ok: false, message };
}

function requiredString(
  v: unknown,
  label: string
): { ok: true; data: string } | Fail {
  if (typeof v !== "string" || v.trim() === "") return fail(`${label} wajib diisi.`);
  return ok(v.trim());
}

export const FORMULA_MAX_LENGTH = 500;

const DANGEROUS_FORMULA_KEYWORDS = [
  "drop",
  "delete",
  "truncate",
  "alter",
  "create",
  "insert",
  "update",
] as const;

function validateFormula(v: unknown): { ok: true; data: string } | Fail {
  const base = requiredString(v, "Formula");
  if (!base.ok) return base;
  const formula = base.data;
  if (formula.length > FORMULA_MAX_LENGTH) {
    return fail(`Formula maksimal ${FORMULA_MAX_LENGTH} karakter.`);
  }
  const lower = formula.toLowerCase();
  for (const keyword of DANGEROUS_FORMULA_KEYWORDS) {
    if (lower.includes(`${keyword} `) || lower === keyword) {
      return fail("Formula mengandung token yang tidak diizinkan.");
    }
  }
  for (const mark of [";", "--"]) {
    if (formula.includes(mark)) {
      return fail("Formula mengandung token yang tidak diizinkan.");
    }
  }
  return ok(formula);
}

function parseDecimals(
  v: unknown,
  fallback: number
): { ok: true; data: number } | Fail {
  if (v === undefined) return ok(fallback);
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 6) {
    return fail("Jumlah desimal harus bilangan bulat antara 0 dan 6.");
  }
  return ok(v);
}

function parseTarget(
  v: unknown,
  required: boolean
): { ok: true; data: number | undefined } | Fail {
  if (!required && v === undefined) return ok(undefined);
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return fail("Target harus berupa angka.");
  }
  return ok(v);
}

function parseThreshold(
  v: unknown,
  label: string
): { ok: true; data: number | null | undefined } | Fail {
  if (v === undefined || v === null) return ok(v);
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return fail(`${label} harus berupa angka.`);
  }
  return ok(v);
}

function parseOptionalString(
  v: unknown,
  label: string
): { ok: true; data: string | null | undefined } | Fail {
  if (v === undefined || v === null) return ok(v);
  if (typeof v !== "string") return fail(`${label} harus berupa teks.`);
  return ok(v);
}

export type ThresholdState = {
  target: number;
  higherIsBetter: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
};

function validateThresholdOrder(s: ThresholdState): { ok: true } | Fail {
  const { target, higherIsBetter, warningThreshold: warning, criticalThreshold: critical } = s;
  const above = higherIsBetter
    ? (a: number, b: number) => a > b
    : (a: number, b: number) => a < b;
  const op = higherIsBetter ? "≤" : "≥";

  if (warning !== null && above(warning, target)) {
    return fail(`Ambang peringatan harus ${op} target.`);
  }
  if (critical !== null) {
    if (warning !== null && above(critical, warning)) {
      return fail(`Ambang kritis harus ${op} ambang peringatan.`);
    }
    if (warning === null && above(critical, target)) {
      return fail(`Ambang kritis harus ${op} target.`);
    }
  }
  return { ok: true };
}

export async function validateKpiCreate(
  body: unknown,
  isKeyTaken: (key: string) => Promise<boolean>
): Promise<KpiCreateResult> {
  if (!isRecord(body)) return fail("Body permintaan tidak valid.");

  const key = requiredString(body.key, "Kunci KPI");
  if (!key.ok) return key;
  const name = requiredString(body.name, "Nama KPI");
  if (!name.ok) return name;
  const formula = validateFormula(body.formula);
  if (!formula.ok) return formula;
  const unit = requiredString(body.unit, "Satuan");
  if (!unit.ok) return unit;
  const decimals = parseDecimals(body.decimals, 2);
  if (!decimals.ok) return decimals;
  const target = parseTarget(body.target, true);
  if (!target.ok) return target;
  const warning = parseThreshold(body.warningThreshold, "Ambang peringatan");
  if (!warning.ok) return warning;
  const critical = parseThreshold(body.criticalThreshold, "Ambang kritis");
  if (!critical.ok) return critical;
  const definition = parseOptionalString(body.definition, "Definisi");
  if (!definition.ok) return definition;
  const sourceData = parseOptionalString(body.sourceData, "Sumber data");
  if (!sourceData.ok) return sourceData;
  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    return fail("Status aktif harus berupa boolean.");
  }
  if (body.higherIsBetter !== undefined && typeof body.higherIsBetter !== "boolean") {
    return fail("Arah KPI harus berupa boolean.");
  }

  const order = validateThresholdOrder({
    target: target.data as number,
    higherIsBetter: body.higherIsBetter ?? true,
    warningThreshold: warning.data ?? null,
    criticalThreshold: critical.data ?? null,
  });
  if (!order.ok) return order;

  if (await isKeyTaken(key.data)) {
    return fail("Kunci KPI sudah digunakan.");
  }

  return ok({
    key: key.data,
    name: name.data,
    formula: formula.data,
    unit: unit.data,
    decimals: decimals.data,
    target: target.data as number,
    higherIsBetter: body.higherIsBetter ?? true,
    warningThreshold: warning.data ?? null,
    criticalThreshold: critical.data ?? null,
    definition: definition.data ?? null,
    sourceData: sourceData.data ?? null,
    isActive: body.isActive ?? true,
  });
}

export async function validateKpiUpdate(
  body: unknown,
  existing: ThresholdState
): Promise<KpiUpdateResult> {
  if (!isRecord(body)) return fail("Body permintaan tidak valid.");
  if (body.key !== undefined) return fail("Kunci KPI tidak dapat diubah.");

  const data: KpiUpdateData = {};

  if (body.name !== undefined) {
    const r = requiredString(body.name, "Nama KPI");
    if (!r.ok) return r;
    data.name = r.data;
  }
  if (body.formula !== undefined) {
    const r = validateFormula(body.formula);
    if (!r.ok) return r;
    data.formula = r.data;
  }
  if (body.unit !== undefined) {
    const r = requiredString(body.unit, "Satuan");
    if (!r.ok) return r;
    data.unit = r.data;
  }
  if (body.decimals !== undefined) {
    const r = parseDecimals(body.decimals, 2);
    if (!r.ok) return r;
    data.decimals = r.data;
  }
  if (body.target !== undefined) {
    const r = parseTarget(body.target, false);
    if (!r.ok) return r;
    data.target = r.data as number;
  }
  if (body.higherIsBetter !== undefined) {
    if (typeof body.higherIsBetter !== "boolean") {
      return fail("Arah KPI harus berupa boolean.");
    }
    data.higherIsBetter = body.higherIsBetter;
  }
  if (body.warningThreshold !== undefined) {
    const r = parseThreshold(body.warningThreshold, "Ambang peringatan");
    if (!r.ok) return r;
    data.warningThreshold = r.data ?? null;
  }
  if (body.criticalThreshold !== undefined) {
    const r = parseThreshold(body.criticalThreshold, "Ambang kritis");
    if (!r.ok) return r;
    data.criticalThreshold = r.data ?? null;
  }
  if (body.definition !== undefined) {
    const r = parseOptionalString(body.definition, "Definisi");
    if (!r.ok) return r;
    data.definition = r.data ?? null;
  }
  if (body.sourceData !== undefined) {
    const r = parseOptionalString(body.sourceData, "Sumber data");
    if (!r.ok) return r;
    data.sourceData = r.data ?? null;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return fail("Status aktif harus berupa boolean.");
    }
    data.isActive = body.isActive;
  }

  const order = validateThresholdOrder({
    target: data.target ?? existing.target,
    higherIsBetter: data.higherIsBetter ?? existing.higherIsBetter,
    warningThreshold:
      data.warningThreshold !== undefined ? data.warningThreshold : existing.warningThreshold,
    criticalThreshold:
      data.criticalThreshold !== undefined ? data.criticalThreshold : existing.criticalThreshold,
  });
  if (!order.ok) return order;

  return ok(data);
}

export function buildSoftDelete(
  actorId: string,
  now: Date = new Date()
): { isDeleted: true; deletedAt: Date; deletedBy: string } {
  return { isDeleted: true, deletedAt: now, deletedBy: actorId };
}
