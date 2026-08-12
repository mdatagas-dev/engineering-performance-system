import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";
import {
  assertEditable,
  assertDeletable,
  assertManageable,
  canManageRecord,
} from "./guards";

type Actor = { sub: string; role: string; permissions: string[] };
const OWNER = "user-owner";
const OTHER = "user-other";
const STAFF = (over: Partial<Actor> = {}): Actor => ({
  sub: OTHER,
  role: RoleName.ENGINEERING_STAFF,
  permissions: [],
  ...over,
});

const FINAL_AND_INTERMEDIATE = [
  RecordStatus.SUBMITTED,
  RecordStatus.REVIEWED,
  RecordStatus.APPROVED,
  RecordStatus.LOCKED,
];

describe("assertEditable", () => {
  it("DRAFT diterima", () => {
    assert.equal(assertEditable(RecordStatus.DRAFT).ok, true);
  });

  it("status final & antara ditolak 409 (SUBMITTED+ termasuk APPROVED/LOCKED)", () => {
    for (const status of FINAL_AND_INTERMEDIATE) {
      const r = assertEditable(status);
      assert.equal(r.ok, false, `harus tolak ${status}`);
      if (!r.ok) assert.equal(r.status, 409);
    }
  });
});

describe("assertDeletable", () => {
  it("DRAFT diterima", () => {
    assert.equal(assertDeletable(RecordStatus.DRAFT).ok, true);
  });

  it("status selain DRAFT ditolak 409", () => {
    for (const status of FINAL_AND_INTERMEDIATE) {
      const r = assertDeletable(status);
      assert.equal(r.ok, false, `harus tolak ${status}`);
      if (!r.ok) assert.equal(r.status, 409);
    }
  });
});

describe("canManageRecord", () => {
  it("pemilik (createdBy) boleh tanpa permission", () => {
    assert.equal(canManageRecord(STAFF({ sub: OWNER }), OWNER), true);
  });

  it("pemegang record.create boleh walau bukan pemilik", () => {
    assert.equal(canManageRecord(STAFF({ permissions: ["record.create"] }), OWNER), true);
  });

  it("bukan pemilik & tanpa record.create ditolak", () => {
    assert.equal(canManageRecord(STAFF(), OWNER), false);
    assert.equal(canManageRecord(STAFF({ permissions: ["dashboard.view"] }), OWNER), false);
  });

  it("SUPER_ADMIN bypass", () => {
    assert.equal(canManageRecord(STAFF({ role: RoleName.SUPER_ADMIN }), OWNER), true);
  });
});

describe("assertManageable", () => {
  it("pemilik → ok", () => {
    assert.equal(assertManageable(STAFF({ sub: OWNER }), OWNER).ok, true);
  });

  it("record.create → ok", () => {
    assert.equal(assertManageable(STAFF({ permissions: ["record.create"] }), OWNER).ok, true);
  });

  it("tanpa hak → 403", () => {
    const r = assertManageable(STAFF(), OWNER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });
});
