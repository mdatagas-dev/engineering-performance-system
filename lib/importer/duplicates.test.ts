import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  importRowKey,
  findWithinFileDuplicates,
  collectUniqueKeys,
  existingRowToKey,
  buildExistingKeysQueries,
} from "./duplicates";

describe("importRowKey", () => {
  it("menggabung date+model+shift+areaId, case-insensitive utk model/shift", () => {
    assert.equal(
      importRowKey({ date: " 2026-08-12 ", model: "LV-3000", shift: " 1 ", areaId: "ABC-DEF" }),
      importRowKey({ date: "2026-08-12", model: "lv-3000", shift: "1", areaId: "abc-def" })
    );
  });
  it("shift/areaId kosong dinormalisasi '' (≈ null)", () => {
    const withNulls = importRowKey({ date: "2026-08-12", model: "M", shift: null, areaId: null });
    const withEmpties = importRowKey({ date: "2026-08-12", model: "M", shift: "", areaId: "" });
    assert.equal(withNulls, withEmpties);
  });
});

describe("findWithinFileDuplicates", () => {
  const row = (index: number, date: string, model: string, shift = "1") => ({
    index,
    date,
    model,
    shift,
    areaId: "a",
  });
  it("baris ke-2 dst dengan kunci sama → Map dupIndex → firstIndex", () => {
    const dups = findWithinFileDuplicates([row(2, "2026-08-12", "LV-3000"), row(5, "2026-08-12", "LV-3000"), row(8, "2026-08-12", "LV-3000")]);
    assert.deepEqual([...dups.entries()], [[5, 2], [8, 2]]);
  });
  it("kunci berbeda (tanggal/model/shift) tidak dianggap duplikat", () => {
    const dups = findWithinFileDuplicates([row(2, "2026-08-12", "LV-3000"), row(5, "2026-08-13", "LV-3000"), row(8, "2026-08-12", "LV-4000")]);
    assert.equal(dups.size, 0);
  });
  it("baris tanpa date/model valid dilewati (tanpa suara duplikat tambahan)", () => {
    const dups = findWithinFileDuplicates([
      row(2, "", "LV-3000"),
      row(5, "2026-08-12", "LV-3000"),
      row(8, "2026-08-12", "LV-3000"),
    ]);
    assert.deepEqual([...dups.entries()], [[8, 5]]);
  });
});

describe("collectUniqueKeys", () => {
  it("kunci unik saja, baris kosong dilewati", () => {
    const keys = collectUniqueKeys([
      { index: 1, date: "2026-08-12", model: "LV-3000", shift: "1", areaId: "P1" },
      { index: 2, date: "2026-08-12", model: "LV-3000", shift: "1", areaId: "P1" },
      { index: 3, date: "2026-08-12", model: "LV-3000", shift: "2", areaId: "P1" },
      { index: 4, date: "", model: "LV-3000", shift: "1", areaId: "P1" },
    ]);
    assert.equal(keys.size, 2);
  });
});

describe("existingRowToKey", () => {
  it("Date DB dikonversi jadi kunci (UTC midnight → YYYY-MM-DD)", () => {
    const key = existingRowToKey({
      date: new Date("2026-08-12T00:00:00.000Z"),
      model: "LV-3000",
      shift: null,
      areaId: null,
    });
    assert.equal(key.split("|")[0], "2026-08-12");
    assert.equal(importRowKey({ date: "2026-08-12", model: "LV-3000", shift: null, areaId: null }), key);
  });
});

describe("buildExistingKeysQueries", () => {
  it("set kosong → tanpa query", () => {
    assert.deepEqual(buildExistingKeysQueries(new Set()), []);
  });
  it("OR komposit per kunci; '' → null utk shift/areaId; round-trip konsisten", () => {
    const keys = new Set([
      importRowKey({ date: "2026-08-12", model: "LV-3000", shift: "1", areaId: "p1" }),
      importRowKey({ date: "2026-08-13", model: "LV-4000", shift: null, areaId: null }),
    ]);
    const queries = buildExistingKeysQueries(keys);
    assert.equal(queries.length, 1);
    assert.equal(queries[0].OR!.length, 2);
    const [first, second] = queries[0].OR as {
      date: Date;
      model: string;
      shift: string | null;
      areaId: string | null;
    }[];
    assert.equal(first.date.toISOString().slice(0, 10), "2026-08-12");
    assert.equal(first.model, "lv-3000");
    assert.equal(first.shift, "1");
    assert.equal(first.areaId, "p1");
    assert.equal(second.shift, null);
    assert.equal(second.areaId, null);
  });
  it("dichunk sesuai batchSize", () => {
    const keys = new Set(
      Array.from({ length: 5 }, (_, i) => importRowKey({ date: `2026-08-1${i}`, model: "M", shift: null, areaId: null }))
    );
    assert.equal(buildExistingKeysQueries(keys, 2).length, 3);
  });
});