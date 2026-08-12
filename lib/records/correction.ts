// Prosedur koreksi data APPROVED/LOCKED (PRD: "Data yang sudah Approved tidak
// dapat diedit tanpa prosedur Correction Workflow"). Murni & testable:
// otorisasi + validasi body + perhitungan ulang calculated.

import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";
import {
  EDITABLE_FIELDS as CORRECTABLE_FIELDS,
  parseRecordFields,
  isPlainObject,
  type RecordFieldValue,
  type RecordFields,
} from "./fields";

// Koreksi = tindakan wewenang yang membatalkan approval/lock, jadi butuh izin
// approve ATAU lock; SUPER_ADMIN bypass. Tidak menambah permission baru.
export const CORRECTION_PERMISSIONS = ["record.approve", "record.lock"] as const;

export const CORRECTION_MIN_REASON = 10;
export const CORRECTION_MAX_REASON = 500;

// Whitelist 12 kolom input Excel (alias EDITABLE_FIELDS). Calculated (gap*,
// upph), status, version dan kolom actor TIDAK dapat dikoreksi — calculated
// selalu dihitung ulang server-side.
export { CORRECTABLE_FIELDS };

export type CorrectionActor = { role: string; permissions: string[] };

export function canCorrect(actor: CorrectionActor): boolean {
  if (actor.role === RoleName.SUPER_ADMIN) return true;
  return CORRECTION_PERMISSIONS.some((p) => actor.permissions.includes(p));
}

export type CorrectionDecision =
  | { ok: true }
  | { ok: false; status: 400 | 403; message: string };

export function decideCorrection(params: {
  status: RecordStatus;
  actor: CorrectionActor;
}): CorrectionDecision {
  if (!canCorrect(params.actor)) {
    return {
      ok: false,
      status: 403,
      message:
        "Anda tidak memiliki izin untuk koreksi. Dibutuhkan izin record.approve atau record.lock.",
    };
  }
  if (params.status !== RecordStatus.APPROVED && params.status !== RecordStatus.LOCKED) {
    return {
      ok: false,
      status: 400,
      message: `Koreksi hanya dapat dilakukan pada record berstatus ${RecordStatus.APPROVED} atau ${RecordStatus.LOCKED}.`,
    };
  }
  return { ok: true };
}

export type CorrectionFieldValue = RecordFieldValue;
export type CorrectionFields = RecordFields;

export type CorrectionBodyData = {
  reason: string;
  fields?: CorrectionFields;
};

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type CorrectionBodyResult = Ok<CorrectionBodyData> | Fail;

export function parseCorrectionBody(body: unknown): CorrectionBodyResult {
  if (!isPlainObject(body)) {
    return { ok: false, message: "Body permintaan tidak valid." };
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < CORRECTION_MIN_REASON) {
    return {
      ok: false,
      message: `Alasan koreksi wajib diisi minimal ${CORRECTION_MIN_REASON} karakter.`,
    };
  }
  if (reason.length > CORRECTION_MAX_REASON) {
    return {
      ok: false,
      message: `Alasan koreksi maksimal ${CORRECTION_MAX_REASON} karakter.`,
    };
  }

  let fields: CorrectionFields | undefined;
  if (body.fields !== undefined) {
    const parsed = parseRecordFields(body.fields);
    if (!parsed.ok) return parsed;
    fields = parsed.data;
  }

  return { ok: true, data: { reason, fields } };
}
