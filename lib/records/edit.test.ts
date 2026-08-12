import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseEditBody, buildEditUpdate, EDIT_MAX_REASON } from "./edit";

const CURRENT = {
  uphTarget: 100,
  uphResult: 90,
  hcStandard: 30,
  hcActual: 32,
  plan: 900,
  outputProd: 950,
};

describe("parseEditBody", () => {
  it("fields wajib objek; body bukan objek ditolak", () => {
    assert.equal(parseEditBody(null).ok, false);
    assert.equal(parseEditBody({}).ok, false);
    assert.equal(parseEditBody({ fields: "x" }).ok, false);
  });

  it("fields kosong ditolak", () => {
    assert.equal(parseEditBody({ fields: {} }).ok, false);
  });

  it("whitelist 13 field raw; calculated/status/version ditolak", () => {
    const ok = parseEditBody({ fields: { model: "M-1", uphResult: 95.5, shift: null } });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.data.fields.model, "M-1");
      assert.equal(ok.data.fields.uphResult, 95.5);
      assert.equal(ok.data.fields.shift, null);
    }
    for (const key of ["upph", "gapUph", "gapOp", "status", "version", "createdBy", "random"]) {
      const r = parseEditBody({ fields: { [key]: 5 } });
      assert.equal(r.ok, false, `harus tolak ${key}`);
    }
  });

  it("angka negatif ditolak", () => {
    assert.equal(parseEditBody({ fields: { plan: -1 } }).ok, false);
  });

  it("reason opsional; > 500 ditolak", () => {
    assert.equal(parseEditBody({ fields: { model: "M-1" } }).ok, true);
    assert.equal(parseEditBody({ fields: { model: "M-1" }, reason: "alasan" }).ok, true);
    assert.equal(parseEditBody({ fields: { model: "M-1" }, reason: "x".repeat(501) }).ok, false);
    assert.equal(parseEditBody({ fields: { model: "M-1" }, reason: "x".repeat(EDIT_MAX_REASON) }).ok, true);
  });
});

describe("buildEditUpdate", () => {
  it("input perhitungan berubah → hitung ulang calculated 1:1 (90/32 → 2.81)", () => {
    const { updates, after } = buildEditUpdate(CURRENT, { uphResult: 90 });
    assert.equal(updates.gapUph, -10);
    assert.equal(updates.upph, 2.81);
    assert.equal(updates.hcStandard, undefined);
    assert.equal(after.uphResult, 90);
    assert.equal(after.upph, 2.81);
  });

  it("field non-perhitungan (model) → calculated tidak disentuh", () => {
    const { updates } = buildEditUpdate(CURRENT, { model: "M-2" });
    assert.equal(updates.model, "M-2");
    assert.equal(updates.gapUph, undefined);
  });

  it("hcActual 0 → upph disimpan 0 (schema NOT NULL)", () => {
    const { updates } = buildEditUpdate(CURRENT, { hcActual: 0 });
    assert.equal(updates.upph, 0);
    assert.equal(updates.gapHc, -30);
  });

  it("after mencakup raw + calculated (snapshot audit)", () => {
    const { after } = buildEditUpdate(CURRENT, { outputProd: 1000 });
    assert.equal(after.outputProd, 1000);
    assert.equal(after.gapOp, 100);
    assert.equal(after.hcActual, 32);
  });
});
