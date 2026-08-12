import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRecordsQuery } from "./query";

describe("buildRecordsQuery", () => {
  it("default: page=1, perPage=20, tanpa filter", () => {
    const q = buildRecordsQuery({});
    assert.deepEqual(q.where, {});
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 20);
    assert.equal(q.skip, 0);
    assert.equal(q.take, 20);
  });

  it("filter status/areaId/shift dipasang (status tidak valid diabaikan)", () => {
    const q = buildRecordsQuery({ status: "APPROVED", areaId: "area-1", shift: "1" });
    assert.deepEqual(q.where, {
      status: "APPROVED",
      areaId: "area-1",
      shift: "1",
    });
    const invalid = buildRecordsQuery({ status: "BOGUS" });
    assert.deepEqual(invalid.where, {});
  });

  it("model dicari case-insensitive + trim", () => {
    const q = buildRecordsQuery({ model: "  ABC  " });
    assert.deepEqual(q.where, { model: { contains: "ABC", mode: "insensitive" } });
  });

  it("date range: from = awal hari, to = akhir hari (inklusif)", () => {
    const q = buildRecordsQuery({ from: "2026-08-10", to: "2026-08-12" });
    const date = q.where.date as { gte: Date; lte: Date };
    assert.equal(date.gte.getFullYear(), 2026);
    assert.equal(date.gte.getMonth(), 7);
    assert.equal(date.gte.getDate(), 10);
    assert.equal(date.gte.getHours(), 0);
    assert.equal(date.gte.getMinutes(), 0);
    assert.equal(date.lte.getFullYear(), 2026);
    assert.equal(date.lte.getMonth(), 7);
    assert.equal(date.lte.getDate(), 12);
    assert.equal(date.lte.getHours(), 23);
    assert.equal(date.lte.getMinutes(), 59);
    assert.equal(date.lte.getSeconds(), 59);
  });

  it("tanggal tidak valid diabaikan", () => {
    const q = buildRecordsQuery({ from: "bukan-tanggal" });
    assert.deepEqual(q.where, {});
  });

  it("page/perPage diklem ke rentang aman", () => {
    const q = buildRecordsQuery({ page: 0, perPage: 500 });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 100);
    const q2 = buildRecordsQuery({ page: 3, perPage: 10 });
    assert.equal(q2.skip, 20);
    assert.equal(q2.take, 10);
  });

  it("area: filter nama case-insensitive + trim via relasi", () => {
    const q = buildRecordsQuery({ area: "  Sewing A  " });
    assert.deepEqual(q.where, {
      area: { name: { contains: "Sewing A", mode: "insensitive" } },
    });
    assert.deepEqual(buildRecordsQuery({ area: "   " }).where, {});
  });

  it("models: comma-separated exact match (in: [])", () => {
    const q = buildRecordsQuery({ models: "LV-3000, LV-5000,LV-7000 " });
    assert.deepEqual(q.where, { model: { in: ["LV-3000", "LV-5000", "LV-7000"] } });
    assert.deepEqual(buildRecordsQuery({ models: "  , , " }).where, {});
  });

  it("models override model (exact mendahului contains)", () => {
    const q = buildRecordsQuery({ model: "LV-3", models: "LV-3000,LV-5000" });
    assert.deepEqual(q.where, { model: { in: ["LV-3000", "LV-5000"] } });
  });

  it("orderBy default: [{date desc},{createdAt desc}]", () => {
    const q = buildRecordsQuery({});
    assert.deepEqual(q.orderBy, [{ date: "desc" }, { createdAt: "desc" }]);
  });

  it("sort/order: whitelist kolom + arah", () => {
    assert.deepEqual(buildRecordsQuery({ sort: "upph" }).orderBy, [
      { upph: "desc" },
      { createdAt: "desc" },
    ]);
    assert.deepEqual(buildRecordsQuery({ sort: "plan", order: "asc" }).orderBy, [
      { plan: "asc" },
      { createdAt: "asc" },
    ]);
    assert.deepEqual(buildRecordsQuery({ sort: "OUTPUTPROD", order: "ASC" }).orderBy, [
      { outputProd: "asc" },
      { createdAt: "asc" },
    ]);
    assert.deepEqual(buildRecordsQuery({ sort: "shift", order: "whatever" }).orderBy, [
      { shift: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("sort: kolom non-whitelist atau kosong → default", () => {
    assert.deepEqual(buildRecordsQuery({ sort: "secret" }).orderBy, [
      { date: "desc" },
      { createdAt: "desc" },
    ]);
    assert.deepEqual(buildRecordsQuery({ sort: "  " }).orderBy, [
      { date: "desc" },
      { createdAt: "desc" },
    ]);
  });

  it("pagination edge: page negatif/NaN → 1; perPage negatif → 1, 0/NaN → default 20", () => {
    assert.equal(buildRecordsQuery({ page: -3 }).page, 1);
    assert.equal(buildRecordsQuery({ page: Number.NaN }).page, 1);
    assert.equal(buildRecordsQuery({ perPage: -5 }).perPage, 1);
    assert.equal(buildRecordsQuery({ perPage: 0 }).perPage, 20);
    assert.equal(buildRecordsQuery({ perPage: Number.NaN }).perPage, 20);
    assert.equal(buildRecordsQuery({}).skip, 0);
  });
});
