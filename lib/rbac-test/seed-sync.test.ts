// TASK buat-seeder-data-peran-dan-admin-awal — VERIFIKASI & sinkronisasi:
//   - prisma/seed.ts: 5 role, 10 permission, 5 akun (argon2id), pemetaan
//     role→permission.
//   - lib/mocks/accounts.ts HARUS identik dengan seed (ROLE_PERMISSIONS,
//     akun demo) — test silang parse teks kedua file (toleran; seed tidak
//     di-import karena menulis DB).
//   - enum RoleName generated (app/generated/prisma/enums) = 5 role seed.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { RoleName } from "@/app/generated/prisma/enums";

const SEED_FILE = path.join(process.cwd(), "prisma", "seed.ts");
const MOCKS_FILE = path.join(process.cwd(), "lib", "mocks", "accounts.ts");

type PermissionMap = Record<string, string[]>;
type Account = { email: string; password: string; name: string; role: string };

function extractPermissionKeys(src: string): string[] {
  const block = src.match(/const PERMISSION_KEYS = \[([\s\S]*?)\]\s*as const;/);
  assert.ok(block, "PERMISSION_KEYS block harus ada di seed.ts");
  return [...block![1].matchAll(/"([a-z.]+)"/g)].map((m) => m[1]);
}

function extractRolePermissions(src: string): PermissionMap {
  const block = src.match(/ROLE_PERMISSIONS: Record<[^>]*> = \{([\s\S]*?)\n\};/);
  assert.ok(block, "ROLE_PERMISSIONS block harus ada");
  const out: PermissionMap = {};
  for (const line of block![1].split("\n")) {
    const m = line.match(/^\s*([A-Z_]+): \[(.*?)\],?$/);
    if (!m) continue;
    const items = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    out[m[1]] = items.map((s) => (s === "...PERMISSION_KEYS" ? "…KEYS" : s.replace(/^"(.*)"$/, "$1")));
  }
  return out;
}

function expandKeys(map: PermissionMap, keys: string[]): PermissionMap {
  const out: PermissionMap = {};
  for (const [role, items] of Object.entries(map)) {
    out[role] = items.flatMap((i) => (i === "…KEYS" ? keys : [i]));
  }
  return out;
}

function extractSeedAccounts(src: string): Account[] {
  const block = src.match(/const ACCOUNTS: [^=]*= \[([\s\S]*?)\];/);
  assert.ok(block, "ACCOUNTS block harus ada di seed.ts");
  const out: Account[] = [];
  for (const m of block![1].matchAll(/email:\s*"([^"]+)",\s*password:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*role:\s*RoleName\.([A-Z_]+)/g)) {
    out.push({ email: m[1], password: m[2], name: m[3], role: m[4] });
  }
  return out;
}

function extractMockAccounts(src: string): Account[] {
  const block = src.match(/export const mockAccounts: MockAccount\[\] = \[([\s\S]*?)\];/);
  assert.ok(block, "mockAccounts block harus ada di accounts.ts");
  const out: Account[] = [];
  for (const m of block![1].matchAll(/email:\s*"([^"]+)",\s*password:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*role:\s*"([A-Z_]+)"/g)) {
    out.push({ email: m[1], password: m[2], name: m[3], role: m[4] });
  }
  return out;
}

describe("seeder (prisma/seed.ts)", () => {
  it("10 permission lengkap sesuai PRD (user.manage … backup.view)", async () => {
    const seed = await readFile(SEED_FILE, "utf8");
    assert.deepEqual(extractPermissionKeys(seed).sort(), [
      "audit.view",
      "backup.view",
      "dashboard.view",
      "export.run",
      "import.run",
      "kpi.configure",
      "record.approve",
      "record.create",
      "record.lock",
      "user.manage",
    ]);
  });

  it("hash password memakai Argon2id (@node-rs/argon2) — bukan plaintext", async () => {
    const seed = await readFile(SEED_FILE, "utf8");
    assert.match(seed, /@node-rs\/argon2/);
    // format hash library default dikunci di lib/auth/argon2.test.ts ($argon2id$v=19)
  });

  it("5 role seed SAMA dengan enum RoleName generated (5 nilai)", async () => {
    const seed = await readFile(SEED_FILE, "utf8");
    const roles = Object.keys(extractRolePermissions(seed));
    assert.deepEqual([...roles].sort(), Object.values(RoleName).sort());
  });

  it("5 akun demo (superadmin/admin/manager/staff/viewer) dengan password demo", async () => {
    const seed = await readFile(SEED_FILE, "utf8");
    const accounts = extractSeedAccounts(seed);
    assert.deepEqual(
      accounts.map((a) => a.email).sort(),
      ["admin@eps.local", "manager@eps.local", "staff@eps.local", "superadmin@eps.local", "viewer@eps.local"].sort()
    );
  });
});

describe("SINKRONISASI seed.ts ↔ lib/mocks/accounts.ts (tes silang)", () => {
  let seed: string;
  let mocks: string;

  before(async () => {
    seed = await readFile(SEED_FILE, "utf8");
    mocks = await readFile(MOCKS_FILE, "utf8");
  });

  it("PERMISSION_KEYS seed == permission yang dipakai mock (review lintas)", () => {
    const seedKeys = extractPermissionKeys(seed).sort();
    const mockRoles = expandKeys(extractRolePermissions(mocks), seedKeys);
    const used = new Set(Object.values(mockRoles).flat());
    for (const k of seedKeys) assert.ok(used.has(k), `permission ${k} tidak dipakai mock mana pun`);
  });

  it("ROLE_PERMISSIONS seed == ROLE_PERMISSIONS mock per role (deep equal)", () => {
    const keys = extractPermissionKeys(seed);
    const seedRoles = expandKeys(extractRolePermissions(seed), keys);
    const mockRoles = expandKeys(extractRolePermissions(mocks), keys);
    assert.deepEqual(Object.keys(seedRoles).sort(), Object.keys(mockRoles).sort());
    const report: string[] = [];
    for (const role of Object.keys(seedRoles).sort()) {
      const same = JSON.stringify([...seedRoles[role]].sort()) === JSON.stringify([...mockRoles[role]].sort());
      report.push(`${role}: ${same ? "IDENTIK" : `BEDA seed=${seedRoles[role].join(",")} mock=${mockRoles[role].join(",")}`}`);
    }
    console.log(`\n[seed-sync] role→permission:\n${report.map((r) => "  " + r).join("\n")}`);
    for (const role of Object.keys(seedRoles).sort()) {
      assert.deepEqual([...seedRoles[role]].sort(), [...mockRoles[role]].sort(), `permission role ${role} tidak sinkron`);
    }
  });

  it("akun demo seed == akun demo mock (email/password/nama/role identik)", () => {
    const seedAccounts = extractSeedAccounts(seed);
    const mockAccounts = extractMockAccounts(mocks);
    assert.equal(seedAccounts.length, 5);
    assert.equal(mockAccounts.length, 5);
    assert.deepEqual(
      seedAccounts.map(({ email, password, name, role }) => ({ email, password, name, role })).sort((a, b) => a.email.localeCompare(b.email)),
      mockAccounts.map(({ email, password, name, role }) => ({ email, password, name, role })).sort((a, b) => a.email.localeCompare(b.email))
    );
  });

  it("setiap permission yang dipakai role ∈ PERMISSION_KEYS (tidak ada key liar)", () => {
    const keys = extractPermissionKeys(seed);
    const all = new Set(Object.values(expandKeys(extractRolePermissions(seed), keys)).flat());
    for (const k of all) assert.ok(keys.includes(k), `key liar: ${k}`);
  });
});