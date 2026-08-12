import type { QualityScoreRecord } from "./qualityScore";

export const MAX_QUALITY_RECORDS = 10_000;

type Ok = { ok: true; data: QualityScoreRecord[] };
type Fail = { ok: false; message: string };
export type QualityScoreValidationResult = Ok | Fail;

export function validateQualityScoreBody(body: unknown): QualityScoreValidationResult {
  if (!Array.isArray(body)) {
    return { ok: false, message: "Body harus berupa array record." };
  }
  if (body.length > MAX_QUALITY_RECORDS) {
    return {
      ok: false,
      message: `Maksimal ${MAX_QUALITY_RECORDS.toLocaleString("id-ID")} record per permintaan.`,
    };
  }
  for (let i = 0; i < body.length; i++) {
    const record = body[i];
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      return { ok: false, message: `Record ke-${i + 1} harus berupa objek.` };
    }
  }
  return { ok: true, data: body as QualityScoreRecord[] };
}
