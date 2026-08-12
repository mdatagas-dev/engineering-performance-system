import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  IMPORT_HISTORY_LIMIT,
  addImportHistory,
  formatImportDate,
  loadImportHistory,
  type ImportHistoryEntry,
} from "./history";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  } as Storage;
}

function entry(overrides: Partial<ImportHistoryEntry> = {}): ImportHistoryEntry {
  return {
    id: "imp_x",
    fileName: "a.csv",
    rowsImported: 3,
    rowsSkipped: 0,
    importedAt: "2026-08-12T09:00:00+07:00",
    importedBy: "staff@eps.local",
    status: "success",
    ...overrides,
  };
}

describe("loadImportHistory", () => {
  it("localStorage kosong → seed 3 riwayat tiruan & terpersist", () => {
    const storage = fakeStorage();
    const history = loadImportHistory(storage);
    assert.equal(history.length, 3);
    assert.deepEqual(history.map((h) => h.id), ["imp_seed_1", "imp_seed_2", "imp_seed_3"]);
    assert.ok(storage.getItem("eps_mock_imports"));
  });

  it("sudah terisi → dikembalikan tanpa seed", () => {
    const storage = fakeStorage({ eps_mock_imports: JSON.stringify([entry({ id: "imp_a" })]) });
    const history = loadImportHistory(storage);
    assert.equal(history.length, 1);
    assert.equal(history[0].id, "imp_a");
  });

  it("JSON rusak → fallback seed", () => {
    const storage = fakeStorage({ eps_mock_imports: "{oops" });
    assert.equal(loadImportHistory(storage).length, 3);
  });

  it("storage null → []", () => {
    assert.deepEqual(loadImportHistory(null), []);
    assert.deepEqual(loadImportHistory(undefined), []);
  });
});

describe("addImportHistory", () => {
  it("entri baru di paling atas", () => {
    const storage = fakeStorage();
    const existing = loadImportHistory(storage);
    const next = addImportHistory(storage, entry({ id: "imp_new" }));
    assert.equal(next.length, existing.length + 1);
    assert.equal(next[0].id, "imp_new");
  });

  it("dibatasi IMPORT_HISTORY_LIMIT, entri tertua dibuang", () => {
    const storage = fakeStorage();
    let next: ImportHistoryEntry[] = [];
    for (let i = 0; i < IMPORT_HISTORY_LIMIT + 5; i++) {
      next = addImportHistory(storage, entry({ id: `imp_${i}` }));
    }
    assert.equal(next.length, IMPORT_HISTORY_LIMIT);
    assert.equal(next[0].id, `imp_${IMPORT_HISTORY_LIMIT + 4}`);
  });
});

describe("formatImportDate", () => {
  it("ISO → DD/MM/YYYY HH:MM deterministik", () => {
    assert.equal(formatImportDate("2026-08-12T09:05:00+07:00"), "12/08/2026 09:05");
  });
  it("ISO rusak → string asal", () => {
    assert.equal(formatImportDate("bukan-tanggal"), "bukan-tanggal");
  });
});