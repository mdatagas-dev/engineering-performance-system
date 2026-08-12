import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDateLong, formatDateShort, formatDecimal, formatNumber } from "./format";

describe("formatDecimal — 2 desimal tetap (GAP & UPPH)", () => {
  it("contoh PRD: UPPH 2.81 → '2,81' (id-ID, koma desimal)", () => {
    assert.equal(formatDecimal(2.81), "2,81");
  });

  it("2 desimal selalu tampil", () => {
    assert.equal(formatDecimal(2.5), "2,50");
    assert.equal(formatDecimal(0), "0,00");
    assert.equal(formatDecimal(-20), "-20,00");
  });

  it("null → '—'", () => {
    assert.equal(formatDecimal(null), "—");
  });

  it("tidak membulatkan ulang nilai yang sudah dihitung calculate: 90 ÷ 32 = 2.8125 → round2 → 2.81", () => {
    assert.equal(formatDecimal(2.8125), "2,81");
  });

  it("pemisah ribuan id-ID pakai titik", () => {
    assert.equal(formatDecimal(1002), "1.002,00");
  });
});

describe("formatNumber — 0–2 desimal (UPH, HC, Plan, Output, Setup, WH)", () => {
  it("integer tampil tanpa desimal berlebih", () => {
    assert.equal(formatNumber(90), "90");
    assert.equal(formatNumber(1000), "1.000");
    assert.equal(formatNumber(0), "0");
  });

  it("desimal 1–2 digit dipertahankan (tanpa pembulatan ulang)", () => {
    assert.equal(formatNumber(90.5), "90,5");
    assert.equal(formatNumber(90.25), "90,25");
  });

  it("null → '—'", () => {
    assert.equal(formatNumber(null), "—");
  });
});

describe("formatDateShort / formatDateLong — label tanggal id-ID", () => {
  it("Y-M-D → '12 Agustus 2026'", () => {
    assert.equal(formatDateShort("2026-08-12"), "12 Agustus 2026");
  });

  it("long menyertakan hari", () => {
    assert.ok(formatDateLong("2026-08-12").includes("Agustus 2026"));
    assert.ok(formatDateLong("2026-08-12").length > formatDateShort("2026-08-12").length);
  });

  it("string tak valid dikembalikan apa adanya", () => {
    assert.equal(formatDateShort("bukan-tanggal"), "bukan-tanggal");
    assert.equal(formatDateLong(""), "");
  });
});