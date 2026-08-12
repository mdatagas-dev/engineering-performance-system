// Test integrasi pure lintas layer records: parse → calculate → recompute →
// totals (TASK integrasi mesin kalkulasi + service gap/upph + contract
// endpoints). Tanpa DB — semua fungsi murni.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCreateBody, buildCreateData, buildCreateSnapshot } from "./create";
import { buildEditUpdate } from "./edit";
import { calculateCalculated } from "./calculate";
import { buildRecordTotals, RECORD_TOTAL_SUM, type RecordTotalInput } from "./totals";
import { RecordStatus } from "@/app/generated/prisma/enums";

const ACTOR = "user-1";

function parseOk(body: unknown) {
  const r = parseCreateBody(body);
  if (!r.ok) throw new Error(r.message);
  return r.data;
}

const row = (over: Record<string, unknown> = {}) => ({
  date: "2026-08-12",
  model: "LV-3000",
  shift: "1",
  areaId: null,
  uphTarget: 90,
  uphResult: 90,
  hcStandard: 30,
  hcActual: 32,
  plan: 960,
  outputProd: 1000,
  totalSetup: 10,
  workingHour: 8,
  totalSetupPacking: 5,
  workingHourPacking: 2,
  ...over,
});

describe("rantai create → calculate (kasus PRD per record)", () => {
  it("(90,90) → gapUph 0; (30,32) → gapHc 2; (960,1000) → gapOp 40; upph 90÷32 = 2.81", () => {
    const data = buildCreateData(parseOk(row()), ACTOR);
    assert.equal(data.gapUph, 0);
    assert.equal(data.gapHc, 2);
    assert.equal(data.gapOp, 40);
    assert.equal(data.upph, 2.81);
  });

  it("kasus kedua: (95,92) target 95 → gapUph −3; hc (35,40) → gapHc 5; (1000,1180) → gapOp 180", () => {
    const data = buildCreateData(
      parseOk(row({ uphTarget: 95, uphResult: 92, hcStandard: 35, hcActual: 40, plan: 1000, outputProd: 1180 })),
      ACTOR
    );
    assert.equal(data.gapUph, -3);
    assert.equal(data.gapHc, 5);
    assert.equal(data.gapOp, 180);
    assert.equal(data.upph, 2.3);
  });

  it("hcActual 0 → upph null di mesin, disimpan 0 (ponytail)", () => {
    const calc = calculateCalculated({ uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 0, plan: 960, outputProd: 1000 });
    assert.equal(calc.upph, null);
    const data = buildCreateData(parseOk(row({ hcActual: 0 })), ACTOR);
    assert.equal(data.upph, 0);
  });
});

describe("rantai edit → recompute (ubah raw → 4 calculated dihitung ulang)", () => {
  const CURRENT = {
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
  };

  it("ubah outputProd → gapOp berubah, lainnya tetap", () => {
    const { after } = buildEditUpdate(CURRENT, { outputProd: 1100 });
    assert.equal(after.gapOp, 140);
    assert.equal(after.gapUph, 0);
    assert.equal(after.upph, 2.81);
  });

  it("ubah uphResult + hcActual → gapUph, gapHc, upph semuanya berubah", () => {
    const { after } = buildEditUpdate(CURRENT, { uphResult: 95, hcActual: 40 });
    assert.equal(after.gapUph, 5);
    assert.equal(after.gapHc, 10);
    assert.equal(after.gapOp, 40);
    assert.equal(after.upph, 2.38);
  });

  it("ubah field non-kalkulasi (model) → calculated tidak disentuh", () => {
    const { updates } = buildEditUpdate(CURRENT, { model: "M-2" });
    assert.equal(updates.gapUph, undefined);
    assert.equal(updates.gapOp, undefined);
  });
});

describe("service total (TASK service-gap-upph): grup (date, shift) dari groupBy", () => {
  const groupBy2Rows = (): RecordTotalInput[] => [
    { date: new Date("2026-08-12T00:00:00.000Z"), shift: "1", sums: { uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 32, plan: 480, outputProd: 501 } },
    { date: new Date("2026-08-12T00:00:00.000Z"), shift: "1", sums: { uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 32, plan: 480, outputProd: 501 } },
  ];

  it("Σoutput 1002 − Σplan 960 → gapOp 42; upph Σresult÷Σhc = 180÷64 = 2.81", () => {
    const [t] = buildRecordTotals(groupBy2Rows());
    assert.equal(t.outputProd, 1002);
    assert.equal(t.plan, 960);
    assert.equal(t.gapOp, 42);
    assert.equal(t.uphResult, 180);
    assert.equal(t.hcActual, 64);
    assert.equal(t.upph, 2.81);
    assert.equal(t.gapUph, 0);
    assert.equal(t.gapHc, 4);
  });

  it("RECORD_TOTAL_SUM = tepat 10 field numerik yang dijumlahkan (bukan gap/upph)", () => {
    const keys = Object.keys(RECORD_TOTAL_SUM as Record<string, boolean>);
    assert.deepEqual(keys.sort(), [
      "hcActual", "hcStandard", "outputProd", "plan", "totalSetup",
      "totalSetupPacking", "uphResult", "uphTarget", "workingHour",
      "workingHourPacking",
    ].sort());
  });
});

describe("contract endpoint daftar + total (GET /api/records?totals=true)", () => {
  it("shape respons: { items, total, page, perPage, totals? } — totals array per (date, shift)", () => {
    const totals = buildRecordTotals([
      { date: new Date("2026-08-12T00:00:00.000Z"), shift: "1", sums: {} },
      { date: new Date("2026-08-12T00:00:00.000Z"), shift: "2", sums: {} },
    ]);
    const response = {
      items: [],
      total: 0,
      page: 1,
      perPage: 20,
      totals,
    };
    assert.deepEqual(Object.keys(response), ["items", "total", "page", "perPage", "totals"]);
    assert.equal(response.totals.length, 2);
    assert.deepEqual(
      response.totals.map((t) => [t.date, t.shift]),
      [
        ["2026-08-12", "1"],
        ["2026-08-12", "2"],
      ]
    );
    // baris total selalu punya 14 kolom: 10 sum + 4 derived
    assert.deepEqual(Object.keys(response.totals[0]).sort(), [
      "gapHc", "gapOp", "gapUph", "hcActual", "hcStandard", "outputProd", "plan",
      "shift", "date", "totalSetup", "totalSetupPacking", "uphResult", "uphTarget",
      "upph", "workingHour", "workingHourPacking",
    ].sort());
  });

  it("snapshot versi 1 = state data (shape sama backfill: date ISO, raws, calcs, DRAFT, version 1)", () => {
    const snap = buildCreateSnapshot(parseOk(row())) as Record<string, unknown>;
    assert.equal(snap.version, 1);
    assert.equal(snap.status, RecordStatus.DRAFT);
    assert.equal(snap.date, "2026-08-12T00:00:00.000Z");
    assert.equal(snap.upph, 2.81);
  });
});