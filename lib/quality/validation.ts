// Validasi body QualityCheck (create/update) & transisi status — murni &
// testable, mengembalikan pesan error pertama (Bahasa Indonesia) atau null.
// Pola tanggal ketat YYYY-MM-DD dengan round-trip (sama seperti
// lib/records/fields.ts) untuk menolak parse lenient JS (new Date("2026-02-30")
// di V8 roll ke 2026-03-02). Semua angka qty: bilangan bulat finite >= 0
// maksimal 1e9. Update memvalidasi HANYA field yang disediakan.

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const MAX_QTY = 1e9;
const MAX_DEFECTS = 50;

const QTY_FIELDS = ["inspectedQty", "passedQty", "failedQty", "defectCount"] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkDate(v: unknown): string | null {
  if (typeof v !== "string" || !DATE_ONLY_RE.test(v)) {
    return "Field date tidak valid (format YYYY-MM-DD).";
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    return "Field date tidak valid.";
  }
  return null;
}

function checkQty(v: unknown, label: string): string | null {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_QTY) {
    return `Field ${label} harus berupa bilangan bulat non-negatif maksimal ${MAX_QTY}.`;
  }
  return null;
}

function checkDefects(v: unknown): string | null {
  if (!Array.isArray(v)) {
    return "defects harus berupa array.";
  }
  if (v.length > MAX_DEFECTS) {
    return `defects maksimal ${MAX_DEFECTS} item.`;
  }
  for (let i = 0; i < v.length; i++) {
    const d = v[i];
    const at = `defects[${i}]`;
    if (!isPlainObject(d)) {
      return `${at} harus berupa objek.`;
    }
    if (typeof d.defectCode !== "string" || d.defectCode.trim() === "") {
      return `${at}.defectCode wajib diisi.`;
    }
    if (d.defectCode.length > 50) {
      return `${at}.defectCode maksimal 50 karakter.`;
    }
    if (typeof d.defectName !== "string" || d.defectName.trim() === "") {
      return `${at}.defectName wajib diisi.`;
    }
    if (d.defectName.length > 100) {
      return `${at}.defectName maksimal 100 karakter.`;
    }
    if (typeof d.quantity !== "number" || !Number.isInteger(d.quantity) || d.quantity < 1) {
      return `${at}.quantity harus berupa bilangan bulat minimal 1.`;
    }
  }
  return null;
}

function validateBody(body: unknown, requireCore: boolean): string | null {
  if (!isPlainObject(body)) {
    return "Body harus berupa objek.";
  }

  if (requireCore) {
    if (body.date === undefined) return "Field date wajib diisi.";
    if (body.model === undefined) return "Field model wajib diisi.";
  }

  if (body.date !== undefined) {
    const e = checkDate(body.date);
    if (e) return e;
  }

  if (body.model !== undefined) {
    if (typeof body.model !== "string") return "Field model harus berupa teks.";
    const model = body.model.trim();
    if (model === "") return "Field model wajib diisi.";
    if (model.length > 100) return "Field model maksimal 100 karakter.";
  }

  if (body.shift !== undefined) {
    if (typeof body.shift !== "string") return "Field shift harus berupa teks.";
    if (body.shift.length > 20) return "Field shift maksimal 20 karakter.";
  }

  if (body.areaId !== undefined) {
    if (typeof body.areaId !== "string" || !UUID_RE.test(body.areaId)) {
      return "Field areaId harus berupa UUID.";
    }
  }

  for (const f of QTY_FIELDS) {
    if (body[f] !== undefined) {
      const e = checkQty(body[f], f);
      if (e) return e;
    }
  }

  if (body.inspectedQty !== undefined && (body.passedQty !== undefined || body.failedQty !== undefined)) {
    const passed = typeof body.passedQty === "number" ? body.passedQty : 0;
    const failed = typeof body.failedQty === "number" ? body.failedQty : 0;
    if (passed + failed > (body.inspectedQty as number)) {
      return "passedQty + failedQty tidak boleh melebihi inspectedQty.";
    }
  }

  if (body.defects !== undefined) {
    const e = checkDefects(body.defects);
    if (e) return e;
  }

  return null;
}

export function validateQualityCheckCreate(body: unknown): string | null {
  return validateBody(body, true);
}

export function validateQualityCheckUpdate(body: unknown): string | null {
  return validateBody(body, false);
}

const NEXT_STATUS: Record<string, string> = {
  DRAFT: "SUBMITTED",
  SUBMITTED: "APPROVED",
  APPROVED: "LOCKED",
};

export function validateStatusTransition(current: string, next: string): string | null {
  if (current === "LOCKED") {
    return "Status LOCKED tidak dapat diubah.";
  }
  if (NEXT_STATUS[current] === undefined) {
    return `Status awal tidak dikenal: ${current}.`;
  }
  if (NEXT_STATUS[current] !== next) {
    return `Transisi status tidak valid: ${current} -> ${next}.`;
  }
  return null;
}
