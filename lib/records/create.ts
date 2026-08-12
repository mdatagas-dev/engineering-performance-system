// Create ProductionRecord baru (POST /api/records) — murni & testable tanpa DB.
// Payload = 12 raw input (date, model, shift, 10 numerik) + meta areaId, flat.
// Calculated TIDAK pernah diterima dari client: dihitung ulang di sini via
// mesin kalkulasi (calculateCalculated), status = DRAFT, version = 1,
// createdBy dari sesi. Duplikat date+model+shift+areaId ditolak 409 (sama
// dengan constrain unique DB — NULL shift/areaId dianggap distinct oleh
// Postgres, jadi duplikat hanya mungkin saat keduanya terisi).

import { RecordStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { isPlainObject, parseRecordFields, type RecordFields } from "./fields";
import { calculateCalculated } from "./calculate";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Semua kolom wajib: 13 field whitelist kecuali shift (opsional/nullable).
const REQUIRED_FIELDS = [
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

export type CreateBodyData = {
  date: Date;
  model: string;
  shift: string | null;
  areaId: string | null;
  fields: RecordFields;
};

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type CreateBodyResult = Ok<CreateBodyData> | Fail;

export function parseCreateBody(body: unknown): CreateBodyResult {
  if (!isPlainObject(body)) {
    return { ok: false, message: "Body permintaan tidak valid." };
  }

  const { areaId, ...rest } = body as Record<string, unknown>;
  if (areaId !== undefined && areaId !== null) {
    if (typeof areaId !== "string" || !UUID_RE.test(areaId)) {
      return { ok: false, message: "areaId tidak valid." };
    }
  }

  const parsed = parseRecordFields(rest);
  if (!parsed.ok) return parsed;
  const fields = parsed.data;

  for (const field of REQUIRED_FIELDS) {
    if (fields[field] === undefined) {
      return { ok: false, message: `Field ${field} wajib diisi.` };
    }
  }

  return {
    ok: true,
    data: {
      date: fields.date as Date,
      model: fields.model as string,
      shift: (fields.shift as string | null) ?? null,
      areaId: (areaId as string | null) ?? null,
      fields,
    },
  };
}

// Prisma create input lengkap: raw + calculated + status DRAFT + version 1 +
// createdBy connect. Calculated disimpan (bukan view), dihitung ulang di
// setiap mutasi — konsisten dengan edit.ts/correction.ts. Ponytail: upph null
// (HC Actual = 0) disimpan 0 dulu selama kolom schema masih NOT NULL.
export function buildCreateData(
  payload: CreateBodyData,
  actorSub: string
): Prisma.ProductionRecordCreateInput {
  const { fields } = payload;
  const calculated = calculateCalculated({
    uphTarget: fields.uphTarget as number,
    uphResult: fields.uphResult as number,
    hcStandard: fields.hcStandard as number,
    hcActual: fields.hcActual as number,
    plan: fields.plan as number,
    outputProd: fields.outputProd as number,
  });

  return {
    date: payload.date,
    model: payload.model,
    shift: payload.shift,
    area: payload.areaId ? { connect: { id: payload.areaId } } : undefined,
    uphTarget: fields.uphTarget as number,
    uphResult: fields.uphResult as number,
    hcStandard: fields.hcStandard as number,
    hcActual: fields.hcActual as number,
    plan: fields.plan as number,
    outputProd: fields.outputProd as number,
    totalSetup: fields.totalSetup as number,
    workingHour: fields.workingHour as number,
    totalSetupPacking: fields.totalSetupPacking as number,
    workingHourPacking: fields.workingHourPacking as number,
    gapUph: calculated.gapUph,
    gapHc: calculated.gapHc,
    gapOp: calculated.gapOp,
    upph: calculated.upph ?? 0,
    status: RecordStatus.DRAFT,
    createdByUser: { connect: { id: actorSub } },
    version: 1,
  };
}

// Snapshot state data (shape sama dgn backfill.ts) untuk AuditLog RECORD_CREATED
// + ProductionRecordVersion action CREATED pada versi 1.
export function buildCreateSnapshot(
  payload: CreateBodyData
): Prisma.InputJsonValue {
  const { fields } = payload;
  const calculated = calculateCalculated({
    uphTarget: fields.uphTarget as number,
    uphResult: fields.uphResult as number,
    hcStandard: fields.hcStandard as number,
    hcActual: fields.hcActual as number,
    plan: fields.plan as number,
    outputProd: fields.outputProd as number,
  });
  return {
    date: payload.date.toISOString(),
    model: payload.model,
    shift: payload.shift,
    areaId: payload.areaId,
    uphTarget: fields.uphTarget,
    uphResult: fields.uphResult,
    hcStandard: fields.hcStandard,
    hcActual: fields.hcActual,
    plan: fields.plan,
    outputProd: fields.outputProd,
    totalSetup: fields.totalSetup,
    workingHour: fields.workingHour,
    totalSetupPacking: fields.totalSetupPacking,
    workingHourPacking: fields.workingHourPacking,
    gapUph: calculated.gapUph,
    gapHc: calculated.gapHc,
    gapOp: calculated.gapOp,
    upph: calculated.upph ?? 0,
    status: RecordStatus.DRAFT,
    version: 1,
  };
}

// Pre-check duplikat 1:1 dengan constrain unique DB. Postgres memperlakukan
// NULL sebagai distinct, jadi konflik unik hanya mungkin saat shift DAN areaId
// keduanya terisi — kalau salah satu null, tidak ada kandidat duplikat.
export function findDuplicateKey(
  date: Date,
  model: string,
  shift: string | null,
  areaId: string | null
): Prisma.ProductionRecordWhereInput | null {
  if (shift === null || areaId === null) return null;
  return { date, model, shift, areaId };
}

export const DUPLICATE_MESSAGE =
  "Rekam duplikat untuk tanggal, model, shift, dan area yang sama sudah ada. Muat ulang data atau gunakan record yang ada.";

// Deteksi kesalahan unik/fk Prisma tanpa import runtime class (duck-type):
// kode error Prisma stabil — P2002 = unique violation, P2003 = FK violation.
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2002"
  );
}

export function isForeignKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "P2003"
  );
}