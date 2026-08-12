import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RoleName } from "@/app/generated/prisma/enums";
import { seedMockUsers, type MockUser } from "./users";
import { applyUserOverrides } from "./roleChange";
import {
  createMockUser,
  mockPasswordHash,
  seedUserIds,
  toUserPatch,
  updateMockUser,
  userCreateRule,
  userEditRule,
  validateUserForm,
  type UserFormValues,
} from "./userForm";

const base = (): UserFormValues => ({
  name: "Test User",
  email: "test.user@eps.local",
  password: "Password123!",
  role: RoleName.ENGINEERING_STAFF,
  areaId: "area_machining_1",
  isActive: true,
});

const actor = { actorRole: RoleName.ADMIN, actorId: "admin-1", actorEmail: "admin@eps.local" };
const byRole = (role: RoleName) => seedMockUsers().find((u) => u.role.name === role)!;
const target = (u: MockUser) => ({ id: u.id, email: u.email, roles: [u.role.name] });

describe("validateUserForm (mirror backend)", () => {
  it("nilai valid: tanpa error", () => {
    assert.deepEqual(validateUserForm(base(), "create", []), {});
  });

  it("name kosong ditolak", () => {
    assert.equal(validateUserForm({ ...base(), name: "  " }, "create", []).name, "Nama wajib diisi.");
  });

  it("email format invalid ditolak", () => {
    assert.equal(validateUserForm({ ...base(), email: "bukan-email" }, "create", []).email, "Format email tidak valid.");
  });

  it("email duplikat ditolak (case-insensitive)", () => {
    const existing = [byRole(RoleName.ENGINEERING_STAFF)];
    const err = validateUserForm({ ...base(), email: existing[0].email.toUpperCase() }, "create", existing);
    assert.equal(err.email, "Email sudah terdaftar.");
  });

  it("email sendiri saat edit tidak dianggap duplikat", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const err = validateUserForm({ ...base(), email: u.email }, "edit", [u], u.id);
    assert.equal(err.email, undefined);
  });

  it("create wajib password; min 8", () => {
    assert.equal(validateUserForm({ ...base(), password: "" }, "create", []).password, "Password wajib diisi (minimal 8 karakter).");
    assert.equal(validateUserForm({ ...base(), password: "short" }, "create", []).password, "Password minimal 8 karakter.");
  });

  it("edit: password opsional; jika diisi tetap min 8", () => {
    assert.equal(validateUserForm({ ...base(), password: "" }, "edit", []).password, undefined);
    assert.equal(validateUserForm({ ...base(), password: "short" }, "edit", []).password, "Password minimal 8 karakter.");
  });

  it("role tidak valid & area tidak dikenal ditolak", () => {
    assert.equal(validateUserForm({ ...base(), role: "NOPE" as RoleName }, "create", []).role, "Peran tidak valid.");
    assert.equal(validateUserForm({ ...base(), areaId: "area_ghost" }, "create", []).areaId, "Area tidak valid.");
  });
});

describe("RBAC create/edit (mirror rolePolicy)", () => {
  it("non-SUPER_ADMIN tidak bisa create akun SUPER_ADMIN", () => {
    assert.equal(userCreateRule(RoleName.ADMIN, RoleName.SUPER_ADMIN).ok, false);
  });

  it("SUPER_ADMIN boleh create SUPER_ADMIN", () => {
    assert.deepEqual(userCreateRule(RoleName.SUPER_ADMIN, RoleName.SUPER_ADMIN), { ok: true });
  });

  it("edit target SUPER_ADMIN ditolak oleh siapa pun", () => {
    const r = userEditRule({ ...actor, target: target(byRole(RoleName.SUPER_ADMIN)), newRole: RoleName.VIEWER });
    assert.equal(r.ok, false);
  });

  it("edit role sendiri ditolak, nama/email boleh", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    assert.equal(
      userEditRule({ ...actor, actorId: u.id, target: target(u), newRole: RoleName.ADMIN }).ok,
      false
    );
    assert.deepEqual(userEditRule({ ...actor, actorId: u.id, target: target(u), newRole: u.role.name }), { ok: true });
  });

  it("self terdeteksi lewat email (id sesi mock beda dari seed)", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const r = userEditRule({
      ...actor,
      actorId: "usr_mock_engineering_staff",
      actorEmail: u.email,
      target: target(u),
      newRole: RoleName.VIEWER,
    });
    assert.equal(r.ok, false);
  });

  it("non-SUPER_ADMIN tidak bisa grant SUPER_ADMIN saat edit", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const r = userEditRule({ ...actor, target: target(u), newRole: RoleName.SUPER_ADMIN });
    assert.equal(r.ok, false);
  });

  it("SUPER_ADMIN boleh edit user lain jadi SUPER_ADMIN", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const r = userEditRule({ ...actor, actorRole: RoleName.SUPER_ADMIN, target: target(u), newRole: RoleName.SUPER_ADMIN });
    assert.deepEqual(r, { ok: true });
  });
});

