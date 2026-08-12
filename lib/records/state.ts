// State ringan data produksi frontend (TASK buat-state-management-data-produksi)
// — tanpa pustaka eksternal (no zustand/redux): store kecil pola
// subscribe/getSet dengan fungsi dispatch, murni & testable di node:test.
//
// Arsitektur (keputusan):
//  - Store memegang DAFTAR RECORD TERSIMPAN (localStorage eps_mock_records)
//    saja; seed (mockProductionRecords) tetap digabung di layer tampilan —
//    satu sumber kebenaran untuk data yang BISA berubah (form/quick-entry).
//  - Setiap mutasi (add/update/remove/setRecords) langsung mem-persist &
//    men-notify subscriber → tabel, total row, dan KPI refresh otomatis.
//  - Formula calculated (gap*/upph) dihitung ulang via calculateCalculated
//    saat field kalkulasi diubah (reuse mesin 1:1 Excel) — tidak pernah
//    di-hardcode.
//  - dbRecord (backend Prisma) menggantikan storage mock di fase backend nanti;
//    shape store tidak berubah.

import { calculateCalculated } from "./calculate";
import { CALC_INPUT_FIELDS, NUMERIC_FIELDS } from "./fields";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { RECORDS_STORAGE_KEY, loadSavedRecords, saveSavedRecords } from "@/lib/mocks/records";

export type RecordsListener = () => void;

export type RecordsStore = {
  /** Daftar record tersimpan (tanpa seed). */
  getRecords: () => MockProductionRecord[];
  /** Subscribe perubahan; return unsubscribe. */
  subscribe: (listener: RecordsListener) => () => void;
  /** Ganti seluruh daftar tersimpan (mis. onSaved form) + persist. */
  setRecords: (records: MockProductionRecord[]) => void;
  /** Tambah record baru (di depan); id kembar → replace. */
  add: (record: MockProductionRecord) => void;
  /** Hapus record by id. */
  remove: (id: string) => void;
  /** Patch record by id; calculated dihitung ulang bila field kalkulasi berubah. */
  update: (id: string, patch: Record<string, unknown>) => void;
  /** Tulis ulang ke storage (dipanggil otomatis tiap mutasi; idempoten). */
  persist: () => void;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

// ---------- reducers murni (unit-testable) ----------

export function addRecord(list: MockProductionRecord[], record: MockProductionRecord): MockProductionRecord[] {
  return [record, ...list.filter((r) => r.id !== record.id)];
}

export function removeRecordById(list: MockProductionRecord[], id: string): MockProductionRecord[] {
  return list.filter((r) => r.id !== id);
}

// Sanitasi patch numeric: terima number/string non-negatif berhingga; selain itu
// pertahankan nilai lama (tidak pernah menyimpan NaN/Infinity/negatif).
function sanitizeNumeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  return null;
}

export function applyRecordPatch(
  list: MockProductionRecord[],
  id: string,
  patch: Record<string, unknown>
): MockProductionRecord[] {
  return list.map((r) => {
    if (r.id !== id) return r;
    const next: MockProductionRecord = { ...r };
    for (const [key, value] of Object.entries(patch)) {
      if ((NUMERIC_FIELDS as readonly string[]).includes(key)) {
        const n = sanitizeNumeric(value);
        if (n !== null) next[key as keyof MockProductionRecord] = n as never;
      } else if (key === "model" || key === "date") {
        if (typeof value === "string") next[key] = value.trim();
      } else if (key === "shift") {
        if (value === null || typeof value === "string") next.shift = typeof value === "string" ? value.trim() || null : null;
      } else if (key === "area") {
        next.area = value === null || (typeof value === "object" && value !== null) ? (value as MockProductionRecord["area"]) : r.area;
      }
    }
    const hasCalcInput = CALC_INPUT_FIELDS.some((f) => patch[f] !== undefined);
    if (hasCalcInput) {
      const calc = calculateCalculated({
        uphTarget: next.uphTarget,
        uphResult: next.uphResult,
        hcStandard: next.hcStandard,
        hcActual: next.hcActual,
        plan: next.plan,
        outputProd: next.outputProd,
      });
      next.gapUph = calc.gapUph;
      next.gapHc = calc.gapHc;
      next.gapOp = calc.gapOp;
      next.upph = calc.upph;
    }
    return next;
  });
}

// ---------- store factory ----------

export function createRecordsStore(opts: { storage?: StorageLike | null } = {}): RecordsStore {
  const storage = opts.storage ?? null;
  let records: MockProductionRecord[] = storage ? loadSavedRecords(storage) : [];
  const listeners = new Set<RecordsListener>();

  const emit = () => {
    for (const fn of [...listeners]) fn();
  };

  const commit = (next: MockProductionRecord[]) => {
    records = next;
    persist();
    emit();
  };

  const persist = () => {
    if (storage) saveSavedRecords(storage, records);
  };

  return {
    getRecords: () => records,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setRecords: (next) => commit(next),
    add: (record) => commit(addRecord(records, record)),
    remove: (id) => commit(removeRecordById(records, id)),
    update: (id, patch) => commit(applyRecordPatch(records, id, patch)),
    persist,
  };
}

// Nama storage dipakai ulang di test supaya key konsisten.
export { RECORDS_STORAGE_KEY };