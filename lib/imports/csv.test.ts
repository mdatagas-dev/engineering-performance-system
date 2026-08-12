import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCsv, buildTemplateCsv, CSV_SEPARATOR, type CsvRecord } from "./csv";
import { CSV_COLUMNS } from "./columns";
import { calculateCalculated } from "@/lib/records/calculate";

const RECORD: CsvRecord = {
  date: "2026-08-12",
  model: "LV-3000",
  shift: "1",
  uphTarget: 90,
  uphResult: 90,
  gapUph: 0,
  hcStandard: 30,
  hcActual: 32,
  gapHc: 2,
  plan: 960,
  outputProd: 1000,
  gapOp: 40,
  upph: 2.81,
  totalSetup: 12,
  workingHour: 8,
  totalSetupPacking: 6,
  workingHourPacking: 2,
};

describe("buildCsv", () => {
  it("header 17 kolom label persis PRD, dipisah ';', diawali BOM", () => {
    const csv = buildCsv([RECORD]);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    const lines = csv.slice(1).split("\n");
    const expected = [
      "Date",
      "Model",
      "Shift",
      "UPH Target",
      "UPH Result",
      "GAP UPH",
      "HC Standard",
      "HC Actual",
      "GAP HC",
      "Plan",
      "Output Prod",
      "GAP OP",
      "UPPH",
      "Total Setup",
      "Working Hour",
      "Total Setup Packing",
      "Working Hour Packing",
    ].join(CSV_SEPARATOR);
    assert.equal(lines[0], expected);
    assert.equal(CSV_COLUMNS.length, 17);
  });

  it("nilai angka: desimal titik, tanpa ribuan (Excel baca angka)", () => {
    const csv = buildCsv([RECORD]);
    const line = csv.slice(1).split("\n")[1];
    assert.equal(line, "2026-08-12;LV-3000;1;90;90;0;30;32;2;960;1000;40;2.81;12;8;6;2");
  });

  it("GAP & UPPH dihitung ulang via calculateCalculated (2 desimal titik)", () => {
    const r: CsvRecord = {
      ...RECORD,
      uphTarget: 90,
      uphResult: 92.5,
      hcStandard: 30,
      hcActual: 33,
      plan: 960,
      outputProd: 1000,
      gapUph: 0,
      gapHc: 0,
      gapOp: 0,
      upph: null,
    };
    const calc = calculateCalculated({ uphTarget: 90, uphResult: 92.5, hcStandard: 30, hcActual: 33, plan: 960, outputProd: 1000 });
    r.gapUph = calc.gapUph;
    r.gapHc = calc.gapHc;
    r.gapOp = calc.gapOp;
    r.upph = calc.upph;
    const line = buildCsv([r]).slice(1).split("\n")[1];
    assert.equal(line, "2026-08-12;LV-3000;1;90;92.5;2.5;30;33;3;960;1000;40;2.8;12;8;6;2");
    assert.equal(calc.upph, 2.8);
  });

  it("shift null & UPPH null → sel kosong", () => {
    const r: CsvRecord = { ...RECORD, shift: null, upph: null };
    const line = buildCsv([r]).slice(1).split("\n")[1];
    assert.ok(line.startsWith("2026-08-12;LV-3000;;90"));
    assert.ok(line.includes(";;12;8;6;2"));
  });

  it("beberapa baris → 1 header + N baris data", () => {
    const csv = buildCsv([RECORD, { ...RECORD, model: "LV-4000" }]);
    const lines = csv.slice(1).split("\n");
    assert.equal(lines.length, 3);
    assert.ok(lines[2].includes("LV-4000"));
  });
});

describe("buildTemplateCsv", () => {
  it("header 13 kolom INPUT SAJA (tanpa 4 kolom calculated)", () => {
    const csv = buildTemplateCsv();
    assert.equal(csv.charCodeAt(0), 0xfeff);
    const header = csv.slice(1).split("\n")[0].split(CSV_SEPARATOR);
    assert.equal(header.length, 13);
    assert.deepEqual(header, [
      "Date",
      "Model",
      "Shift",
      "UPH Target",
      "UPH Result",
      "HC Standard",
      "HC Actual",
      "Plan",
      "Output Prod",
      "Total Setup",
      "Working Hour",
      "Total Setup Packing",
      "Working Hour Packing",
    ]);
    assert.ok(!header.includes("GAP UPH"));
    assert.ok(!header.includes("UPPH"));
  });

  it("1 baris contoh konsisten dgn calculateCalculated (90/90 → GAP 0)", () => {
    const csv = buildTemplateCsv();
    const lines = csv.slice(1).split("\n");
    assert.equal(lines.length, 2);
    assert.equal(lines[1], "2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2");
    const calc = calculateCalculated({ uphTarget: 90, uphResult: 90, hcStandard: 30, hcActual: 32, plan: 960, outputProd: 1000 });
    assert.equal(calc.gapUph, 0);
    assert.equal(calc.gapHc, 2);
    assert.equal(calc.gapOp, 40);
    assert.equal(calc.upph, 2.81);
  });

  it("CSV injection: sel berawalan =/+/-/@/tab dikunci prefix apostrof", () => {
    const r = {
      date: "2026-08-12",
      model: '=HYPERLINK("http://evil.example","x")',
      shift: null,
      uphTarget: 90, uphResult: 90, gapUph: 0,
      hcStandard: 30, hcActual: 32, gapHc: 2,
      plan: 960, outputProd: 1000, gapOp: 40, upph: 2.81,
      totalSetup: 12, workingHour: 8, totalSetupPacking: 6, workingHourPacking: 2,
    };
    const line = buildCsv([r]).slice(1).split("\n")[1];
    assert.ok(line.includes(`'=HYPERLINK`), "prefix apostrof pada sel berawalan =");
  });

  it("sel mengandung pemisah/kutip/baris baru dikutip RFC 4180", () => {
    const r = {
      date: "2026-08-12",
      model: 'LV-3000; DROP TABLE x',
      shift: 'A"B',
      uphTarget: 90, uphResult: 90, gapUph: 0,
      hcStandard: 30, hcActual: 32, gapHc: 2,
      plan: 960, outputProd: 1000, gapOp: 40, upph: 2.81,
      totalSetup: 12, workingHour: 8, totalSetupPacking: 6, workingHourPacking: 2,
    };
    const line = buildCsv([r]).slice(1).split("\n")[1];
    assert.ok(line.includes('"LV-3000; DROP TABLE x"'), "sel dgn pemisah dikutip");
    assert.ok(line.includes('"A""B"'), "kutip ganda didobel");
  });
});