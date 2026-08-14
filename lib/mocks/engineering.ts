// Mock data modul Engineering (WI, BOM, Drawing, Change Request, Improvement).
// Frontend-first: seed dibekukan, entri manual user disimpan di localStorage
// (prefix eps_mock_) supaya refresh tidak kehilangan input. Pattern meniru
// lib/mocks/records.ts. Backend CRUD menggantikan di fase nanti.

export type WiStatus = "ACTIVE" | "DRAFT" | "OBSOLETE";

export type WorkInstruction = {
  code: string;
  title: string;
  model: string;
  revision: string;
  status: WiStatus;
  lastUpdate: string;
};

export type BomStatus = "ACTIVE" | "DRAFT" | "OBSOLETE";

export type Bom = {
  code: string;
  product: string;
  partCount: number;
  revision: number;
  status: BomStatus;
  lastUpdate: string;
};

export type DrawingType = "ASSY" | "PART" | "LAYOUT";

export type Drawing = {
  code: string;
  title: string;
  model: string;
  type: DrawingType;
  revision: string;
  lastUpdate: string;
};

export type CrStatus = "OPEN" | "IN REVIEW" | "APPROVED" | "REJECTED";
export type CrPriority = "LOW" | "MEDIUM" | "HIGH";

export type ChangeRequest = {
  code: string;
  title: string;
  requester: string;
  date: string;
  status: CrStatus;
  priority: CrPriority;
};

export type ImprovementStatus = "IDEA" | "PLANNED" | "DONE";

export type Improvement = {
  code: string;
  title: string;
  area: string;
  category: string;
  status: ImprovementStatus;
  date: string;
  owner: string;
};

export const WI_STATUS: readonly WiStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];
export const BOM_STATUS: readonly BomStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];
export const DRAWING_TYPES: readonly DrawingType[] = ["ASSY", "PART", "LAYOUT"];
export const CR_STATUS: readonly CrStatus[] = ["OPEN", "IN REVIEW", "APPROVED", "REJECTED"];
export const CR_PRIORITY: readonly CrPriority[] = ["LOW", "MEDIUM", "HIGH"];
export const IMPROVEMENT_STATUS: readonly ImprovementStatus[] = ["IDEA", "PLANNED", "DONE"];

export type CollectionKey = "wis" | "boms" | "drawings" | "changeRequests" | "improvements";

const wi = (
  code: string,
  title: string,
  model: string,
  revision: string,
  status: WiStatus,
  lastUpdate: string
): WorkInstruction => Object.freeze({ code, title, model, revision, status, lastUpdate });

const bom = (
  code: string,
  product: string,
  partCount: number,
  revision: number,
  status: BomStatus,
  lastUpdate: string
): Bom => Object.freeze({ code, product, partCount, revision, status, lastUpdate });

const drawing = (
  code: string,
  title: string,
  model: string,
  type: DrawingType,
  revision: string,
  lastUpdate: string
): Drawing => Object.freeze({ code, title, model, type, revision, lastUpdate });

const changeRequest = (
  code: string,
  title: string,
  requester: string,
  date: string,
  status: CrStatus,
  priority: CrPriority
): ChangeRequest => Object.freeze({ code, title, requester, date, status, priority });

const improvement = (
  code: string,
  title: string,
  area: string,
  category: string,
  status: ImprovementStatus,
  date: string,
  owner: string
): Improvement => Object.freeze({ code, title, area, category, status, date, owner });

export const wisSeed: readonly WorkInstruction[] = Object.freeze([
  wi("WI-001", "Pemasangan PCB Main Amplifier", "AN-05CDG", "C.01", "ACTIVE", "2026-07-18"),
  wi("WI-002", "Penyolderan Komponen SMD Filter", "AN-05CDG", "B.02", "ACTIVE", "2026-06-30"),
  wi("WI-003", "Kalibrasi Gain Output", "AN-05CDG", "A.03", "DRAFT", "2026-08-02"),
  wi("WI-004", "Perakitan Transformator Toroid", "AN-09CDG", "B.00", "ACTIVE", "2026-05-21"),
  wi("WI-005", "Pengecekan Tegangan Output", "AN-09CDG", "A.01", "ACTIVE", "2026-07-05"),
  wi("WI-006", "Pemasangan Heatsink dan Kipas", "AN-09CDG", "A.00", "OBSOLETE", "2026-03-14"),
  wi("WI-007", "Uji Kebisingan (Noise Test)", "AN-05CDG", "B.01", "ACTIVE", "2026-06-11"),
  wi("WI-008", "Pembungkusan dan Packing Final", "AN-05CDG", "A.02", "DRAFT", "2026-08-08"),
]);

export const bomSeed: readonly Bom[] = Object.freeze([
  bom("BOM-001", "AN-05CDG", 148, 4, "ACTIVE", "2026-07-10"),
  bom("BOM-002", "AN-09CDG", 176, 3, "ACTIVE", "2026-06-24"),
  bom("BOM-003", "AN-05CDG", 152, 2, "DRAFT", "2026-08-04"),
  bom("BOM-004", "AN-05CDG", 158, 5, "ACTIVE", "2026-07-28"),
  bom("BOM-005", "AN-09CDG", 181, 3, "ACTIVE", "2026-05-15"),
  bom("BOM-006", "AN-05CDG", 121, 1, "OBSOLETE", "2026-02-19"),
  bom("BOM-007", "AN-09CDG", 168, 4, "ACTIVE", "2026-07-02"),
]);

