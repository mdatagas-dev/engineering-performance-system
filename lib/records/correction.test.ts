import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";
import {
  canCorrect,
  decideCorrection,
  parseCorrectionBody,
  CORRECTION_PERMISSIONS,
} from "./correction";
import { recomputeCalculated } from "./calculate";

type Actor = { role: string; permissions: string[] };

const MANAGER: Actor = { role: RoleName.ENGINEERING_MANAGER, permissions: ["record.approve", "record.lock"] };
const STAFF: Actor = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create"] };
const VIEWER: Actor = { role: RoleName.VIEWER, permissions: ["dashboard.view"] };
const SUPER: Actor = { role: RoleName.SUPER_ADMIN, permissions: [] };

describe("canCorrect", () => {
  it("butuh record.approve atau record.lock", () => {
    assert.equal(CORRECTION_PERMISSIONS.length > 0, true);
    assert.equal(canCorrect({ role: "X", permissions: ["record.approve"] }), true);
    assert.equal(canCorrect({ role: "X", permissions: ["record.lock"] }), true);
    assert.equal(canCorrect({ role: "X", permissions: ["record.create"] }), false);
    assert.equal(canCorrect(VIEWER), false);
  });

  it("SUPER_ADMIN bypass tanpa permission", () => {
    assert.equal(canCorrect(SUPER), true);
  });
});

describe("decideCorrection", () => {
  it("APPROVED → boleh oleh pemegang record.approve / record.lock", () => {
    assert.equal(decideCorrection({ status: RecordStatus.APPROVED, actor: MANAGER }).ok, true);
  });

  it("LOCKED → boleh (koreksi membuka kembali data terkunci)", () => {
    assert.equal(decideCorrection({ status: RecordStatus.LOCKED, actor: MANAGER }).ok, true);
  });

  it("SUPER_ADMIN lolos pada APPROVED dan LOCKED", () => {
    assert.equal(decideCorrection({ status: RecordStatus.APPROVED, actor: SUPER }).ok, true);
    assert.equal(decideCorrection({ status: RecordStatus.LOCKED, actor: SUPER }).ok, true);
  });

  it("tanpa izin approve/lock → 403", () => {
    for (const actor of [STAFF, VIEWER]) {
      const r = decideCorrection({ status: RecordStatus.APPROVED, actor });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 403);
    }
  });

  it("status selain APPROVED/LOCKED → 400 walau punya izin", () => {
    for (const status of [RecordStatus.DRAFT, RecordStatus.SUBMITTED, RecordStatus.REVIEWED]) {
      const r = decideCorrection({ status, actor: MANAGER });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 400);
    }
  });
});

describe("parseCorrectionBody", () => {
  it("reason wajib, min 10 / max 500 karakter", () => {
    assert.equal(parseCorrectionBody({}).ok, false);
    assert.equal(parseCorrectionBody({ reason: "pendek" }).ok, false);
    assert.equal(parseCorrectionBody({ reason: "alasan koreksi" }).ok, true);
    assert.equal(parseCorrectionBody({ reason: "x".repeat(501) }).ok, false);
    assert.equal(parseCorrectionBody({ reason: "x".repeat(500) }).ok, true);
  });

  it("body tanpa fields → ok, fields undefined", () => {
    const r = parseCorrectionBody({ reason: "alasan koreksi data" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.fields, undefined);
  });

  it("fields angka non-negatif diterima", () => {
    const r = parseCorrectionBody({ reason: "alasan koreksi data", fields: { uphResult: 95.5 } });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.fields?.uphResult, 95.5);
  });

  it("angka negatif ditolak", () => {
    const r = parseCorrectionBody({ reason: "alasan koreksi data", fields: { uphResult: -1 } });
    assert.equal(r.ok, false);
  });

  it("nilai angka berupa string ditolak", () => {
    const r = parseCorrectionBody({ reason: "alasan koreksi data", fields: { plan: "800" } });
    assert.equal(r.ok, false);
  });

  it("field di luar whitelist (termasuk calculated/status/version) ditolak", () => {
    for (const key of ["upph", "gapUph", "status", "version", "approvedBy", "random"]) {
      const r = parseCorrectionBody({ reason: "alasan koreksi data", fields: { [key]: 5 } });
      assert.equal(r.ok, false, `harus tolak ${key}`);
    }
  });

  it("date valid → Date; date invalid → tolak", () => {
    const ok = parseCorrectionBody({ reason: "alasan koreksi data", fields: { date: "2026-08-12" } });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.fields?.date instanceof Date, true);
    const bad = parseCorrectionBody({ reason: "alasan koreksi data", fields: { date: "bukan-tanggal" } });
    assert.equal(bad.ok, false);
  });

  it("model wajib non-kosong; shift boleh null", () => {
    assert.equal(parseCorrectionBody({ reason: "alasan koreksi data", fields: { model: "" } }).ok, false);
    const ok = parseCorrectionBody({ reason: "alasan koreksi data", fields: { shift: null } });
    assert.equal(ok.ok, true);
    const bad = parseCorrectionBody({ reason: "alasan koreksi data", fields: { shift: 2 } });
    assert.equal(bad.ok, false);
  });
});

describe("recomputeCalculated", () => {
  const current = {
    uphTarget: 100,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 900,
    outputProd: 950,
  };

  it("ada input perhitungan → hitung ulang 1:1 Excel (90/32 → 2.81)", () => {
    const r = recomputeCalculated(current, { uphResult: 90 });
    assert.notEqual(r, null);
    if (r) {
      assert.equal(r.upph, 2.81);
      assert.equal(r.gapUph, -10);
    }
  });

  it("hanya field non-perhitungan → null (tanpa hitung ulang)", () => {
    assert.equal(recomputeCalculated(current, { totalSetup: 15 }), null);
    assert.equal(recomputeCalculated(current, { model: "M-1" }), null);
  });

  it("guard pembagian nol: hcActual 0 → upph null", () => {
    const r = recomputeCalculated(current, { hcActual: 0 });
    assert.notEqual(r, null);
    if (r) assert.equal(r.upph, null);
  });
});
