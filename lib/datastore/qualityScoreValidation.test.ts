import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_QUALITY_RECORDS, validateQualityScoreBody } from "./qualityScoreValidation";

describe("validateQualityScoreBody", () => {
  it("array record valid → ok, data sama", () => {
    const r = validateQualityScoreBody([{ a: 1 }, { b: 2 }]);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.data, [{ a: 1 }, { b: 2 }]);
  });

  it("null → fail", () => {
    assert.equal(validateQualityScoreBody(null).ok, false);
  });

  it("string → fail", () => {
    assert.equal(validateQualityScoreBody("nope").ok, false);
  });

  it("objek biasa (bukan array) → fail", () => {
    assert.equal(validateQualityScoreBody({}).ok, false);
  });

  it("elemen non-objek → fail dengan indeks", () => {
    const r = validateQualityScoreBody([{ a: 1 }, "x"]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Record ke-2/);
  });

  it("elemen null → fail", () => {
    assert.equal(validateQualityScoreBody([null]).ok, false);
  });

  it("elemen array → fail", () => {
    assert.equal(validateQualityScoreBody([[]]).ok, false);
  });

  it("melebihi batas → fail", () => {
    const r = validateQualityScoreBody(
      Array.from({ length: MAX_QUALITY_RECORDS + 1 }, () => ({}))
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Maksimal/);
  });

  it("tepat batas → ok", () => {
    const r = validateQualityScoreBody(
      Array.from({ length: MAX_QUALITY_RECORDS }, () => ({}))
    );
    assert.equal(r.ok, true);
  });

  it("array kosong → ok (skor null ditangani service)", () => {
    assert.equal(validateQualityScoreBody([]).ok, true);
  });
});
