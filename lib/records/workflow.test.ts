import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideTransition, findTransition, WORKFLOW_TRANSITIONS } from "./workflow";
import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";

type Actor = { sub: string; role: string; permissions: string[] };

const STAFF: Actor = { sub: "staff-1", role: RoleName.ENGINEERING_STAFF, permissions: ["record.create", "dashboard.view"] };
const MANAGER: Actor = { sub: "manager-1", role: RoleName.ENGINEERING_MANAGER, permissions: ["record.approve", "record.lock"] };
const ADMIN: Actor = { sub: "admin-1", role: RoleName.ADMIN, permissions: ["record.approve", "record.lock"] };
const SUPER: Actor = { sub: "super-1", role: RoleName.SUPER_ADMIN, permissions: [] };
const VIEWER: Actor = { sub: "viewer-1", role: RoleName.VIEWER, permissions: ["dashboard.view"] };

function decide(from: RecordStatus, to: RecordStatus, actor: Actor, creatorId = "staff-1") {
  return decideTransition({ from, to, actor, creatorId });
}

describe("WORKFLOW_TRANSITIONS", () => {
  it("map berisi rantai penuh next-step saja", () => {
    assert.deepEqual(WORKFLOW_TRANSITIONS[RecordStatus.DRAFT].map((t) => t.to), [RecordStatus.SUBMITTED]);
    assert.deepEqual(WORKFLOW_TRANSITIONS[RecordStatus.SUBMITTED].map((t) => t.to), [RecordStatus.REVIEWED]);
    assert.deepEqual(WORKFLOW_TRANSITIONS[RecordStatus.REVIEWED].map((t) => t.to), [RecordStatus.APPROVED]);
    assert.deepEqual(WORKFLOW_TRANSITIONS[RecordStatus.APPROVED].map((t) => t.to), [RecordStatus.LOCKED]);
    assert.deepEqual(WORKFLOW_TRANSITIONS[RecordStatus.LOCKED], []);
  });

  it("actorField terpasang di step approval/lock (bukan submit — tidak ada kolom submittedBy)", () => {
    assert.equal(findTransition(RecordStatus.DRAFT, RecordStatus.SUBMITTED)?.actorField, undefined);
    assert.equal(findTransition(RecordStatus.SUBMITTED, RecordStatus.REVIEWED)?.actorField, "reviewedBy");
    assert.equal(findTransition(RecordStatus.REVIEWED, RecordStatus.APPROVED)?.actorField, "approvedBy");
    assert.equal(findTransition(RecordStatus.APPROVED, RecordStatus.LOCKED)?.actorField, "lockedBy");
  });
});

describe("decideTransition — rantai valid", () => {
  it("DRAFT→SUBMITTED oleh staff (pemilik)", () => {
    const r = decide(RecordStatus.DRAFT, RecordStatus.SUBMITTED, STAFF);
    assert.equal(r.ok, true);
  });

  it("SUBMITTED→REVIEWED oleh manager (record.approve)", () => {
    const r = decide(RecordStatus.SUBMITTED, RecordStatus.REVIEWED, MANAGER);
    assert.equal(r.ok, true);
  });

  it("REVIEWED→APPROVED oleh manager (record.approve)", () => {
    const r = decide(RecordStatus.REVIEWED, RecordStatus.APPROVED, MANAGER);
    assert.equal(r.ok, true);
  });

  it("APPROVED→LOCKED oleh admin (record.lock)", () => {
    const r = decide(RecordStatus.APPROVED, RecordStatus.LOCKED, ADMIN);
    assert.equal(r.ok, true);
  });

  it("SUPER_ADMIN lolos semua transisi walau tanpa permission", () => {
    for (const [from, to] of [
      [RecordStatus.DRAFT, RecordStatus.SUBMITTED],
      [RecordStatus.SUBMITTED, RecordStatus.REVIEWED],
      [RecordStatus.REVIEWED, RecordStatus.APPROVED],
      [RecordStatus.APPROVED, RecordStatus.LOCKED],
    ] as const) {
      assert.equal(decide(from, to, SUPER).ok, true);
    }
  });
});

describe("decideTransition — lompatan & arah mundur ditolak 400", () => {
  it("lompatan ditolak", () => {
    for (const [from, to] of [
      [RecordStatus.DRAFT, RecordStatus.APPROVED],
      [RecordStatus.DRAFT, RecordStatus.LOCKED],
      [RecordStatus.SUBMITTED, RecordStatus.APPROVED],
      [RecordStatus.REVIEWED, RecordStatus.LOCKED],
    ] as const) {
      const r = decide(from, to, SUPER);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 400);
    }
  });

  it("mundur ditolak", () => {
    for (const [from, to] of [
      [RecordStatus.SUBMITTED, RecordStatus.DRAFT],
      [RecordStatus.APPROVED, RecordStatus.REVIEWED],
      [RecordStatus.LOCKED, RecordStatus.APPROVED],
    ] as const) {
      const r = decide(from, to, SUPER);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 400);
    }
  });

  it("status sama ditolak", () => {
    const r = decide(RecordStatus.DRAFT, RecordStatus.DRAFT, SUPER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 400);
  });

  it("LOCKED tidak bisa ditransisi ke mana pun (terminal)", () => {
    for (const to of Object.values(RecordStatus)) {
      const r = decide(RecordStatus.LOCKED, to, SUPER);
      assert.equal(r.ok, false);
    }
  });
});

describe("decideTransition — permission per step (403)", () => {
  it("viewer tidak bisa submit", () => {
    const r = decide(RecordStatus.DRAFT, RecordStatus.SUBMITTED, VIEWER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("staff tanpa record.approve tidak bisa review/approve", () => {
    for (const [from, to] of [
      [RecordStatus.SUBMITTED, RecordStatus.REVIEWED],
      [RecordStatus.REVIEWED, RecordStatus.APPROVED],
    ] as const) {
      const r = decide(from, to, STAFF);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 403);
    }
  });

  it("manager tidak bisa lock (tanpa record.lock)", () => {
    const managerNoLock: Actor = { sub: "manager-2", role: RoleName.ENGINEERING_MANAGER, permissions: ["record.approve"] };
    const r = decide(RecordStatus.APPROVED, RecordStatus.LOCKED, managerNoLock);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("pemilik record boleh submit walau tanpa permission record.create", () => {
    const owner: Actor = { sub: "staff-9", role: RoleName.ENGINEERING_STAFF, permissions: [] };
    const r = decide(RecordStatus.DRAFT, RecordStatus.SUBMITTED, owner, "staff-9");
    assert.equal(r.ok, true);
  });

  it("bukan pemilik tanpa record.create ditolak submit", () => {
    const r = decide(RecordStatus.DRAFT, RecordStatus.SUBMITTED, VIEWER, "staff-1");
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("bukan pemilik dengan record.create tetap boleh submit", () => {
    const r = decide(RecordStatus.DRAFT, RecordStatus.SUBMITTED, STAFF, "pemilik-lain");
    assert.equal(r.ok, true);
  });
});
