import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateKpiCreate,
  validateKpiUpdate,
  buildSoftDelete,
} from "./validation";

const neverTaken = async () => false;
const alwaysTaken = async () => true;
const validBody = { key: "oee", name: "OEE", formula: "a / b", unit: "%", target: 85 };

const existing = {
  target: 85,
  higherIsBetter: true,
  warningThreshold: 80,
  criticalThreshold: 70,
};

describe("validateKpiCreate", () => {
  it("menerima body valid dengan default decimals=2, isActive=true, higherIsBetter=true", async () => {
    const r = await validateKpiCreate(validBody, neverTaken);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.decimals, 2);
      assert.equal(r.data.isActive, true);
      assert.equal(r.data.higherIsBetter, true);
      assert.equal(r.data.warningThreshold, null);
    }
  });

  it("menolak key duplikat", async () => {
    const r = await validateKpiCreate(validBody, alwaysTaken);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /sudah digunakan/);
  });

  it("menolak field wajib kosong (name)", async () => {
    const r = await validateKpiCreate(
      { ...validBody, name: "  " },
      neverTaken
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Nama KPI/);
  });

  it("menolak formula kosong", async () => {
    const r = await validateKpiCreate({ ...validBody, formula: "   " }, neverTaken);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Formula/);
  });

  it("menolak formula melebihi panjang maksimum", async () => {
    const r = await validateKpiCreate({ ...validBody, formula: "a".repeat(501) }, neverTaken);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /maksimal/);
  });

  it("menolak formula dengan token SQL berbahaya", async () => {
    const r = await validateKpiCreate({ ...validBody, formula: "DROP TABLE kpi" }, neverTaken);
    assert.equal(r.ok, false);
    const r2 = await validateKpiCreate({ ...validBody, formula: "a; b" }, neverTaken);
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.match(r2.message, /token/);
  });

  it("menolak target non-angka", async () => {
    const r = await validateKpiCreate({ ...validBody, target: "85" }, neverTaken);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Target/);
  });

  it("menolak decimals di luar rentang 0-6", async () => {
    const r = await validateKpiCreate({ ...validBody, decimals: 7 }, neverTaken);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /desimal/);
    const r2 = await validateKpiCreate({ ...validBody, decimals: -1 }, neverTaken);
    assert.equal(r2.ok, false);
  });

  it("menerima target dan threshold negatif (KPI gap)", async () => {
    const r = await validateKpiCreate(
      { ...validBody, target: -5, warningThreshold: -8, criticalThreshold: -10 },
      neverTaken
    );
    assert.equal(r.ok, true);
  });

  it("menolak threshold non-angka", async () => {
    const r = await validateKpiCreate(
      { ...validBody, warningThreshold: "80" },
      neverTaken
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Ambang/);
  });

  it("higher-is-better: menolak warning > target", async () => {
    const r = await validateKpiCreate(
      { ...validBody, warningThreshold: 90 },
      neverTaken
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Ambang peringatan/);
  });

  it("higher-is-better: menolak critical > warning", async () => {
    const r = await validateKpiCreate(
      { ...validBody, warningThreshold: 80, criticalThreshold: 85 },
      neverTaken
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Ambang kritis/);
  });

  it("higher-is-better: menerima warning <= target dan critical <= warning (sama diperbolehkan)", async () => {
    const r = await validateKpiCreate(
      { ...validBody, warningThreshold: 85, criticalThreshold: 85 },
      neverTaken
    );
    assert.equal(r.ok, true);
  });

  it("higher-is-better: critical tanpa warning harus <= target", async () => {
    const r = await validateKpiCreate(
      { ...validBody, criticalThreshold: 90 },
      neverTaken
    );
    assert.equal(r.ok, false);
  });

  it("lower-is-better: menerima warning >= target dan critical >= warning", async () => {
    const r = await validateKpiCreate(
      { ...validBody, higherIsBetter: false, target: 5, warningThreshold: 7, criticalThreshold: 9 },
      neverTaken
    );
    assert.equal(r.ok, true);
  });

  it("lower-is-better: menolak warning < target", async () => {
    const r = await validateKpiCreate(
      { ...validBody, higherIsBetter: false, target: 5, warningThreshold: 4 },
      neverTaken
    );
    assert.equal(r.ok, false);
  });

  it("menolak higherIsBetter non-boolean", async () => {
    const r = await validateKpiCreate(
      { ...validBody, higherIsBetter: "true" },
      neverTaken
    );
    assert.equal(r.ok, false);
  });
});

describe("validateKpiUpdate", () => {
  it("menolak perubahan key", async () => {
    const r = await validateKpiUpdate({ key: "key-baru" }, existing);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /tidak dapat diubah/);
  });

  it("menerima field parsial dan null untuk threshold", async () => {
    const r = await validateKpiUpdate({ name: "OEE Baru", warningThreshold: null }, existing);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, { name: "OEE Baru", warningThreshold: null });
    }
  });

  it("menolak decimals non-integer", async () => {
    const r = await validateKpiUpdate({ decimals: 2.5 }, existing);
    assert.equal(r.ok, false);
  });

  it("menolak formula berbahaya pada update", async () => {
    const r = await validateKpiUpdate({ formula: "DELETE FROM kpi" }, existing);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /token/);
  });

  it("menolak isActive non-boolean", async () => {
    const r = await validateKpiUpdate({ isActive: "yes" }, existing);
    assert.equal(r.ok, false);
  });

  it("menolak target baru yang membuat threshold inkonsisten", async () => {
    const r = await validateKpiUpdate({ target: 75 }, existing);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Ambang peringatan/);
  });

  it("menerima target baru yang tetap konsisten dengan threshold", async () => {
    const r = await validateKpiUpdate({ target: 80 }, existing);
    assert.equal(r.ok, true);
  });

  it("menolak menghapus warning jika critical > target", async () => {
    const e = { ...existing, criticalThreshold: 90 };
    const r = await validateKpiUpdate({ warningThreshold: null }, e);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.message, /Ambang kritis/);
  });

  it("menolak membalik arah ke lower-is-better jika threshold tidak sesuai", async () => {
    const r = await validateKpiUpdate({ higherIsBetter: false }, existing);
    assert.equal(r.ok, false);
  });

  it("menerima pembalikan arah bersama penyesuaian threshold", async () => {
    const r = await validateKpiUpdate(
      { higherIsBetter: false, warningThreshold: 90, criticalThreshold: 95 },
      existing
    );
    assert.equal(r.ok, true);
  });

  it("menerima target dan threshold negatif pada update", async () => {
    const e = { target: -5, higherIsBetter: true, warningThreshold: -8, criticalThreshold: -10 };
    const r = await validateKpiUpdate({ target: -7 }, e);
    assert.equal(r.ok, true);
  });
});

describe("buildSoftDelete", () => {
  it("menandai soft delete: isDeleted=true, deletedAt, deletedBy", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    assert.deepEqual(buildSoftDelete("user-1", now), {
      isDeleted: true,
      deletedAt: now,
      deletedBy: "user-1",
    });
  });
});
