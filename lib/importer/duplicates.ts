// Deteksi duplikat impor server — murni & testable (node:test).
// Kunci duplikat = date+model+shift+areaId (sama dengan @@unique ProductionRecord;
// signature case-insensitive utk model/shift, shift/areaId kosong ≈ null — pola
// duplicateRowKeys frontend). Dua lapis:
//  - antar baris file: baris ke-2 dst dengan kunci sama ditandai duplikat (baris
//    pertama menang) — findWithinFileDuplicates.
//  - terhadap DB: kunci unik baris file → query findMany OR komposit
//    (buildExistingKeysQueries, di-chunk), hasil diubah jadi Set kunci existing
//    (existingRowToKey) utk dibandingkan di validate.ts.
// NULL shift/areaId dianggap "distinct" oleh Postgres, jadi constrain unique DB
// TIDAK menjamin bentrok saat salah satu null — lapisan impor wajib mengecek
// sendiri (lihat komentar schema ProductionRecord): null dinormalisasi "".

import { Prisma } from "@/app/generated/prisma/client";

export type ImportRowKeyInput = {
  date: string;
  model: string;
  shift: string | null;
  areaId: string | null;
};

export type ImportKeyRow = ImportRowKeyInput & { index: number };

// Signature tunggal kunci duplikat (konsisten dengan importRowKey di semua lapis).
export function importRowKey(input: ImportRowKeyInput): string {
  const date = input.date.trim();
  const model = input.model.trim().toLowerCase();
  const shift = (input.shift ?? "").trim().toLowerCase();
  const areaId = (input.areaId ?? "").trim().toLowerCase();
  return [date, model, shift, areaId].join("|");
}

// Kunci hanya bermakna bila date & model terisi (baris invalid tetap dibiarkan
// error lewat validasi field, tanpa suara duplikat tambahan).
export function isValidKeyRow(row: ImportRowKeyInput): boolean {
  return row.date.trim() !== "" && row.model.trim() !== "";
}

// Duplikat antar-baris file: Map<duplicateIndex, firstIndex>. Baris pertama
// menang; hanya baris ke-2 dst yang masuk map.
export function findWithinFileDuplicates(rows: readonly ImportKeyRow[]): Map<number, number> {
  const seen = new Map<string, number>();
  const dups = new Map<number, number>();
  for (const row of rows) {
    if (!isValidKeyRow(row)) continue;
    const key = importRowKey(row);
    const first = seen.get(key);
    if (first !== undefined) {
      dups.set(row.index, first);
    } else {
      seen.set(key, row.index);
    }
  }
  return dups;
}

// Kunci unik seluruh baris file — dasar query existing DB.
export function collectUniqueKeys(rows: readonly ImportKeyRow[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!isValidKeyRow(row)) continue;
    keys.add(importRowKey(row));
  }
  return keys;
}

// Baris hasil findMany existing → kunci (normalisasi sama dgn importRowKey).
export function existingRowToKey(row: {
  date: Date;
  model: string;
  shift: string | null;
  areaId: string | null;
}): string {
  return importRowKey({
    date: row.date.toISOString().slice(0, 10),
    model: row.model,
    shift: row.shift,
    areaId: row.areaId,
  });
}

export const EXISTING_KEYS_BATCH_SIZE = 1000;

// Query findMany utk kunci existing — OR komposit per kunci (date+model+shift
// +areaId equality, null utk ""). Di-chunk step agar file besar (maks ~1MB)
// tetap aman. Tiap query dipakai prisma.productionRecord.findMany({where,
// select: date/model/shift/areaId}) lalu hasilnya existingRowToKey.
export function buildExistingKeysQueries(
  keys: ReadonlySet<string>,
  batchSize: number = EXISTING_KEYS_BATCH_SIZE
): Prisma.ProductionRecordWhereInput[] {
  const all = [...keys];
  const queries: Prisma.ProductionRecordWhereInput[] = [];
  for (let start = 0; start < all.length; start += batchSize) {
    const chunk = all.slice(start, start + batchSize);
    queries.push({
      OR: chunk.map((key) => {
        const [date, model, shift, areaId] = key.split("|");
        return {
          date: new Date(date),
          model,
          shift: shift === "" ? null : shift,
          areaId: areaId === "" ? null : areaId,
        };
      }),
    });
  }
  return queries;
}