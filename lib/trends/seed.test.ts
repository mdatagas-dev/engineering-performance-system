import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords } from "@/lib/mocks/records";
import { buildTrendSeed, TREND_VARIANTS_PER_ROW } from "./seed";

describe("buildTrendSeed", () => {
  it("pure: tidak memutasi mock shared", () => {
    const before = JSON.stringify(mockProductionRecords);
    buildTrendSeed();
    assert.equal(JSON.stringify(mockProductionRecords), before);
  });

  it("seed + 15 varian per record → rentang cukup untuk tren & preset", () => {
    const out = buildTrendSeed();
    assert.equal(out.length, mockProductionRecords.length * (TREND_VARIANTS_PER_ROW + 1));
    const dates = [...new Set(out.map((r) => r.date))].sort();
    // Seed punya 2 tanggal dasar (08-12 & 08-11) → 15 varian + 2 = 17 tanggal unik.
    assert.equal(dates.length, TREND_VARIANTS_PER_ROW + 2);
    assert.equal(dates[0], "2026-07-27");
    assert.equal(dates[dates.length - 1], "2026-08-12");
  });

  it("varian: id deterministik, nilai identik dengan seed aslinya", () => {
    const out = buildTrendSeed();
    const v15 = out.find((r) => r.id === "rec_mock_1__trend_v15");
    assert.ok(v15);
    assert.equal(v15?.date, "2026-07-28");
    assert.equal(v15?.model, mockProductionRecords[0].model);
    assert.equal(v15?.outputProd, mockProductionRecords[0].outputProd);
    assert.equal(v15?.upph, mockProductionRecords[0].upph);
  });
});