import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAccess, getMenuFor, resolveSessionMenu } from "./menu";
import { RoleName } from "../../app/generated/prisma/enums";

describe("getMenuFor", () => {
  it("SUPER_ADMIN dapat semua menu meski permissions kosong", () => {
    const menu = getMenuFor({ role: RoleName.SUPER_ADMIN, permissions: [] });
    assert.deepEqual(
      menu.map((m) => m.key),
      ["dashboard", "trends", "quality", "data-entry", "transfer", "settings"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "quality")?.children?.map((c) => c.key),
      ["quality.dashboard", "quality.inspection", "quality.defects", "quality.analysis", "quality.trend", "quality.report"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "data-entry")?.children?.map((c) => c.key),
      ["data-entry.records", "data-entry.production-table", "data-entry.approvals", "data-entry.locks"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "transfer")?.children?.map((c) => c.key),
      ["transfer.import", "transfer.export"]
    );
    const settings = menu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
  });

  it("VIEWER: 5 item top-level; settings flat tanpa children", () => {
    const menu = getMenuFor({ role: RoleName.VIEWER, permissions: ["dashboard.view", "export.run"] });
    assert.deepEqual(
      menu.map((m) => m.key),
      ["dashboard", "trends", "data-entry", "transfer", "settings"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "transfer")?.children?.map((c) => c.key),
      ["transfer.export"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "data-entry")?.children?.map((c) => c.key),
      ["data-entry.production-table"]
    );
    const settings = menu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
  });

  it("ENGINEERING_STAFF: 5 item top-level; settings flat", () => {
    const menu = getMenuFor({
      role: RoleName.ENGINEERING_STAFF,
      permissions: ["record.create", "dashboard.view", "import.run", "export.run"],
    });
    assert.deepEqual(
      menu.map((m) => m.key),
      ["dashboard", "trends", "data-entry", "transfer", "settings"]
    );
    assert.deepEqual(
      menu.find((m) => m.key === "data-entry")?.children?.map((c) => c.key),
      ["data-entry.records", "data-entry.production-table"]
    );
    const settings = menu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
  });

  it("ENGINEERING_MANAGER: 5 item top-level; settings flat", () => {
    const menu = getMenuFor({
      role: RoleName.ENGINEERING_MANAGER,
      permissions: ["record.approve", "record.lock", "dashboard.view", "export.run", "kpi.configure", "backup.view"],
    });
    assert.deepEqual(
      menu.map((m) => m.key),
      ["dashboard", "trends", "data-entry", "transfer", "settings"]
    );
    const settings = menu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
  });

  it("ADMIN: 5 item top-level; settings flat", () => {
    const menu = getMenuFor({
      role: RoleName.ADMIN,
      permissions: ["user.manage", "audit.view", "record.create", "record.approve", "record.lock", "dashboard.view", "import.run", "export.run", "kpi.configure", "backup.view"],
    });
    assert.deepEqual(
      menu.map((m) => m.key),
      ["dashboard", "trends", "data-entry", "transfer", "settings"]
    );
    const settings = menu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
  });

  it("tanpa permission -> menu kosong", () => {
    const menu = getMenuFor({ role: RoleName.VIEWER, permissions: [] });
    assert.equal(menu.length, 0);
  });
});

describe("canAccess (gating halaman per permission)", () => {
  it("SUPER_ADMIN bisa semua walau permissions kosong", () => {
    assert.equal(canAccess({ role: RoleName.SUPER_ADMIN, permissions: [] }, "user.manage"), true);
    assert.equal(canAccess({ role: RoleName.SUPER_ADMIN, permissions: [] }, "audit.view"), true);
  });

  it("permission ada di list role → boleh", () => {
    const staff = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create", "dashboard.view"] };
    assert.equal(canAccess(staff, "record.create"), true);
  });

  it("permission tidak ada di list role → tolak", () => {
    const staff = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create", "dashboard.view"] };
    assert.equal(canAccess(staff, "user.manage"), false);
    assert.equal(canAccess(staff, "kpi.configure"), false);
  });

  it("ADMIN (user.manage) boleh ke /users, STAFF tidak", () => {
    const admin = { role: RoleName.ADMIN, permissions: ["user.manage", "audit.view"] };
    const staff = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create"] };
    assert.equal(canAccess(admin, "user.manage"), true);
    assert.equal(canAccess(staff, "user.manage"), false);
  });

  it("audit.view: SUPER_ADMIN & ADMIN boleh, manager/staff/viewer tolak (PRD: audit hanya SA/Admin)", () => {
    const sa = { role: RoleName.SUPER_ADMIN, permissions: [] };
    const admin = { role: RoleName.ADMIN, permissions: ["user.manage", "record.create", "record.approve", "record.lock", "dashboard.view", "import.run", "export.run", "kpi.configure", "audit.view", "backup.view"] };
    const manager = { role: RoleName.ENGINEERING_MANAGER, permissions: ["record.approve", "record.lock", "dashboard.view", "export.run", "kpi.configure", "backup.view"] };
    const staff = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create", "dashboard.view", "import.run", "export.run"] };
    const viewer = { role: RoleName.VIEWER, permissions: ["dashboard.view", "export.run"] };
    assert.equal(canAccess(sa, "audit.view"), true);
    assert.equal(canAccess(admin, "audit.view"), true);
    assert.equal(canAccess(manager, "audit.view"), false);
    assert.equal(canAccess(staff, "audit.view"), false);
    assert.equal(canAccess(viewer, "audit.view"), false);
  });
});

describe("resolveSessionMenu (menu dinamis dari user yang login)", () => {
  it("sama dengan getMenuFor; semua role lihat settings flat", () => {
    const admin = { role: RoleName.ADMIN, permissions: ["user.manage", "audit.view", "dashboard.view"] };
    const staff = { role: RoleName.ENGINEERING_STAFF, permissions: ["record.create", "dashboard.view"] };
    const adminMenu = resolveSessionMenu(admin);
    const staffMenu = resolveSessionMenu(staff);
    assert.deepEqual(adminMenu, getMenuFor(admin));
    assert.deepEqual(staffMenu, getMenuFor(staff));
    const settings = adminMenu.find((m) => m.key === "settings");
    assert.equal(settings?.children, undefined);
    assert.equal(settings?.href, "/settings");
    assert.ok(staffMenu.some((m) => m.key === "settings"));
    assert.equal(staffMenu.find((m) => m.key === "settings")?.href, "/settings");
  });
});
