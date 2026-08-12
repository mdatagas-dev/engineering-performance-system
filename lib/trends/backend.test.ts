import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";
import { buildTrendPoints, buildCompareResponse, summarizeSums, TREND_SUM_FIELDS, type TrendRawRow, type TrendAggregateResult } from "./backend";
import { comparePeriods, compareWindowSums, metricsFromSums, windowDays } from "./compare";

function row(dateIso: string, sums: Partial<Record<(typeof TREND_SUM_FIELDS)[number], number | null>>, shift?: string | null): TrendRawRow {
  return { date: new Date(`${dateIso}T00:00:00Z`), ...(shift !== undefined ? { shift } : {}), _sum: sums };
}

function aggregateOf(records: MockProductionRecord[]): TrendAggregateResult {
  const sums: TrendAggregateResult["_sum"] = {};
  const acc: Partial<Record<(typeof TREND_SUM_FIELDS)[number], number>> = {};
  for (const r of records) {
    for (const f of TREND_SUM_FIELDS) acc[f] = (acc[f] ?? 0) + r[f];
  }
  for (const f of TREND_SUM_FIELDS) sums![f] = acc[f] ?? 0;
  return { _sum: sums, _count: { _all: records.length } };
}

describe("buildTrendPoints", () => {
  it("Σ per tanggal + urut asc + date YYYY-MM-DD (kontrak buildSeries)", () => {
    const points = buildTrendPoints([
      row("2026-08-12", { uphResult: 90, outputProd: 1000, hcActual: 32, hcStandard: 30, totalSetup: 12 }),
      row("2026-08-11", { uphResult: 80, outputProd: 640, hcActual: 30, hcStandard: 28, totalSetup: 15 }),
    ]);
    assert.deepEqual(points.map((p) => p.date), ["2026-08-11", "2026-08-12"]);
    assert.deepEqual(points[1], {
      date: "2026-08-12",
      uphResult: 90,
      outputProd: 1000,
      hcActual: 32,
      hcStandard: 30,
      totalSetup: 12,
    });
  });

  it("null-safe: _sum null / field null → 0 (kolom NOT NULL; coerce, bukan null)", () => {
    const points = buildTrendPoints([
      row("2026-08-12", { uphResult: null, outputProd: null, hcActual: null, hcStandard: null, totalSetup: null }),
      row("2026-08-11", { uphResult: 1, outputProd: 2, hcActual: 3, hcStandard: 4, totalSetup: 5 }),
    ]);
    assert.deepEqual(points[0], {
      date: "2026-08-11",
      uphResult: 1,
      outputProd: 2,
      hcActual: 3,
      hcStandard: 4,
      totalSetup: 5,
    });
    assert.deepEqual(points[1], {
      date: "2026-08-12",
      uphResult: 0,
      outputProd: 0,
      hcActual: 0,
      hcStandard: 0,
      totalSetup: 0,
    });
  });

  it("input kosong → []", () => {
    assert.deepEqual(buildTrendPoints([]), []);
  });

  it("includeShift: menambah shift hanya bila diminta (default tanpa shift)", () => {
    const r = row("2026-08-12", { uphResult: 1 }, "1");
    const plain = buildTrendPoints([r]);
    assert.deepEqual([...Object.keys(plain[0])].sort(), [
      "date",
      "hcActual",
      "hcStandard",
      "outputProd",
      "totalSetup",
      "uphResult",
    ]);
    const withShift = buildTrendPoints([r], true);
    assert.equal(withShift[0].shift, "1");
    const nullShift = buildTrendPoints([row("2026-08-12", { uphResult: 1 }, null)], true);
    assert.equal(nullShift[0].shift, null);
  });
});

describe("summarizeSums", () => {
  it("undefined → semua 0; sebagian null → 0 per field", () => {
    assert.deepEqual(summarizeSums(undefined), {
      uphResult: 0,
      outputProd: 0,
      hcActual: 0,
      hcStandard: 0,
      totalSetup: 0,
    });
    assert.equal(summarizeSums({ uphResult: 5, hcActual: null }).hcActual, 0);
  });
});

describe("windowDays (ekspor ulang utk API)", () => {
  it("satu hari = 1; rentang inklusif", () => {
    assert.equal(windowDays("2026-08-12", "2026-08-12"), 1);
    assert.equal(windowDays("2026-08-06", "2026-08-12"), 7);
    assert.equal(windowDays("2026-03-01", "2026-03-31"), 31);
  });
});

