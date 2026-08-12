import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildAuditQuery } from "./query";

describe("buildAuditQuery", () => {
  it("default: page=1, perPage=20, tanpa filter", () => {
    const q = buildAuditQuery({});
    assert.deepEqual(q.where, {});
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 20);
    assert.equal(q.skip, 0);
    assert.equal(q.take, 20);
  });

  it("filter equal fields dipasang", () => {
    const q = buildAuditQuery({
      action: "KPI_UPDATED",
      entityType: "KPI",
      entityId: "abc-123",
      userId: "user-1",
    });
    assert.deepEqual(q.where, {
      action: "KPI_UPDATED",
      entityType: "KPI",
      entityId: "abc-123",
      userId: "user-1",
    });
  });

  it("date range from/to menjadi gte/lte pada createdAt", () => {
    const q = buildAuditQuery({ from: "2026-01-01", to: "2026-01-31" });
    assert.deepEqual(q.where, {
      createdAt: {
        gte: new Date("2026-01-01"),
        lte: new Date("2026-01-31"),
      },
    });
  });

  it("tanggal tidak valid diabaikan", () => {
    const q = buildAuditQuery({ from: "bukan-tanggal" });
    assert.deepEqual(q.where, {});
  });

  it("search membentuk OR lintas field (termasuk user name/email)", () => {
    const q = buildAuditQuery({ search: "  OEE  " });
    assert.deepEqual(q.where.OR, [
      { action: { contains: "OEE", mode: "insensitive" } },
      { entityType: { contains: "OEE", mode: "insensitive" } },
      { entityId: { contains: "OEE", mode: "insensitive" } },
      { user: { name: { contains: "OEE", mode: "insensitive" } } },
      { user: { email: { contains: "OEE", mode: "insensitive" } } },
    ]);
  });

  it("page/perPage diklem ke rentang aman", () => {
    const q = buildAuditQuery({ page: 0, perPage: 500 });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 100);
    const q2 = buildAuditQuery({ page: 3, perPage: 10 });
    assert.equal(q2.skip, 20);
    assert.equal(q2.take, 10);
  });

  it("entityId ikut difilter (kontrak /api/audit)", () => {
    const q = buildAuditQuery({ entityId: "rec-42" });
    assert.deepEqual(q.where, { entityId: "rec-42" });
  });

  it("page/perPage string tidak valid (NaN) jatuh ke default", () => {
    const q = buildAuditQuery({ page: Number("abc"), perPage: Number("xyz") });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 20);
  });

  it("perPage 0 jatuh ke default 20 (fallback ||20, bukan 0/ infinity)", () => {
    const q = buildAuditQuery({ perPage: 0 });
    assert.equal(q.perPage, 20);
    assert.equal(q.take, 20);
  });

  it("from+to bersama menghasilkan rentang gte+lte", () => {
    const q = buildAuditQuery({ from: "2026-02-01", to: "2026-02-28" });
    assert.deepEqual(q.where.createdAt, {
      gte: new Date("2026-02-01"),
      lte: new Date("2026-02-28"),
    });
  });
});
