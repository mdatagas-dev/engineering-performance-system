import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildExportFilter, buildExportQuery, EXPORT_MAX_ROWS } from "./query";

const DEFAULT_ORDER_BY = [{ date: "desc" }, { createdAt: "desc" }] as const;

function url(query: string): URL {
  return new URL(`http://localhost/api/export?${query}`);
}

describe("buildExportFilter — snapshot filter untuk audit EXPORTED", () => {
  it("hanya key valid yang diambil, nilai kosong dibuang", () => {
    assert.deepEqual(buildExportFilter(url("from=2026-08-01&junk=x&area=abc&status=")), {
      from: "2026-08-01",
      area: "abc",
    });
  });

  it("kosong tanpa query", () => {
    assert.deepEqual(buildExportFilter(url("")), {});
  });
});

describe("buildExportQuery — REUSE buildRecordsQuery, tanpa pagination", () => {
  it("where/filter sama dengan GET /api/records", () => {
    const q = buildExportQuery(
      url("from=2026-08-01&to=2026-08-12&status=DRAFT&areaId=area-1&shift=1&sort=date&order=asc")
    );
    assert.deepEqual(q.filter, {
      from: "2026-08-01",
      to: "2026-08-12",
      status: "DRAFT",
      areaId: "area-1",
      shift: "1",
      sort: "date",
      order: "asc",
    });
    assert.ok(q.where.status === "DRAFT");
    assert.deepEqual(q.where.areaId, "area-1");
    assert.equal(q.where.shift, "1");
  });

  it("page/perPage DIABAIKAN — tidak ada skip, take = cap 50k", () => {
    const q = buildExportQuery(url("page=3&perPage=5"));
    assert.ok(!("skip" in q));
    assert.equal(q.take, EXPORT_MAX_ROWS);
    assert.equal(EXPORT_MAX_ROWS, 50_000);
  });

  it("tanpa filter → where kosong, orderBy default", () => {
    const q = buildExportQuery(url(""));
    assert.deepEqual(q.where, {});
    assert.deepEqual(q.orderBy, DEFAULT_ORDER_BY);
  });

  it("models comma-separated meng-override model", () => {
    const q = buildExportQuery(url("model=LV-3000&models=LV-3000,LV-5000"));
    const m = q.where.model as { in?: string[] };
    assert.deepEqual(m.in, ["LV-3000", "LV-5000"]);
  });

  it("status invalid diabaikan (bukan error)", () => {
    const q = buildExportQuery(url("status=BOGUS"));
    assert.equal(q.where.status, undefined);
  });
});