describe("metricsFromSums", () => {
  it("formula SAMA metricsFor: avgUpph ÷ Σhc, avgHc ÷ count; guard /0 → null", () => {
    assert.deepEqual(metricsFromSums({ uphResult: 277, outputProd: 1682, hcActual: 88, hcStandard: 85, totalSetup: 30 }, 3), {
      totalOutput: 1682,
      avgUpph: 3.15,
      totalSetup: 30,
      avgHc: 29.33,
    });
    assert.deepEqual(metricsFromSums({ uphResult: 0, outputProd: 0, hcActual: 0, hcStandard: 0, totalSetup: 0 }, 0), {
      totalOutput: 0,
      avgUpph: null,
      totalSetup: 0,
      avgHc: null,
    });
  });
});

describe("buildCompareResponse (endpoint) vs comparePeriods (frontend)", () => {
  it("agregat dari mock → HASIL IDENTIK comparePeriods (konsistensi mock→API)", () => {
    const from = "2026-08-06";
    const to = "2026-08-12";
    const current = mockProductionRecords.filter((r) => r.date >= from && r.date <= to);
    const previous = mockProductionRecords.filter((r) => r.date >= "2026-07-30" && r.date <= "2026-08-05");
    const api = buildCompareResponse(aggregateOf(current), aggregateOf(previous), from, to);
    const frontend = comparePeriods(mockProductionRecords, from, to);
    assert.deepEqual(api, frontend);
    assert.equal(api.windowDays, 7);
    assert.equal(api.previousFrom, "2026-07-30");
    assert.equal(api.previousTo, "2026-08-05");
  });

  it("window 1 hari (dari route: from=to) → jendela sebelumnya = kemarin", () => {
    const api = buildCompareResponse(
      aggregateOf(mockProductionRecords.filter((r) => r.date === "2026-08-12")),
      aggregateOf(mockProductionRecords.filter((r) => r.date === "2026-08-11")),
      "2026-08-12",
      "2026-08-12"
    );
    assert.equal(api.windowDays, 1);
    assert.equal(api.previousFrom, "2026-08-11");
    assert.equal(api.current.totalOutput, 1682);
    assert.equal(api.previous.avgUpph, 2.67);
    assert.deepEqual(api.deltas.output, { absolute: 1042, percent: 162.81 });
  });

  it("jendela sebelumnya kosong (count 0) → avgUpph/avgHc null & delta persen null", () => {
    const api = buildCompareResponse(
      aggregateOf(mockProductionRecords.filter((r) => r.date === "2026-08-12")),
      { _sum: null, _count: 0 },
      "2026-08-12",
      "2026-08-12"
    );
    assert.equal(api.previous.totalOutput, 0);
    assert.equal(api.previous.avgUpph, null);
    assert.equal(api.previous.avgHc, null);
    assert.deepEqual(api.deltas.output, { absolute: 1682, percent: null });
    assert.deepEqual(api.deltas.upph, { absolute: null, percent: null });
  });

  it("konsisten dgn compareWindowSums untuk input null-safe", () => {
    const api = buildCompareResponse(
      { _sum: { uphResult: null, outputProd: 640, hcActual: 30, hcStandard: null, totalSetup: 15 }, _count: 1 },
      { _sum: { uphResult: 1, outputProd: 0, hcActual: 0, hcStandard: 1, totalSetup: 0 }, _count: 1 },
      "2026-08-11",
      "2026-08-11"
    );
    const direct = compareWindowSums(
      { sums: summarizeSums({ uphResult: null, outputProd: 640, hcActual: 30, hcStandard: null, totalSetup: 15 }), count: 1 },
      { sums: summarizeSums({ uphResult: 1, outputProd: 0, hcActual: 0, hcStandard: 1, totalSetup: 0 }), count: 1 },
      "2026-08-11",
      "2026-08-11"
    );
    assert.deepEqual(api, direct);
    assert.equal(api.current.avgUpph, 0); // Σuph = 0 tapi Σhc = 30 → 0 (bukan null)
    assert.equal(api.previous.avgUpph, null); // Σhc = 0 → null
    assert.deepEqual(api.deltas.upph, { absolute: null, percent: null });
    assert.deepEqual(api.deltas.output, { absolute: 640, percent: null });
  });
});