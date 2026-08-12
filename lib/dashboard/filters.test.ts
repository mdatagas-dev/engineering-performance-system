import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";
import {
  applyFilters,
  clampDateRange,
  EMPTY_FILTERS,
  isPresetActive,
  presetLastNDays,
  presetMonthToDate,
  presetToday,
  uniqueAreas,
  uniqueDates,
  uniqueModels,
} from "./filters";

const FIXED_NOW = new Date(Date.UTC(2026, 7, 12, 9, 30)); // 2026-08-12

function mk(over: Partial<MockProductionRecord>): MockProductionRecord {
  return {
    id: "x",
    date: "2026-08-12",
    model: "M",
    shift: "1",
    area: { id: "a1", name: "Area A", lineCode: "L1" },
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
    totalSetup: 0,
    workingHour: 0,
    totalSetupPacking: 0,
    workingHourPacking: 0,
    status: "DRAFT" as MockProductionRecord["status"],
    version: 1,
    createdByName: "x",
    gapUph: 0,
    gapHc: 2,
    gapOp: 40,
    upph: 2.81,
    ...over,
  };
}

describe("applyFilters", () => {
  it("filter kosong mengembalikan semua record (dan tidak mengubah urutan)", () => {
    const out = applyFilters(mockProductionRecords, EMPTY_FILTERS);
    assert.equal(out.length, mockProductionRecords.length);
    assert.deepEqual(out.map((r) => r.id), mockProductionRecords.map((r) => r.id));
  });

  it("rentang tanggal inklusif di kedua ujung", () => {
    const d1 = applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, from: "2026-08-11", to: "2026-08-12" });
    assert.equal(d1.length, 4); // semua seed di dalam rentang

    const d2 = applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, from: "2026-08-12", to: "2026-08-12" });
    assert.equal(d2.length, 3);
    assert.ok(d2.every((r) => r.date === "2026-08-12"));

    const d3 = applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, to: "2026-08-11" });
    assert.equal(d3.length, 1);
    assert.ok(d3.every((r) => r.date === "2026-08-11"));
  });

  it("filter model hanya menyisakan model itu", () => {
    const out = applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, model: "LV-3000" });
    assert.equal(out.length, 2);
    assert.ok(out.every((r) => r.model === "LV-3000"));
  });

  it("filter area mencocokkan nama area; null tidak cocok dengan nilai apa pun", () => {
    const out = applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, area: "Machining Line 1" });
    assert.equal(out.length, mockProductionRecords.length);
    assert.equal(applyFilters(mockProductionRecords, { ...EMPTY_FILTERS, area: "Area Lain" }).length, 0);

    const withNullArea = [mk({ id: "n", area: null })];
    assert.equal(applyFilters(withNullArea, { ...EMPTY_FILTERS, area: "Machining Line 1" }).length, 0);
    assert.equal(applyFilters(withNullArea, EMPTY_FILTERS).length, 1);
  });

  it("kombinasi filter diterapkan sekaligus (sebelum grup)", () => {
    const out = applyFilters(mockProductionRecords, {
      from: "2026-08-12",
      to: "2026-08-12",
      model: "LV-3000",
      area: null,
    });
    assert.equal(out.length, 2);
    assert.ok(out.every((r) => r.date === "2026-08-12" && r.model === "LV-3000"));
  });
});

describe("daftar unik", () => {
  it("uniqueDates terurut naik", () => {
    assert.deepEqual(uniqueDates(mockProductionRecords), ["2026-08-11", "2026-08-12"]);
  });

  it("uniqueModels terurut, unik", () => {
    assert.deepEqual(uniqueModels(mockProductionRecords), ["LV-3000", "LV-5000", "LV-8000"]);
  });

  it("uniqueAreas mengambil nama area, mengabaikan record tanpa area", () => {
    const rows = [...mockProductionRecords, mk({ id: "n", area: null }), mk({ id: "m", area: { id: "x", name: "Area B", lineCode: null } })];
    assert.deepEqual(uniqueAreas(rows), ["Area B", "Machining Line 1"]);
    assert.deepEqual(uniqueAreas([mk({ id: "n", area: null })]), []);
  });
});

describe("clampDateRange", () => {
  it("dari > sampai → ditukar supaya valid", () => {
    assert.deepEqual(clampDateRange("2026-08-15", "2026-08-10"), { from: "2026-08-10", to: "2026-08-15" });
    assert.deepEqual(clampDateRange("2026-08-10", "2026-08-15"), { from: "2026-08-10", to: "2026-08-15" });
  });

  it("nilai null (kosong) dibiarkan, sisi lain tetap", () => {
    assert.deepEqual(clampDateRange(null, "2026-08-12"), { from: null, to: "2026-08-12" });
    assert.deepEqual(clampDateRange("2026-08-12", null), { from: "2026-08-12", to: null });
    assert.deepEqual(clampDateRange(null, null), { from: null, to: null });
  });
});

describe("preset chip cepat", () => {
  it("Hari Ini = dari = sampai = hari ini", () => {
    assert.deepEqual(presetToday(FIXED_NOW), { from: "2026-08-12", to: "2026-08-12" });
  });

  it("Minggu Ini = 7 hari terakhir termasuk hari ini", () => {
    assert.deepEqual(presetLastNDays(7, FIXED_NOW), { from: "2026-08-06", to: "2026-08-12" });
  });

  it("Bulan Ini = tanggal 1 s.d. hari ini", () => {
    assert.deepEqual(presetMonthToDate(FIXED_NOW), { from: "2026-08-01", to: "2026-08-12" });
  });

  it("isPresetActive: rentang tanggal cocok; model/area tidak memengaruhi", () => {
    assert.equal(isPresetActive({ from: "2026-08-12", to: "2026-08-12" }, presetToday(FIXED_NOW)), true);
    assert.equal(
      isPresetActive({ from: "2026-08-12", to: "2026-08-12" }, presetToday(FIXED_NOW)),
      true
    );
    assert.equal(isPresetActive({ from: "2026-08-11", to: "2026-08-12" }, presetToday(FIXED_NOW)), false);
    assert.equal(isPresetActive({ from: null, to: null }, presetToday(FIXED_NOW)), false);
  });
});