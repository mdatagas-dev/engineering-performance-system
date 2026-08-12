import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProductionSummary } from "./summary";
import { mockProductionRecords } from "@/lib/mocks/records";

describe("buildProductionSummary", () => {
  it("skenario PRD: total Output 1002, GAP OP 42 (Plan 960/Output 1000+2)", () => {
    const s = buildProductionSummary(mockProductionRecords.slice(0, 2));
    assert.equal(s.count, 2);
    assert.equal(s.totalOutput, 1002);
    assert.equal(s.totalPlan, 960);
    assert.equal(s.gapOp, 42);
  });

  it("GAP HC dihitung DARI TOTAL, bukan jumlah gap per baris", () => {
    const s = buildProductionSummary(mockProductionRecords);
    assert.equal(s.hcActual, 118); // 32+26+30+30
    assert.equal(s.hcStandard, 113); // 30+25+30+28
    assert.equal(s.gapHc, 5);
  });

  it("avgUpph = ΣuphResult ÷ ΣhcActual round 2 (357 ÷ 118 = 3.025... → 3.03)", () => {
    const s = buildProductionSummary(mockProductionRecords);
    assert.equal(s.avgUpph, 3.03);
  });

  it("hit-rate UPH: % record dgn Result ≥ Target (3 dari 4 = 75)", () => {
    const s = buildProductionSummary(mockProductionRecords);
    assert.equal(s.uphHitCount, 3);
    assert.equal(s.uphTotalCount, 4);
    assert.equal(s.hitRateUph, 75);
  });

  it("totalSetup = Σ totalSetup", () => {
    assert.equal(buildProductionSummary(mockProductionRecords).totalSetup, 45); // 12+8+10+15
  });

  it("koleksi kosong → nol & avgUpph null (bukan NaN)", () => {
    const s = buildProductionSummary([]);
    assert.equal(s.count, 0);
    assert.equal(s.totalOutput, 0);
    assert.equal(s.gapOp, 0);
    assert.equal(s.avgUpph, null);
    assert.equal(s.hitRateUph, 0);
    assert.ok(Number.isFinite(s.gapOp));
  });

  it("HC Actual total 0 → avgUpph null", () => {
    const zero = buildProductionSummary([
      { ...mockProductionRecords[0], hcActual: 0, uphResult: 90 },
    ]);
    assert.equal(zero.avgUpph, null);
  });
});