// Riwayat impor: localStorage (eps_mock_imports), pola sama dgn
// lib/mocks/records.ts (load/save + StorageLike). Saat kosong di-seed 3
// riwayat tiruan (lib/imports/mock-history.ts) sehingga panel selalu terisi.

import { mockImportHistory } from "./mock-history";

export const IMPORT_HISTORY_KEY = "eps_mock_imports";
export const IMPORT_HISTORY_LIMIT = 20;

export type ImportStatus = "success" | "partial" | "failed";
export type ImportHistoryEntry = {
  id: string;
  fileName: string;
  rowsImported: number;
  rowsSkipped: number;
  /** ISO — momen impor selesai. */
  importedAt: string;
  importedBy: string;
  status: ImportStatus;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadImportHistory(storage: StorageLike | null | undefined): ImportHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(IMPORT_HISTORY_KEY);
    if (!raw) {
      const seed = mockImportHistory();
      storage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedImport(storage);
    return parsed as ImportHistoryEntry[];
  } catch {
    return seedImport(storage);
  }
}

function seedImport(storage: StorageLike): ImportHistoryEntry[] {
  const seed = mockImportHistory();
  try {
    storage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(seed));
  } catch {
    // localStorage tidak tersedia — riwayat tetap valid selama sesi.
  }
  return seed;
}

// Tambah riwayat terbaru di paling atas; dibatasi IMPORT_HISTORY_LIMIT entri.
export function addImportHistory(storage: StorageLike, entry: ImportHistoryEntry): ImportHistoryEntry[] {
  const next = [entry, ...loadImportHistory(storage)].slice(0, IMPORT_HISTORY_LIMIT);
  storage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(next));
  return next;
}

// Format timestamp riwayat deterministik (tanpa locale) supaya testable:
// "12/08/2026 09:05". ISO rusak → dikembalikan apa adanya.
export function formatImportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}