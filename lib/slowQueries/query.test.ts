import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSlowQueryQuery } from "./query";

describe("buildSlowQueryQuery", () => {
  it("default: page=1, perPage=20, tanpa filter", () => {
    const q = buildSlowQueryQuery({});
    assert.deepEqual(q.where, {});
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 20);
    assert.equal(q.skip, 0);
    assert.equal(q.take, 20);
  });

  it("minDurationMs dipasang sebagai gte durationMs", () => {
    const q = buildSlowQueryQuery({ minDurationMs: "2000" });
    assert.deepEqual(q.where, { durationMs: { gte: 2000 } });
  });

  it("minDurationMs tidak valid atau negatif diabaikan", () => {
    assert.deepEqual(buildSlowQueryQuery({ minDurationMs: "abc" }).where, {});
    assert.deepEqual(buildSlowQueryQuery({ minDurationMs: "-5" }).where, {});
  });

  it("from/to menjadi gte/lte pada createdAt", () => {
    const q = buildSlowQueryQuery({ from: "2026-01-01", to: "2026-01-31" });
    assert.deepEqual(q.where, {
      createdAt: { gte: new Date("2026-01-01"), lte: new Date("2026-01-31") },
    });
  });

  it("tanggal tidak valid diabaikan", () => {
    assert.deepEqual(buildSlowQueryQuery({ from: "bukan-tanggal" }).where, {});
  });

  it("page/perPage diklem ke rentang aman", () => {
    const q = buildSlowQueryQuery({ page: 0, perPage: 500 });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 100);
    const q2 = buildSlowQueryQuery({ page: 3, perPage: 10 });
    assert.equal(q2.skip, 20);
    assert.equal(q2.take, 10);
  });
});
