import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectDelimiter, parseCsv, MAX_CSV_COLUMNS } from "./parse";

const HEADER = "Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing";
const FULL_HEADER = "Date;Model;Shift;UPH Target;UPH Result;GAP UPH;HC Standard;HC Actual;GAP HC;Plan;Output Prod;GAP OP;UPPH;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing";

describe("detectDelimiter", () => {
  it("lebih banyak ';' → titik koma (standar Excel Indonesia)", () => {
    assert.equal(detectDelimiter("a;b;c,d"), ";");
  });
  it("lebih banyak ',' → koma", () => {
    assert.equal(detectDelimiter("a,b,c;d"), ",");
  });
  it("seri / tidak ada → ';'", () => {
    assert.equal(detectDelimiter("a;b,c"), ";");
    assert.equal(detectDelimiter("abc"), ";");
  });
});

describe("parseCsv", () => {
  it("BOM + header + 1 baris → rows, delimiter ';', nilai terpetakan", () => {
    const result = parseCsv(`\uFEFF${HEADER}\n2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2`);
    assert.equal(result.delimiter, ";");
    assert.equal(result.headerIndex, 1);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].index, 2);
    assert.equal(result.rows[0].values.date, "2026-08-12");
    assert.equal(result.rows[0].values.model, "LV-3000");
    assert.equal(result.rows[0].values.outputProd, "1000");
    assert.equal(result.rows[0].values.totalSetupPacking, "6");
    assert.deepEqual(result.unknownColumns, []);
    assert.deepEqual(result.warnings, []);
  });

  it("CRLF juga dipisah; nilai di-trim", () => {
    const result = parseCsv(`${HEADER}\r\n 2026-08-12 ; LV-3000 ; 1 ;90;90;30;32;960;1000;12;8;6;2 \r\n`);
    assert.equal(result.rows[0].values.model, "LV-3000");
  });

  it("baris kosong dilewati; index tetap nomor baris asli", () => {
    const result = parseCsv(`${HEADER}\n\n2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2\n\n\n2026-08-13;LV-4000;1;80;85;28;29;800;832;10;8;5;2`);
    assert.equal(result.rows.length, 2);
    assert.deepEqual(result.rows.map((r) => r.index), [3, 6]);
  });

  it("delimiter koma dipilih bila header lebih banyak koma", () => {
    const result = parseCsv("Date,Model,Shift,UPH Target\n2026-08-12,LV-3000,1,90");
    assert.equal(result.delimiter, ",");
    assert.equal(result.rows[0].values.date, "2026-08-12");
    assert.equal(result.rows[0].values.uphTarget, "90");
  });

  it("alias header Inggris/Indonesia dikenali (case & spasi insensitive)", () => {
    const result = parseCsv("tanggal,model,shift,uph target,hasil uph,HC Standard\n2026-08-12,LV-3000,1,90,90,30");
    assert.equal(result.rows[0].values.uphTarget, "90");
    assert.equal(result.rows[0].values.uphResult, "90");
    assert.equal(result.rows[0].values.hcStandard, "30");
  });

  it("kolom tak dikenal → unknownColumns + warning; nilai diabaikan", () => {
    const result = parseCsv(`${HEADER};SOMETHING_EXTRA\n2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2;x`);
    assert.deepEqual(result.unknownColumns, ["SOMETHING_EXTRA"]);
    assert.ok(result.warnings.some((w) => w.includes("Kolom tidak dikenali")));
    assert.equal((result.rows[0].values as Record<string, string>).SOMETHING_EXTRA, undefined);
  });

  it("terlalu banyak kolom → warning, kolom ekstra diabaikan", () => {
    const extra = Array.from({ length: MAX_CSV_COLUMNS + 3 }, () => "1").join(";");
    const result = parseCsv(`${HEADER}\n${extra}`);
    assert.equal(result.rows[0].cells.length, MAX_CSV_COLUMNS + 3);
    assert.ok(result.warnings.some((w) => w.includes("kolom ekstra diabaikan")));
  });

  it("header tak dikenal → fallback pemetaan urutan template", () => {
    const result = parseCsv("K1;K2;K3;K4;K5;K6;K7;K8;K9;K10;K11;K12;K13\n2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2");
    assert.equal(result.rows[0].values.date, "2026-08-12");
    assert.equal(result.rows[0].values.uphTarget, "90");
    assert.equal(result.rows[0].values.workingHourPacking, "2");
    assert.ok(result.warnings.some((w) => w.includes("urutan template")));
  });

  it("kolom calculated (GAP/UPPH) dikenali tapi tidak masuk nilai input", () => {
    const result = parseCsv(`${FULL_HEADER}\n2026-08-12;LV-3000;1;90;90;0;30;32;2;960;1000;40;2.81;12;8;6;2`);
    const values = result.rows[0].values as Record<string, string | undefined>;
    assert.equal(values.gapUph, undefined);
    assert.equal(values.gapOp, undefined);
    assert.equal(values.upph, undefined);
    assert.equal(result.rows[0].values.outputProd, "1000");
  });

  it("file kosong / tanpa baris data → rows kosong + warning", () => {
    const empty = parseCsv("");
    assert.equal(empty.rows.length, 0);
    assert.ok(empty.warnings.some((w) => w.includes("File kosong")));
    const headerOnly = parseCsv(`${HEADER}`);
    assert.equal(headerOnly.rows.length, 0);
  });

  it("nilai terkutip TIDAK didukung — ';' di dalam nilai memecah sel (limitasi didokumentasikan)", () => {
    const result = parseCsv(`${HEADER}\n2026-08-12;"LV-3000";1;90;90;30;32;960;1000;12;8;6;2`);
    assert.equal(result.rows[0].cells[1], '"LV-3000"');
  });
});