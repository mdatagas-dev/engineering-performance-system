import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords } from "@/lib/mocks/records";
import { buildSeries } from "./series";

describe("buildSeries", () => {
  it("agregat per tanggal: jumlah (konvensi baris total), urut asc", () => {
    const points = buildSeries(mockProductionRecords);
    assert.deepEqual(points.map((p) => p.date), ["2026-08-11", "2026-08-12"]);
    const aug11 = points[0];
    assert.deepEqual(aug11, {
      date: "2026-08-11",
      uphResult: 80,
      outputProd: 640,
      hcActual: 30,
      hcStandard: 28,
      totalSetup: 15,
    });
    const aug12 = points[1];
    assert.equal(aug12.uphResult, 90 + 102 + 85);
    assert.equal(aug12.outputProd, 1000 + 2 + 680);
    assert.equal(aug12.hcActual, 32 + 26 + 30);
    assert.equal(aug12.hcStandard, 30 + 25 + 30);
    assert.equal(aug12.totalSetup, 12 + 8 + 10);
  });

  it("input kosong → output kosong", () => {
    assert.deepEqual(buildSeries([]), []);
  });

  it("input tidak pernah dimutasi", () => {
    const before = JSON.stringify(mockProductionRecords);
    buildSeries(mockProductionRecords);
    assert.equal(JSON.stringify(mockProductionRecords), before);
  });
});