import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRecordsQuery, type RecordsQueryParams } from "./query";

// Kolom where yang dihasilkan query builder vs kolom berindeks di
// prisma/schema.prisma (ProductionRecord):
//   @index([date, model, status])  -> date, model, status
//   @index([status, createdAt])    -> status, createdAt
//   @index([areaId, date])         -> areaId, date
//   @index([model])                -> model
//   @@unique([date, model, shift, areaId]) -> shift (trailing, equality)
//   @index([createdBy])            -> createdBy
// `area` = filter relasi: Area.name (@unique, terindeks) -> areaId (terindeks).
const INDEXED_WHERE_KEYS = new Set(["date", "model", "status", "areaId", "shift", "createdAt", "createdBy", "area"]);

// Pola filter umum dari dashboard/filter (dari/to/model/area/status/shift)
// dan route (areaId, status, model, range tanggal) — setiap where key harus
// selalu tercakup oleh minimal satu indeks kolom tabel.
const COMMON_COMBOS: RecordsQueryParams[] = [
  {},
  { from: "2026-08-01", to: "2026-08-12" },
  { from: "2026-08-01", to: "2026-08-12", model: "LV-3000" },
  { from: "2026-08-01", to: "2026-08-12", models: "LV-3000,LV-5000" },
  { model: "LV-3000" },
  { models: "LV-3000,LV-5000" },
  { areaId: "area-1" },
  { areaId: "area-1", from: "2026-08-01", to: "2026-08-12" },
  { area: "sewing" },
  { status: "APPROVED" },
  { status: "APPROVED", from: "2026-08-01", to: "2026-08-12" },
  { status: "APPROVED", areaId: "area-1" },
  { status: "APPROVED", areaId: "area-1", from: "2026-08-01", to: "2026-08-12" },
  { status: "APPROVED", shift: "1" },
  { areaId: "area-1", shift: "1", model: "LV-3000" },
  { area: "sewing", status: "LOCKED", models: "LV-3000,LV-5000" },
];

describe("buildRecordsQuery index coverage", () => {
  it("setiap pola filter umum menghasilkan where keys yang terindeks", () => {
    for (const params of COMMON_COMBOS) {
      const { where } = buildRecordsQuery(params);
      const keys = Object.keys(where);
      for (const key of keys) {
        assert.ok(
          INDEXED_WHERE_KEYS.has(key),
          `param ${JSON.stringify(params)} -> where.${key} tidak tercakup indeks ProductionRecord manapun`
        );
      }
    }
  });

  it("status+areaId tanpa date: tetap memakai kolom terindeks", () => {
    const { where } = buildRecordsQuery({ status: "APPROVED", areaId: "area-1" });
    assert.deepEqual(where, { status: "APPROVED", areaId: "area-1" });
    assert.ok(Object.keys(where).every((k) => INDEXED_WHERE_KEYS.has(k)));
  });
});