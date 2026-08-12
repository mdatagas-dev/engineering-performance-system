// Edit data record DRAFT (PRD: "Data yang sudah Approved tidak dapat diedit
// tanpa prosedur Correction Workflow"). Dipakai PATCH /api/records/[id] setelah
// guard assertEditable/assertManageable lolos. Murni & testable.

import { isPlainObject, parseRecordFields, type RecordFields } from "./fields";
import { recomputeCalculated, type RecordCalcInput } from "./calculate";

export const EDIT_MAX_REASON = 500;

export type EditBodyData = {
  reason?: string;
  fields: RecordFields;
};

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type EditBodyResult = Ok<EditBodyData> | Fail;

export function parseEditBody(body: unknown): EditBodyResult {
  if (!isPlainObject(body)) {
    return { ok: false, message: "Body permintaan tidak valid." };
  }
  if (!isPlainObject(body.fields)) {
    return { ok: false, message: "fields wajib berupa objek." };
  }
  const fields = parseRecordFields(body.fields);
  if (!fields.ok) return fields;
  if (Object.keys(fields.data).length === 0) {
    return { ok: false, message: "Tidak ada field yang dapat diubah." };
  }

  let reason: string | undefined;
  if (body.reason !== undefined) {
    if (typeof body.reason !== "string") {
      return { ok: false, message: "reason harus berupa teks." };
    }
    reason = body.reason.trim();
    if (reason.length > EDIT_MAX_REASON) {
      return { ok: false, message: `Alasan maksimal ${EDIT_MAX_REASON} karakter.` };
    }
  }

  return { ok: true, data: { reason: reason || undefined, fields: fields.data } };
}

// Updates gabungan + snapshot after (untuk audit). Calculated dihitung ulang
// server-side via lib/records/calculate.ts, tidak pernah dari client.
export function buildEditUpdate(
  current: RecordCalcInput,
  fields: RecordFields
): { updates: Record<string, unknown>; after: Record<string, unknown> } {
  const updates: Record<string, unknown> = { ...fields };
  const calculated = recomputeCalculated(current, fields);
  if (calculated) {
    // ponytail: PRD mau upph null saat HC Actual = 0, tapi kolom schema NOT
    // NULL. Null disimpan 0 dulu; migrasi nullable saat ada akses DB.
    Object.assign(updates, {
      gapUph: calculated.gapUph,
      gapHc: calculated.gapHc,
      gapOp: calculated.gapOp,
      upph: calculated.upph ?? 0,
    });
  }
  return { updates, after: { ...current, ...updates } };
}
