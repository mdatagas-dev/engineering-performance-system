import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus } from "@/app/generated/prisma/enums";
import {
  parseCreateBody,
  buildCreateData,
  buildCreateSnapshot,
  findDuplicateKey,
  isDuplicateKeyError,
  isForeignKeyError,
  type CreateBodyData,
} from "./create";

function drop<T extends Record<string, unknown>>(obj: T, key: string): T {
  const rest = { ...obj };
  delete rest[key];
  return rest as T;
}

function parseOk(body: unknown): CreateBodyData {
  const r = parseCreateBody(body);
  if (!r.ok) throw new Error(r.message);
  return r.data;
}

const VALID_PAYLOAD = {
  date: "2026-08-12",
  model: "LV-3000",
  shift: "1",
  areaId: "11111111-1111-4111-8111-111111111111",
  uphTarget: 90,
  uphResult: 90,
  hcStandard: 30,
  hcActual: 32,
  plan: 960,
  outputProd: 1000,
  totalSetup: 10,
  workingHour: 8,
  totalSetupPacking: 5,
  workingHourPacking: 2,
};

describe("parseCreateBody", () => {
  it("payload valid → semua 12 raw + areaId ter-parse; shift null diterima", () => {
    const ok = parseCreateBody({ ...VALID_PAYLOAD, shift: null, areaId: null });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.ok(ok.data.date instanceof Date);
      assert.equal(ok.data.model, "LV-3000");
      assert.equal(ok.data.shift, null);
      assert.equal(ok.data.areaId, null);
      assert.equal(ok.data.fields.outputProd, 1000);
    }
  });

  it("shift opsional (tanpa key) → null", () => {
    const rest = drop(VALID_PAYLOAD, "shift");
    const ok = parseCreateBody(rest);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.shift, null);
  });

  it("body bukan objek ditolak", () => {
    assert.equal(parseCreateBody(null).ok, false);
    assert.equal(parseCreateBody([]).ok, false);
    assert.equal(parseCreateBody("x").ok, false);
  });

  it("field wajib hilang → 400 message", () => {
    for (const key of ["date", "model", "uphTarget", "outputProd", "workingHourPacking"]) {
      const r = parseCreateBody(drop(VALID_PAYLOAD, key));
      assert.equal(r.ok, false, `harus tolak tanpa ${key}`);
      if (!r.ok) assert.match(r.message, new RegExp(key));
    }
  });

  it("angka negatif / NaN / tak berhingga ditolak", () => {
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, plan: -1 }).ok, false);
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, uphResult: Number.NaN }).ok, false);
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, uphResult: Number.POSITIVE_INFINITY }).ok, false);
  });

  it("> 1e15 ditolak (numeric-safe)", () => {
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, plan: 1e15 + 1 }).ok, false);
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, plan: 1e15 }).ok, true);
  });

  it("tanggal invalid / format salah ditolak", () => {
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, date: "12/08/2026" }).ok, false);
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, date: "2026-02-30" }).ok, false);
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, date: "2026" }).ok, false);
  });

  it("model kosong ditolak; calculated/status/version di body ditolak", () => {
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, model: "   " }).ok, false);
    for (const key of ["gapUph", "upph", "status", "version", "createdBy", "unknown"]) {
      const r = parseCreateBody({ ...VALID_PAYLOAD, [key]: key === "unknown" ? "x" : 5 });
      assert.equal(r.ok, false, `harus tolak ${key}`);
    }
  });

  it("areaId non-uuid ditolak", () => {
    assert.equal(parseCreateBody({ ...VALID_PAYLOAD, areaId: "bukan-uuid" }).ok, false);
  });
});

describe("buildCreateData", () => {
  const ACTOR = "user-1";

  it("calculated dihitung server-side 1:1 (90/90→0, 32/30→2, 1000/960→40, upph 2.81)", () => {
    const data = buildCreateData(parseOk(VALID_PAYLOAD), ACTOR);
    assert.equal(data.gapUph, 0);
    assert.equal(data.gapHc, 2);
    assert.equal(data.gapOp, 40);
    assert.equal(data.upph, 2.81);
  });

  it("status DRAFT, version 1, createdBy dari sesi", () => {
    const data = buildCreateData(parseOk(VALID_PAYLOAD), ACTOR);
    assert.equal(data.status, RecordStatus.DRAFT);
    assert.equal(data.version, 1);
    assert.deepEqual(data.createdByUser, { connect: { id: ACTOR } });
    assert.equal((data.area as { connect: { id: string } }).connect.id, VALID_PAYLOAD.areaId);
  });

  it("areaId null → area tidak di-connect", () => {
    const data = buildCreateData(parseOk({ ...VALID_PAYLOAD, areaId: null }), ACTOR);
    assert.equal(data.area, undefined);
  });

  it("hcActual 0 → upph disimpan 0 (ponytail NOT NULL)", () => {
    const data = buildCreateData(parseOk({ ...VALID_PAYLOAD, hcActual: 0 }), ACTOR);
    assert.equal(data.upph, 0);
  });
});

describe("buildCreateSnapshot", () => {
  it("shape = state data lengkap (raw + calculated + DRAFT + version 1)", () => {
    const snap = buildCreateSnapshot(parseOk(VALID_PAYLOAD)) as Record<string, unknown>;
    assert.equal(snap.date, "2026-08-12T00:00:00.000Z");
    assert.equal(snap.status, RecordStatus.DRAFT);
    assert.equal(snap.version, 1);
    assert.equal(snap.upph, 2.81);
    assert.equal(snap.totalSetupPacking, 5);
  });
});

describe("findDuplicateKey", () => {
  it("shift ATAU areaId null → tidak ada kandidat (NULL distinct di Postgres)", () => {
    const d = new Date("2026-08-12");
    assert.equal(findDuplicateKey(d, "A", null, "area-1"), null);
    assert.equal(findDuplicateKey(d, "A", "1", null), null);
  });

  it("shift + areaId keduanya terisi → where duplikat", () => {
    const where = findDuplicateKey(new Date("2026-08-12"), "A", "1", "area-1");
    assert.ok(where);
    if (where) assert.deepEqual(where, { date: new Date("2026-08-12"), model: "A", shift: "1", areaId: "area-1" });
  });
});

describe("isDuplicateKeyError / isForeignKeyError", () => {
  it("kode error Prisma P2002/P2003 terdeteksi (duck-type)", () => {
    assert.equal(isDuplicateKeyError({ code: "P2002" }), true);
    assert.equal(isDuplicateKeyError({ code: "P2003" }), false);
    assert.equal(isDuplicateKeyError(null), false);
    assert.equal(isForeignKeyError({ code: "P2003" }), true);
    assert.equal(isForeignKeyError(new Error("boom")), false);
  });
});