import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideRoleChange, decideUserCreate, decideUserUpdate } from "./rolePolicy";
import { RoleName } from "@/app/generated/prisma/enums";

const ADMIN = { actorRole: RoleName.ADMIN, actorId: "admin-1" };
const SUPER = { actorRole: RoleName.SUPER_ADMIN, actorId: "super-1" };

describe("decideRoleChange", () => {
  it("SUPER_ADMIN target tidak bisa diubah/di-demote oleh siapa pun, termasuk SUPER_ADMIN lain", () => {
    const r = decideRoleChange({
      ...SUPER,
      targetId: "super-2",
      targetRoles: [RoleName.SUPER_ADMIN],
      newRole: RoleName.VIEWER,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("user tidak bisa mengubah peran dirinya sendiri (cegah self-escalation)", () => {
    const r = decideRoleChange({
      ...ADMIN,
      targetId: "admin-1",
      targetRoles: [RoleName.ADMIN],
      newRole: RoleName.SUPER_ADMIN,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("non-SUPER_ADMIN tidak bisa memberikan SUPER_ADMIN ke user lain", () => {
    const r = decideRoleChange({
      ...ADMIN,
      targetId: "staff-1",
      targetRoles: [RoleName.ENGINEERING_STAFF],
      newRole: RoleName.SUPER_ADMIN,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("SUPER_ADMIN bisa mengubah role user biasa (demote/promote)", () => {
    const r = decideRoleChange({
      ...SUPER,
      targetId: "staff-1",
      targetRoles: [RoleName.ENGINEERING_STAFF],
      newRole: RoleName.VIEWER,
    });
    assert.deepEqual(r, { ok: true });
  });

  it("ADMIN bisa mengubah role user biasa ke role non-SUPER_ADMIN", () => {
    const r = decideRoleChange({
      ...ADMIN,
      targetId: "staff-1",
      targetRoles: [RoleName.ENGINEERING_STAFF],
      newRole: RoleName.ADMIN,
    });
    assert.deepEqual(r, { ok: true });
  });
});

describe("decideUserCreate", () => {
  it("non-SUPER_ADMIN tidak bisa membuat akun SUPER_ADMIN", () => {
    const r = decideUserCreate({ actorRole: RoleName.ADMIN, newRole: RoleName.SUPER_ADMIN });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("SUPER_ADMIN boleh membuat akun SUPER_ADMIN", () => {
    assert.deepEqual(decideUserCreate({ actorRole: RoleName.SUPER_ADMIN, newRole: RoleName.SUPER_ADMIN }), { ok: true });
  });

  it("ADMIN boleh membuat akun role lain (bukan SUPER_ADMIN)", () => {
    assert.deepEqual(decideUserCreate({ actorRole: RoleName.ADMIN, newRole: RoleName.ENGINEERING_MANAGER }), { ok: true });
  });
});

describe("decideUserUpdate", () => {
  const staff = { id: "staff-1", email: "staff@eps.local", roles: [RoleName.ENGINEERING_STAFF] as RoleName[] };

  it("akun SUPER_ADMIN final: tidak bisa diubah oleh siapa pun (termasuk profil saja)", () => {
    const r = decideUserUpdate({
      ...SUPER,
      actorEmail: "super@eps.local",
      target: { id: "super-2", email: "super2@eps.local", roles: [RoleName.SUPER_ADMIN] },
      newRole: RoleName.SUPER_ADMIN,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("self change role via actorId ditolak", () => {
    const r = decideUserUpdate({
      ...ADMIN,
      actorId: "self-1",
      actorEmail: "",
      target: { id: "self-1", email: "admin@eps.local", roles: [RoleName.ADMIN] },
      newRole: RoleName.VIEWER,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("self change role via actorEmail (fallback mock) ditolak", () => {
    const r = decideUserUpdate({
      ...ADMIN,
      actorId: "mock-id-lain",
      actorEmail: "admin@eps.local",
      target: { id: "usr_admin", email: "admin@eps.local", roles: [RoleName.ADMIN] },
      newRole: RoleName.VIEWER,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("edit profil sendiri tanpa ganti role diperbolehkan", () => {
    assert.deepEqual(
      decideUserUpdate({
        ...ADMIN,
        actorId: "admin-1",
        actorEmail: "admin@eps.local",
        target: { id: "admin-1", email: "admin@eps.local", roles: [RoleName.ADMIN] },
        newRole: RoleName.ADMIN,
      }),
      { ok: true }
    );
  });

  it("non-SUPER_ADMIN tidak bisa meng-upgrade target ke SUPER_ADMIN", () => {
    const r = decideUserUpdate({ ...ADMIN, actorEmail: "admin@eps.local", target: staff, newRole: RoleName.SUPER_ADMIN });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it("SUPER_ADMIN boleh mengubah role user biasa", () => {
    assert.deepEqual(decideUserUpdate({ ...SUPER, actorEmail: "", target: staff, newRole: RoleName.VIEWER }), { ok: true });
  });
});
