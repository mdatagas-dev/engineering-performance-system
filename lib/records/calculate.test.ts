// Formula "versioned": GAP UPH = Result − Target, GAP HC = Actual − Standard,
// GAP OP = Output − Plan, UPPH = Result ÷ Actual. Perilaku round2 & formula
// DIKUNCI oleh test di file ini (+ totals.test.ts, mocks/records.test.ts) —
// jangan ubah lib/records/calculate.ts tanpa menyesuaikan test di sini.
//
// KEPUTUSAN AUDIT PEMBULATAN (TASK buat-modul-kalkulasi-gap-dan-upph):
//  - round2 = Math.round(n*100)/100 → HALF-UP pada nilai skala-100.
//  - Excel ROUND didefinisikan half-away-from-zero untuk desimal eksak, tapi
//    operasinya di atas representasi biner (double): literal 2.675 tersimpan
//    sebagai 2.67499…, sehingga utk semua input NON-NEGATIF (validasi frontend
//    & fields.ts memaksa ≥ 0) Math.round menghasilkan nilai yang sama dengan
//    Excel ROUND. Kasus tepi float (1.005 → 1.00) juga identik dengan
//    Excel ROUND(1.005,2) = 1.00 — artefak representasi, bukan bug.
//  - Kesimpulan: calculate.ts SUDAH setara Excel utk domain input yang valid;
//    tidak ada perubahan round2 (menghindari kecocokan angka yang dibuat-buat
//    via toFixed yang justru lebih rawan float noise). Tidak ada runtime
//    versioning — formula dikunci lewat test.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCalculated, round2 } from "./calculate";

describe("calculateCalculated — formula PRD 1:1 Excel", () => {
  it("contoh PRD: UPPH = UPH Result ÷ HC Actual, 90 ÷ 32 = 2.8125 → 2.81", () => {
    const r = calculateCalculated({
      uphTarget: 100,
      uphResult: 90,
      hcStandard: 30,
      hcActual: 32,
      plan: 900,
      outputProd: 950,
    });
    assert.equal(r.upph, 2.81);
  });

  it("gap: GAP UPH = Result − Target, GAP HC = Actual − Standard, GAP OP = Output − Plan", () => {
    const r = calculateCalculated({
      uphTarget: 80,
      uphResult: 100,
      hcStandard: 45,
      hcActual: 50,
      plan: 800,
      outputProd: 900,
    });
    assert.deepEqual(r, { gapUph: 20, gapHc: 5, gapOp: 100, upph: 2 });
  });

  it("gap negatif bila result di bawah target (dok: negatif valid, bukan error)", () => {
    const r = calculateCalculated({
      uphTarget: 80,
      uphResult: 70,
      hcStandard: 40,
      hcActual: 42,
      plan: 1000,
      outputProd: 980,
    });
    assert.deepEqual(r, { gapUph: -10, gapHc: 2, gapOp: -20, upph: 1.67 });
  });

  it("UPPH dibulatkan 2 desimal (100 ÷ 3 = 33.33)", () => {
    const r = calculateCalculated({
      uphTarget: 0,
      uphResult: 100,
      hcStandard: 0,
      hcActual: 3,
      plan: 0,
      outputProd: 0,
    });
    assert.equal(r.upph, 33.33);
  });

  it("guard pembagian nol: HC Actual = 0 → upph null", () => {
    const r = calculateCalculated({
      uphTarget: 80,
      uphResult: 90,
      hcStandard: 40,
      hcActual: 0,
      plan: 800,
      outputProd: 900,
    });
    assert.equal(r.upph, null);
    assert.equal(r.gapUph, 10);
  });

  it("angka besar (ribuan unit) tetap stabil & 2 desimal", () => {
    const r = calculateCalculated({
      uphTarget: 150,
      uphResult: 149.525,
      hcStandard: 120,
      hcActual: 124.5,
      plan: 2_000_000,
      outputProd: 2_000_042.005,
    });
    assert.equal(r.gapUph, -0.47); // −0.475 → half-up −0.47
    assert.equal(r.gapOp, 42);
    assert.equal(r.upph, 1.2);
  });
});

describe("pembulatan tepi round2 vs Excel ROUND", () => {
  it("0.005 → 0.01 (Excel ROUND(0.005,2) = 0.01)", () => {
    assert.equal(round2(0.005), 0.01);
  });

  it("2.675 → 2.68 (skala-100 = 267.5 eksak → half-up naik)", () => {
    assert.equal(round2(2.675), 2.68);
  });

  it("1.005 → 1.00 (float 1.005 = 1.00499…; sama dgn Excel ROUND(1.005,2) = 1.00)", () => {
    assert.equal(round2(1.005), 1);
  });

  it("float noise (0.1+0.2 = 0.30000000000000004) → 0.3", () => {
    assert.equal(round2(0.1 + 0.2), 0.3);
  });

  it("negatif: half-up (−2.815 → −2.81; −2.675 → −2.67)", () => {
    assert.equal(round2(-2.815), -2.81);
    assert.equal(round2(-2.675), -2.67);
  });

  it("angka besar: 1 234 567.895 → 1 234 567.9", () => {
    assert.equal(round2(1234567.895), 1234567.9);
  });
});

describe("round2", () => {
  it("pembulatan 2 desimal", () => {
    assert.equal(round2(2.815), 2.82);
    assert.equal(round2(2.8125), 2.81);
    assert.equal(round2(-2.815), -2.81);
  });
});