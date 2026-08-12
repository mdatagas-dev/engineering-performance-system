import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterAudit, seedMockAudit, type MockAuditItem } from "./audit";

const at = (iso: string): MockAuditItem => ({
  id: `x_${iso}`,
  action: "LOGIN_SUCCESS",
  entityType: "USER",
  entityId: "usr_1",
  before: null,
  after: { lastLoginAt: iso },
  ip: "10.0.0.1",
  userAgent: "ua",
  createdAt: iso,
  user: { id: "usr_1", name: "Staff", email: "staff@eps.local" },
});

const list: MockAuditItem[] = [
  at("2026-08-12T08:00:00Z"),
  at("2026-08-11T08:00:00Z"),
  at("2026-08-10T08:00:00Z"),
  { ...at("2026-08-12T09:00:00Z"), action: "ACCOUNT_LOCKED", ip: "45.137.66.9" },
  { ...at("2026-08-09T08:00:00Z"), action: "LOGIN_FAILED", user: { id: "usr_2", name: "Viewer", email: "viewer@eps.local" } },
];

describe("filterAudit (meniru GET /api/audit)", () => {
  it("tanpa filter: semua entri, diurutkan terbaru dulu", () => {
    const { items, total, page, perPage } = filterAudit(list);
    assert.equal(total, 5);
    assert.equal(page, 1);
    assert.equal(perPage, 20);
    assert.equal(items[0].createdAt, "2026-08-12T09:00:00Z");
    assert.equal(items[items.length - 1].createdAt, "2026-08-09T08:00:00Z");
  });

  it("filter action eksak", () => {
    const { items, total } = filterAudit(list, { action: "ACCOUNT_LOCKED" });
    assert.equal(total, 1);
    assert.equal(items[0].action, "ACCOUNT_LOCKED");
  });

  it("filter userId eksak (mirip where.userId backend)", () => {
    assert.equal(filterAudit(list, { userId: "usr_2" }).total, 1);
    assert.equal(filterAudit(list, { userId: "usr_1" }).total, 4);
    assert.equal(filterAudit(list, { userId: "usr_tidak_ada" }).total, 0);
    for (const it of filterAudit(list, { userId: "usr_1" }).items) {
      assert.equal(it.user.id, "usr_1");
    }
  });

  it("filter kombinasi AND: userId + action + rentang tanggal", () => {
    const { total } = filterAudit(list, {
      userId: "usr_1",
      action: "LOGIN_SUCCESS",
      from: "2026-08-10T00:00:00Z",
      to: "2026-08-12T23:59:59Z",
    });
    assert.equal(total, 3); // usr_1 + LOGIN_SUCCESS + dalam rentang: 08-10, 08-11, 08-12
  });

  it("search cocok di user name, email, IP, atau action", () => {
    assert.equal(filterAudit(list, { search: "viewer" }).total, 1);
    assert.equal(filterAudit(list, { search: "45.137.66.9" }).total, 1);
    assert.equal(filterAudit(list, { search: "LOCKED" }).total, 1);
    assert.equal(filterAudit(list, { search: "staff@eps.local" }).total, 4);
    assert.equal(filterAudit(list, { search: "tidak ada" }).total, 0);
  });

  it("rentang tanggal from/to (inklusif)", () => {
    const { total } = filterAudit(list, {
      from: "2026-08-10T00:00:00Z",
      to: "2026-08-11T23:59:59Z",
    });
    assert.equal(total, 2); // 10 & 11 Agustus saja
  });

  it("hanya from (createdAt >= from)", () => {
    const { total } = filterAudit(list, { from: "2026-08-12T00:00:00Z" });
    assert.equal(total, 2);
  });

  it("pagination: page/perPage + total konsisten", () => {
    const p1 = filterAudit(list, { page: 1, perPage: 2 });
    assert.equal(p1.items.length, 2);
    assert.equal(p1.total, 5);
    const p2 = filterAudit(list, { page: 2, perPage: 2 });
    assert.equal(p2.items.length, 2);
    const p3 = filterAudit(list, { page: 3, perPage: 2 });
    assert.equal(p3.items.length, 1);
    assert.notEqual(p1.items[0].id, p2.items[0].id);
  });

  it("page di luar jangkauan → halaman kosong, total tetap", () => {
    const p9 = filterAudit(list, { page: 9, perPage: 10 });
    assert.equal(p9.items.length, 0);
    assert.equal(p9.total, 5);
  });

  it("clamp seperti backend: page min 1, perPage fallback 20 & maks 100", () => {
    assert.equal(filterAudit(list, { page: 0 }).page, 1);
    assert.equal(filterAudit(list, { perPage: 0 }).perPage, 20);
    assert.equal(filterAudit(list, { perPage: 999 }).perPage, 100);
  });

  it("seed mock berisi aksi login/lock + non-login dengan user lengkap", () => {
    const seed = seedMockAudit();
    assert.ok(seed.length >= 30 && seed.length <= 45);
    const all: MockAuditItem["action"][] = [
      "LOGIN_SUCCESS",
      "LOGIN_FAILED",
      "ACCOUNT_LOCKED",
      "UNLOCKED",
      "USER_ROLE_CHANGED",
      "KPI_CREATED",
      "KPI_UPDATED",
      "KPI_DELETED",
      "RECORD_STATUS_CHANGED",
      "RECORD_CORRECTED",
      "RECORD_UPDATED",
      "RECORD_DELETED",
      "BACKUP_RESTORED",
    ];
    for (const it of seed) {
      assert.ok(all.includes(it.action));
      assert.ok(it.user.email && it.user.name && it.ip && it.userAgent && it.createdAt);
      assert.ok(it.entityType && it.entityId);
    }
    assert.ok(seed.some((it) => it.action === "ACCOUNT_LOCKED"));
    assert.ok(seed.some((it) => it.action === "UNLOCKED"));
    const nonLogin = seed.filter((it) => !["LOGIN_SUCCESS", "LOGIN_FAILED", "ACCOUNT_LOCKED", "UNLOCKED"].includes(it.action));
    assert.ok(nonLogin.length >= 15, `non-login entries ${nonLogin.length}`);
    for (const it of nonLogin) {
      assert.ok(it.before || it.after, `entitas ${it.entityId} punya before/after`);
    }
    assert.ok(seed.some((it) => it.action === "USER_ROLE_CHANGED"));
    assert.ok(seed.some((it) => it.action === "KPI_CREATED"));
    assert.ok(seed.some((it) => it.action === "RECORD_STATUS_CHANGED"));
    assert.ok(seed.some((it) => it.action === "BACKUP_RESTORED"));
  });
});
