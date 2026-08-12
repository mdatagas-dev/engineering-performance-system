import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyUserOverrides, roleChangeRule } from "./roleChange";
import { seedMockUsers, type MockUser } from "./users";
import { RoleName } from "@/app/generated/prisma/enums";

const actor = { actorRole: RoleName.ADMIN, actorId: "admin-1", actorEmail: "admin@eps.local" };
const target = (u: MockUser) => ({ id: u.id, email: u.email, roles: [u.role.name] });
const byRole = (role: RoleName) => seedMockUsers().find((u) => u.role.name === role)!;

describe("roleChangeRule (mirror lib/auth/rolePolicy.ts)", () => {
  it("target SUPER_ADMIN tidak bisa diubah/di-demote oleh siapa pun", () => {
    const r = roleChangeRule({ ...actor, target: target(byRole(RoleName.SUPER_ADMIN)), newRole: RoleName.VIEWER });
    assert.equal(r.ok, false);
  });

  it("self-change diblokir lewat id ataupun email (id sesi mock beda dari seed)", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    assert.equal(
      roleChangeRule({ ...actor, actorId: u.id, target: target(u), newRole: RoleName.ADMIN }).ok,
      false
    );
    assert.equal(
      roleChangeRule({
        ...actor,
        actorId: "usr_mock_engineering_staff",
        actorEmail: u.email,
        target: target(u),
        newRole: RoleName.ADMIN,
      }).ok,
      false
    );
  });

  it("non-SUPER_ADMIN tidak bisa memberikan SUPER_ADMIN", () => {
    const r = roleChangeRule({ ...actor, target: target(byRole(RoleName.ENGINEERING_STAFF)), newRole: RoleName.SUPER_ADMIN });
    assert.equal(r.ok, false);
  });

  it("SUPER_ADMIN actor boleh grant SUPER_ADMIN", () => {
    const r = roleChangeRule({
      ...actor,
      actorRole: RoleName.SUPER_ADMIN,
      target: target(byRole(RoleName.ENGINEERING_STAFF)),
      newRole: RoleName.SUPER_ADMIN,
    });
    assert.deepEqual(r, { ok: true });
  });

  it("ADMIN bisa ubah role user lain ke role non-SUPER_ADMIN", () => {
    const r = roleChangeRule({ ...actor, target: target(byRole(RoleName.ENGINEERING_STAFF)), newRole: RoleName.VIEWER });
    assert.deepEqual(r, { ok: true });
  });
});

describe("applyUserOverrides", () => {
  it("patch role & isActive digabung ke seed, panjang daftar tetap", () => {
    const items = seedMockUsers();
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const next = applyUserOverrides(items, [{ id: u.id, role: { name: RoleName.VIEWER }, isActive: false }]);
    assert.equal(next.length, items.length);
    const patched = next.find((x) => x.id === u.id)!;
    assert.equal(patched.role.name, RoleName.VIEWER);
    assert.equal(patched.isActive, false);
    const untouched = next.find((x) => x.id === "usr_admin")!;
    assert.equal(untouched.role.name, RoleName.ADMIN);
  });

  it("tanpa patch: daftar tidak berubah", () => {
    const items = seedMockUsers();
    assert.deepEqual(applyUserOverrides(items, []), items);
  });
});
