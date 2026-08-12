import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterUsers, seedMockUsers, type MockUser } from "./users";
import { RoleName } from "@/app/generated/prisma/enums";

const at = (iso: string, name = "Staff", email = "staff@eps.local"): MockUser => ({
  id: `x_${iso}`,
  email,
  name,
  role: { name: RoleName.ENGINEERING_STAFF },
  area: null,
  isActive: true,
  createdAt: iso,
  updatedAt: iso,
});

const list: MockUser[] = [
  at("2026-08-12T08:00:00Z", "Rina Kusuma", "rina@eps.local"),
  at("2026-08-11T08:00:00Z", "Budi Santoso", "budi@eps.local"),
  { ...at("2026-08-10T08:00:00Z", "Super Admin", "superadmin@eps.local"), role: { name: RoleName.SUPER_ADMIN } },
  { ...at("2026-08-09T08:00:00Z", "Andi Wijaya", "andi@eps.local"), isActive: false, role: { name: RoleName.VIEWER } },
];

describe("filterUsers (meniru GET /api/users)", () => {
  it("tanpa filter: semua, diurutkan terdaftar terbaru dulu", () => {
    const { items, total, page, perPage } = filterUsers(list);
    assert.equal(total, 4);
    assert.equal(page, 1);
    assert.equal(perPage, 10);
    assert.equal(items[0].createdAt, "2026-08-12T08:00:00Z");
    assert.equal(items[items.length - 1].createdAt, "2026-08-09T08:00:00Z");
  });

  it("filter role eksak", () => {
    const { items, total } = filterUsers(list, { role: RoleName.SUPER_ADMIN });
    assert.equal(total, 1);
    assert.equal(items[0].name, "Super Admin");
  });

  it("search lintas nama dan email (case-insensitive)", () => {
    assert.equal(filterUsers(list, { search: "RINA" }).total, 1);
    assert.equal(filterUsers(list, { search: "BUDI@EPS.LOCAL" }).total, 1);
    assert.equal(filterUsers(list, { search: "tidak ada" }).total, 0);
  });

  it("pagination: perPage + halaman 2", () => {
    const p1 = filterUsers(list, { page: 1, perPage: 2 });
    const p2 = filterUsers(list, { page: 2, perPage: 2 });
    assert.equal(p1.total, 4);
    assert.equal(p1.items.length, 2);
    assert.equal(p2.items.length, 2);
    assert.notEqual(p1.items[0].id, p2.items[0].id);
    const beyond = filterUsers(list, { page: 3, perPage: 2 });
    assert.equal(beyond.items.length, 0);
    assert.equal(beyond.total, 4);
  });

  it("nilai page/perPage tidak valid dipaksa ke default, seed berisi 8-12 user", () => {
    assert.equal(filterUsers(list, { page: 0, perPage: 0 }).perPage, 10);
    const seed = seedMockUsers();
    assert.ok(seed.length >= 8 && seed.length <= 12);
    const roles = new Set(seed.map((u) => u.role.name));
    assert.deepEqual(roles, new Set(Object.values(RoleName)));
  });
});
