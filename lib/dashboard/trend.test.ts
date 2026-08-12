import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockProductionRecords } from "@/lib/mocks/records";
import { addDays } from "./dates";
import { withTrendVariants } from "./trend";

describe("withTrendVariants", () => {
  it("default: 1 varian per baris, mundur 1 hari, tanpa memutasi input", () => {
    const inputIds = mockProductionRecords.map((r) => r.id);
    const inputDates = mockProductionRecords.map((r) => r.date);

    const out = withTrendVariants(mockProductionRecords);

    // Seed asli tidak berubah.
    assert.deepEqual(mockProductionRecords.map((r) => r.id), inputIds);
    assert.deepEqual(mockProductionRecords.map((r) => r.date), inputDates);

    // Output = seed + varian (4 + 4), urutan seed di depan.
    assert.equal(out.length, mockProductionRecords.length * 2);
    assert.deepEqual(out.slice(0, 4).map((r) => r.id), inputIds);

    // Varian: id deterministik, tanggal mundur 1 hari, nilai identik.
    for (let i = 0; i < mockProductionRecords.length; i++) {
      const seed = mockProductionRecords[i];
      const v = out[mockProductionRecords.length + i];
      assert.equal(v.id, `${seed.id}__trend_v1`);
      assert.equal(v.date, addDays(seed.date, -1));
      assert.equal(v.model, seed.model);
      assert.equal(v.outputProd, seed.outputProd);
      assert.equal(v.plan, seed.plan);
      assert.equal(v.gapUph, seed.gapUph);
      assert.equal(v.upph, seed.upph);
    }

    // Hasil pakai seed (2 tanggal) → minimal 3 tanggal unik untuk tren.
    assert.ok(new Set(out.map((r) => r.date)).size >= 3);
  });

  it("variantsPerRow & daysStep dikalikan", () => {
    const out = withTrendVariants(mockProductionRecords, { variantsPerRow: 2, daysStep: 2 });
    assert.equal(out.length, mockProductionRecords.length * 3);
    const first = out[4]; // varian pertama seed pertama
    const second = out[5];
    assert.equal(first.date, addDays(mockProductionRecords[0].date, -2));
    assert.equal(second.date, addDays(mockProductionRecords[0].date, -4));
  });

  it("variantsPerRow 0 → hanya salinan seed, tanpa varian", () => {
    const out = withTrendVariants(mockProductionRecords, { variantsPerRow: 0 });
    assert.equal(out.length, mockProductionRecords.length);
    assert.deepEqual(out.map((r) => r.id), mockProductionRecords.map((r) => r.id));
  });

  it("input kosong → output kosong", () => {
    assert.deepEqual(withTrendVariants([]), []);
  });
});