export const drawingSeed: readonly Drawing[] = Object.freeze([
  drawing("DWG-001", "Gambar Rakitan Amplifier Utama", "AN-05CDG", "ASSY", "D", "2026-04-19"),
  drawing("DWG-002", "Braket Pemasangan PCB", "AN-05CDG", "PART", "C", "2026-05-02"),
  drawing("DWG-003", "Layout Panel Depan", "AN-05CDG", "LAYOUT", "B", "2026-06-15"),
  drawing("DWG-004", "Rakitan Catu Daya", "AN-09CDG", "ASSY", "C", "2026-05-27"),
  drawing("DWG-005", "Knob Volume", "AN-09CDG", "PART", "A", "2026-07-09"),
  drawing("DWG-006", "Layout Panel Belakang", "AN-09CDG", "LAYOUT", "B", "2026-06-20"),
  drawing("DWG-007", "Penutup Chassis Aluminium", "AN-05CDG", "PART", "D", "2026-07-22"),
  drawing("DWG-008", "Rakitan Heatsink", "AN-09CDG", "ASSY", "A", "2026-03-30"),
]);

export const changeRequestSeed: readonly ChangeRequest[] = Object.freeze([
  changeRequest("CR-001", "Ganti kapasitor filter 6800uF ke 8200uF", "Rudi Hartono", "2026-07-02", "OPEN", "HIGH"),
  changeRequest("CR-002", "Tambah pengencangan sekrup panel depan", "Siti Nurhaliza", "2026-07-08", "IN REVIEW", "MEDIUM"),
  changeRequest("CR-003", "Revisi warna logo produk", "Bambang Setiawan", "2026-06-25", "REJECTED", "LOW"),
  changeRequest("CR-004", "Pindah posisi jack input ke sisi kiri", "Agus Salim", "2026-07-15", "APPROVED", "HIGH"),
  changeRequest("CR-005", "Perubahan lem penguat speaker 209 ke 210", "Dewi Lestari", "2026-07-20", "OPEN", "MEDIUM"),
  changeRequest("CR-006", "Ubah ketebalan PCB 1.6mm ke 2.0mm", "Rudi Hartono", "2026-07-26", "IN REVIEW", "HIGH"),
  changeRequest("CR-007", "Penambahan lubang ventilasi chassis", "Eko Prasetyo", "2026-07-29", "OPEN", "LOW"),
  changeRequest("CR-008", "Standarisasi warna kabel internal", "Siti Nurhaliza", "2026-06-11", "APPROVED", "MEDIUM"),
]);

export const improvementSeed: readonly Improvement[] = Object.freeze([
  improvement("IMP-001", "Reduksi waktu setup mesin solder", "Produksi", "EFISIENSI", "PLANNED", "2026-06-18", "Rudi Hartono"),
  improvement("IMP-002", "Usulan rak penyimpanan komponen SMD", "Gudang", "5S", "IDEA", "2026-07-06", "Dewi Lestari"),
  improvement("IMP-003", "Standar gerakan kerja perakitan", "Produksi", "PROSES", "DONE", "2026-05-30", "Eko Prasetyo"),
  improvement("IMP-004", "Pemasangan lampu darurat area QC", "QC", "KESELAMATAN", "PLANNED", "2026-07-12", "Bambang Setiawan"),
  improvement("IMP-005", "Perbaikan ergonomi stasiun penyolderan", "Produksi", "KESELAMATAN", "DONE", "2026-06-02", "Agus Salim"),
  improvement("IMP-006", "Digitalisasi form inspeksi harian", "QC", "DIGITALISASI", "IDEA", "2026-07-25", "Siti Nurhaliza"),
  improvement("IMP-007", "Pengurangan scrap PCB solder", "Produksi", "KUALITAS", "PLANNED", "2026-07-19", "Rudi Hartono"),
  improvement("IMP-008", "Jadwal pemeliharaan preventif mesin", "Maintenance", "PROSES", "IDEA", "2026-08-01", "Eko Prasetyo"),
]);

type AnyItem = { code: string };

const SEED_BY_KEY: Record<CollectionKey, readonly AnyItem[]> = {
  wis: wisSeed,
  boms: bomSeed,
  drawings: drawingSeed,
  changeRequests: changeRequestSeed,
  improvements: improvementSeed,
};

const STORAGE_PREFIX = "eps_mock_";

export const storageKey = (key: CollectionKey): string => `${STORAGE_PREFIX}${key}`;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function getStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

// Baca koleksi dari localStorage; gagal/tidak ada storage → salinan seed (bukan
// referensi, supaya item baru tidak memutasi seed).
export function loadCollection<T>(key: CollectionKey, seed: readonly T[]): T[] {
  const storage = getStorage();
  if (!storage) return [...seed];
  try {
    const raw = storage.getItem(storageKey(key));
    if (!raw) return [...seed];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [...seed];
  } catch {
    return [...seed];
  }
}

export function saveCollection<T>(key: CollectionKey, items: readonly T[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(storageKey(key), JSON.stringify(items));
  } catch {
    // Kuota/private mode — abaikan, state in-memory tetap jalan.
  }
}

// Read-modify-write: tambah satu item, simpan, kembalikan array baru.
export function addItem<T extends AnyItem>(key: CollectionKey, item: T): T[] {
  const next = [...loadCollection(key, SEED_BY_KEY[key] as readonly T[]), item];
  saveCollection(key, next);
  return next;
}

// Read-modify-write: hapus item berdasarkan code, simpan, kembalikan array baru.
export function removeItem<T extends AnyItem>(key: CollectionKey, id: string): T[] {
  const next = loadCollection(key, SEED_BY_KEY[key] as readonly T[]).filter((i) => i.code !== id);
  saveCollection(key, next);
  return next;
}
