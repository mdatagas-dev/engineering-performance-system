// Kunci perilaku calculateQualityMetrics — jangan ubah tanpa menyesuaikan
// test di sini. inspectedQty <= 0 = pembagian nol -> semua persen 0.
// Persen = (nilai / inspected) * 100, round2 (2 desimal).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateQualityMetrics, round2 } from "./calculate";

describe("calculateQualityMetrics", () => {
  it("contoh PRD: 950 passed dari 1000 inspected -> yield & passRate 95", () => {
    const r = calculateQualityMetrics({ inspectedQty: 1000, passedQty: 950, failedQty: 50, defectCount: 12 });
    assert.deepEqual(r, { yieldPct: 95, passRatePct: 95, rejectRatePct: 5, defectRatePct: 1.2 });
  });

  it("pembulatan 2 desimal: 1000 inspected, 333 passed -> 33.3", () => {
    const r = calculateQualityMetrics({ inspectedQty: 1000, passedQty: 333, failedQty: 0, defectCount: 0 });
    assert.equal(r.yieldPct, 33.3);
  });

  it("1/3 -> 33.33 (round2 half-up skala-100)", () => {
    const r = calculateQualityMetrics({ inspectedQty: 3, passedQty: 1, failedQty: 2, defectCount: 1 });
    assert.equal(r.yieldPct, 33.33);
    assert.equal(r.rejectRatePct, 66.67);
  });

  it("inspected 0 -> semua persen 0 (bukan NaN/Infinity)", () => {
    const r = calculateQualityMetrics({ inspectedQty: 0, passedQty: 0, failedQty: 0, defectCount: 0 });
    assert.deepEqual(r, { yieldPct: 0, passRatePct: 0, rejectRatePct: 0, defectRatePct: 0 });
  });

  it("inspected negatif -> semua persen 0 (guard pembagian nol)", () => {
    const r = calculateQualityMetrics({ inspectedQty: -5, passedQty: 10, failedQty: 0, defectCount: 0 });
    assert.deepEqual(r, { yieldPct: 0, passRatePct: 0, rejectRatePct: 0, defectRatePct: 0 });
  });

  it("semua passed -> yield 100, reject 0", () => {
    const r = calculateQualityMetrics({ inspectedQty: 500, passedQty: 500, failedQty: 0, defectCount: 0 });
    assert.equal(r.yieldPct, 100);
    assert.equal(r.rejectRatePct, 0);
  });

  it("defectCount melebihi inspected tetap dihitung apa adanya (tidak di-clamp)", () => {
    const r = calculateQualityMetrics({ inspectedQty: 100, passedQty: 90, failedQty: 10, defectCount: 150 });
    assert.equal(r.defectRatePct, 150);
  });

  it("angka besar stabil: 1e9 inspected, 123456789 passed -> 12.35", () => {
    const r = calculateQualityMetrics({ inspectedQty: 1e9, passedQty: 123456789, failedQty: 0, defectCount: 0 });
    assert.equal(r.yieldPct, 12.35);
  });
});

describe("round2", () => {
  it("pembulatan 2 desimal half-up", () => {
    assert.equal(round2(2.815), 2.82);
    assert.equal(round2(2.8125), 2.81);
    assert.equal(round2(33.333333), 33.33);
  });
});
