// Kunci perilaku buildPareto — jangan ubah tanpa menyesuaikan test di sini.
// Grup per defectCode (nama dari entri pertama), urut quantity desc,
// percentPct = qty/total*100 round2, cumulativePct = akumulasi percentPct
// (sudah round2) per baris, rank 1-based. Input kosong -> [].

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPareto, type ParetoInput } from "./pareto";

const items: ParetoInput[] = [
  { defectCode: "A", defectName: "Scratch", quantity: 50 },
  { defectCode: "B", defectName: "Dent", quantity: 30 },
  { defectCode: "C", defectName: "Bubble", quantity: 20 },
];

describe("buildPareto", () => {
  it("empty input -> []", () => {
    assert.deepEqual(buildPareto([]), []);
  });

  it("contoh PRD: urut quantity desc, rank 1-based, percent & cumulative", () => {
    const r = buildPareto(items);
    assert.deepEqual(r, [
      { rank: 1, defectCode: "A", defectName: "Scratch", quantity: 50, percentPct: 50, cumulativePct: 50 },
      { rank: 2, defectCode: "B", defectName: "Dent", quantity: 30, percentPct: 30, cumulativePct: 80 },
      { rank: 3, defectCode: "C", defectName: "Bubble", quantity: 20, percentPct: 20, cumulativePct: 100 },
    ]);
  });

  it("grup per defectCode: quantity dijumlahkan, nama dari entri pertama", () => {
    const r = buildPareto([
      { defectCode: "A", defectName: "Scratch", quantity: 10 },
      { defectCode: "A", defectName: "Nama-Lain", quantity: 20 },
      { defectCode: "B", defectName: "Dent", quantity: 40 },
    ]);
    assert.equal(r.length, 2);
    assert.equal(r[0].defectCode, "B");
    assert.equal(r[0].quantity, 40);
    assert.equal(r[1].defectCode, "A");
    assert.equal(r[1].defectName, "Scratch");
    assert.equal(r[1].quantity, 30);
  });

  it("cumulative rounding: akumulasi percentPct yang sudah round2 (1/3 -> 33.33, 66.66, 99.99)", () => {
    const r = buildPareto([
      { defectCode: "X", defectName: "X", quantity: 1 },
      { defectCode: "Y", defectName: "Y", quantity: 1 },
      { defectCode: "Z", defectName: "Z", quantity: 1 },
    ]);
    assert.equal(r[0].percentPct, 33.33);
    assert.equal(r[0].cumulativePct, 33.33);
    assert.equal(r[1].cumulativePct, 66.66);
    assert.equal(r[2].cumulativePct, 99.99);
  });

  it("total 0 -> semua percent 0, cumulative 0", () => {
    const r = buildPareto([
      { defectCode: "A", defectName: "A", quantity: 0 },
      { defectCode: "B", defectName: "B", quantity: 0 },
    ]);
    assert.deepEqual(r.map((x) => [x.percentPct, x.cumulativePct]), [[0, 0], [0, 0]]);
  });

  it("urut stabil: quantity sama mempertahankan urutan entri pertama", () => {
    const r = buildPareto([
      { defectCode: "A", defectName: "A", quantity: 5 },
      { defectCode: "B", defectName: "B", quantity: 5 },
    ]);
    assert.equal(r[0].defectCode, "A");
    assert.equal(r[1].defectCode, "B");
  });
});