describe("createMockUser / updateMockUser / mockPasswordHash", () => {
  it("create: id baru, createdAt/updatedAt = now, input dinormalisasi", () => {
    const now = new Date("2026-08-12T08:00:00Z");
    const u = createMockUser({ ...base(), email: "  TEST.User@EPS.local ", name: "  Test  " }, now);
    assert.ok(u.id.startsWith("usr_"));
    assert.equal(u.createdAt, now.toISOString());
    assert.equal(u.updatedAt, now.toISOString());
    assert.equal(u.email, "test.user@eps.local");
    assert.equal(u.area?.id, "area_machining_1");
    assert.equal(u.role.name, RoleName.ENGINEERING_STAFF);
    assert.equal(u.isActive, true);
  });

  it("update: id/createdAt dipertahankan, updatedAt diperbarui", () => {
    const current = byRole(RoleName.ENGINEERING_STAFF);
    const now = new Date("2026-08-12T09:00:00Z");
    const next = updateMockUser(current, { ...base(), name: "Nama Baru", role: RoleName.VIEWER, isActive: false }, now);
    assert.equal(next.id, current.id);
    assert.equal(next.createdAt, current.createdAt);
    assert.equal(next.updatedAt, now.toISOString());
    assert.equal(next.name, "Nama Baru");
    assert.equal(next.role.name, RoleName.VIEWER);
    assert.equal(next.isActive, false);
  });

  it("mockPasswordHash: placeholder, tidak plaintext", () => {
    assert.equal(mockPasswordHash("Secret123!"), "argon2-mock:Secret123!");
  });
});

describe("toUserPatch + applyUserOverrides (persist mock)", () => {
  const seed = seedMockUsers();
  const seedIds = seedUserIds(seed);

  it("create user → patch created, hasil apply muncul di daftar", () => {
    const u = createMockUser(base());
    const patch = toUserPatch(u, seedIds);
    assert.equal(patch.created, u);
    const next = applyUserOverrides(seed, [patch]);
    assert.equal(next.length, seed.length + 1);
    assert.ok(next.some((x) => x.id === u.id));
  });

  it("create user dengan password → passwordHash ikut tersimpan (agar bisa login)", () => {
    const u = createMockUser(base());
    const patch = toUserPatch(u, seedIds, base().password);
    assert.equal(patch.passwordHash, "argon2-mock:Password123!");
  });

  it("edit user seed → patch field parsial, tanpa created", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const updated = updateMockUser(u, { ...base(), name: "Rina Baru", role: RoleName.VIEWER, isActive: false });
    const patch = toUserPatch(updated, seedIds, "NewPass123!");
    assert.equal(patch.created, undefined);
    assert.equal(patch.name, "Rina Baru");
    assert.equal(patch.role?.name, RoleName.VIEWER);
    assert.equal(patch.isActive, false);
    assert.equal(patch.passwordHash, "argon2-mock:NewPass123!");

    const next = applyUserOverrides(seed, [patch]);
    const patched = next.find((x) => x.id === u.id)!;
    assert.equal(next.length, seed.length);
    assert.equal(patched.name, "Rina Baru");
    assert.equal(patched.role.name, RoleName.VIEWER);
    assert.equal(patched.isActive, false);
    const untouched = next.find((x) => x.id === "usr_admin")!;
    assert.equal(untouched.name, "Admin");
  });

  it("edit user buatan → tetap snapshot penuh, tidak hilang", () => {
    const created = createMockUser(base());
    const once = applyUserOverrides(seed, [toUserPatch(created, seedIds)]);
    const edited = updateMockUser(created, { ...base(), name: "Edit Baru", role: RoleName.ADMIN });
    const twice = applyUserOverrides(once, [toUserPatch(edited, seedIds)]);
    const found = twice.find((x) => x.id === created.id)!;
    assert.equal(found.name, "Edit Baru");
    assert.equal(found.role.name, RoleName.ADMIN);
    assert.equal(found.createdAt, created.createdAt);
  });

  it("patch role/isActive lama masih berfungsi (regresi)", () => {
    const u = byRole(RoleName.ENGINEERING_STAFF);
    const next = applyUserOverrides(seed, [{ id: u.id, role: { name: RoleName.VIEWER }, isActive: false }]);
    const patched = next.find((x) => x.id === u.id)!;
    assert.equal(patched.role.name, RoleName.VIEWER);
    assert.equal(patched.isActive, false);
  });
});
