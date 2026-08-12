// TASK buat-migrasi-tabel-users-roles-permissions-audit-l — VERIFIKASI
// ketat migrasi RBAC:
//   - init_auth_rbac: users, roles, permissions, user_roles, role_permissions
//   - add_audit_log (migrasi TERPISAH — terkonfirmasi): audit_logs
//   - PK/FK/unique (email unique, role name unique, permission key unique,
//     composite PK pivot user_roles & role_permissions, FK ON DELETE CASCADE/
//     SET NULL) + kesesuaian model schema.prisma (nama kolom @map) vs SQL.
// DB offline → semuanya parse teks migration.sql + schema.prisma.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");

function parseTables(sql: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const re = /CREATE TABLE "([a-z_]+)"\s*\(([\s\S]*?)\n\);/g;
  for (const m of sql.matchAll(re)) {
    const cols = [...m[2].matchAll(/^\s*"([a-z_]+)"\s+/gm)].map((x) => x[1]);
    map.set(m[1], cols);
  }
  return map;
}

function parseIndexes(
  sql: string
): Map<string, { unique: boolean; table: string; columns: string[] }[]> {
  const map = new Map<string, { unique: boolean; table: string; columns: string[] }[]>();
  const re = /CREATE (UNIQUE )?INDEX "([a-z0-9_]+)" ON "([a-z_]+)"\s*\(([^)]*)\)/g;
  for (const m of sql.matchAll(re)) {
    const cols = [...m[4].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
    const entry = { unique: m[1] !== undefined, table: m[3], columns: cols };
    const list = map.get(m[2]) ?? [];
    list.push(entry);
    map.set(m[2], list);
  }
  return map;
}

function parseForeignKeys(
  sql: string
): { table: string; constraint: string; columns: string[]; refTable: string; refColumn: string; onDelete: string }[] {
  const out: { table: string; constraint: string; columns: string[]; refTable: string; refColumn: string; onDelete: string }[] = [];
  const re =
    /ALTER TABLE "([a-z_]+)" ADD CONSTRAINT "([a-z0-9_]+)" FOREIGN KEY \(("[a-z_]+"(?:, "[a-z_]+")*)\) REFERENCES "([a-z_]+)"\("([a-z_]+)"\) ON DELETE ([A-Z ]+?)(?= ON UPDATE)/g;
  for (const m of sql.matchAll(re)) {
    const cols = [...m[3].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
    out.push({ table: m[1], constraint: m[2], columns: cols, refTable: m[4], refColumn: m[5], onDelete: m[6] });
  }
  return out;
}

function parseEnum(sql: string, name: string): string[] {
  const m = sql.match(new RegExp(`CREATE TYPE "${name}" AS ENUM \\(([^)]*)\\)`));
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

// Tipe skalar + enum Prisma — field dengan tipe di luar ini = relasi
// (tanpa atribut @relation), BUKAN kolom; dilewati saat cocokkan model↔SQL.
const SCALAR_AND_ENUM_TYPES = new Set([
  "String",
  "Int",
  "BigInt",
  "Float",
  "Boolean",
  "DateTime",
  "Json",
  "RoleName",
  "RecordStatus",
  "LayoutType",
  "NotificationType",
  "NotificationSeverity",
  "HealthStatus",
  "BackupStatus",
  "BackupType",
  "ImportStatus",
]);

function parseModels(prisma: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const re = /model (\w+)\s*\{([\s\S]*?)\n\}/g;
  for (const m of prisma.matchAll(re)) {
    const cols: string[] = [];
    for (const line of m[2].split("\n")) {
      if (!/^\s{2}\w/.test(line)) continue;
      if (line.includes("@relation")) continue;
      const field = line.match(/^\s{2}(\w+)\s+([\w]+)(?:\?|\[\])?/);
      if (!field) continue;
      if (!SCALAR_AND_ENUM_TYPES.has(field[2])) continue;
      const mapCol = line.match(/@map\("([^"]+)"\)/);
      cols.push(mapCol ? mapCol[1] : field[1]);
    }
    map.set(m[1], cols);
  }
  return map;
}

async function readMigration(dir: string): Promise<string> {
  return readFile(path.join(MIGRATIONS, dir, "migration.sql"), "utf8");
}

describe("migrasi init_auth_rbac (tabel inti RBAC)", () => {
  it("membuat 6 tabel inti: users, roles, permissions, user_roles, role_permissions (+areas)", async () => {
    const sql = await readMigration("init_auth_rbac");
    const tables = parseTables(sql);
    for (const t of ["users", "roles", "permissions", "user_roles", "role_permissions", "areas"]) {
      assert.ok(tables.has(t), `tabel ${t} harus ada di init_auth_rbac`);
    }
  });

  it("kolom users cocok dengan schema.prisma model User (email, password_hash, is_active, …)", async () => {
    const sql = await readMigration("init_auth_rbac");
    const tables = parseTables(sql);
    const prisma = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    const models = parseModels(prisma);

    const expected = models.get("User")!;
    const actual = tables.get("users")!;
    for (const col of expected) {
      assert.ok(actual.includes(col), `kolom users.${col} hilang dari migration`);
    }
    assert.equal(tables.get("roles")!.length > 0, true);
  });

  it("PK & kolom inti per tabel (roles: name enum; permissions: key unique; pivot composite PK)", async () => {
    const sql = await readMigration("init_auth_rbac");
    const tables = parseTables(sql);
    const fks = parseForeignKeys(sql);

    for (const col of ["name", "description", "created_at", "updated_at"]) {
      assert.ok(tables.get("roles")!.includes(col), `roles.${col} hilang`);
    }
    for (const col of ["key", "description", "created_at"]) {
      assert.ok(tables.get("permissions")!.includes(col), `permissions.${col} hilang`);
    }

    assert.match(sql, /CONSTRAINT "user_roles_pkey" PRIMARY KEY \("user_id","role_id"\)/);
    assert.match(sql, /CONSTRAINT "role_permissions_pkey" PRIMARY KEY \("role_id","permission_id"\)/);

    const ur = fks.filter((f) => f.constraint.startsWith("user_roles_"));
    assert.deepEqual(ur.map((f) => [f.table, f.refTable, f.onDelete]), [
      ["user_roles", "users", "CASCADE"],
      ["user_roles", "roles", "CASCADE"],
    ]);
    const rp = fks.filter((f) => f.constraint.startsWith("role_permissions_"));
    assert.deepEqual(rp.map((f) => [f.table, f.refTable, f.onDelete]), [
      ["role_permissions", "roles", "CASCADE"],
      ["role_permissions", "permissions", "CASCADE"],
    ]);
  });

  it("unique: users.email, roles.name, permissions.key (+ areas name/line_code)", async () => {
    const sql = await readMigration("init_auth_rbac");
    const idx = parseIndexes(sql);

    const unique = (name: string, table: string, cols: string[]) => {
      const e = idx.get(name)?.[0];
      assert.ok(e, `index ${name} harus ada`);
      assert.equal(e!.unique, true, `${name} harus UNIQUE`);
      assert.equal(e!.table, table);
      assert.deepEqual(e!.columns, cols);
    };
    unique("users_email_key", "users", ["email"]);
    unique("roles_name_key", "roles", ["name"]);
    unique("permissions_key_key", "permissions", ["key"]);
    unique("areas_name_key", "areas", ["name"]);
    unique("areas_line_code_key", "areas", ["line_code"]);
  });

  it("enum RoleName = 5 nilai (SUPER_ADMIN/ADMIN/ENGINEERING_MANAGER/ENGINEERING_STAFF/VIEWER)", async () => {
    const sql = await readMigration("init_auth_rbac");
    assert.deepEqual(parseEnum(sql, "RoleName"), [
      "SUPER_ADMIN",
      "ADMIN",
      "ENGINEERING_MANAGER",
      "ENGINEERING_STAFF",
      "VIEWER",
    ]);
  });
});

describe("migrasi add_audit_log (TABEL TERPISAH dari init_auth_rbac — terkonfirmasi)", () => {
  it("audit_logs + kolom lengkap (user_id nullable, before/after JSONB, action, entity_*)", async () => {
    const sql = await readMigration("add_audit_log");
    const tables = parseTables(sql);
    const cols = tables.get("audit_logs");
    assert.ok(cols, "tabel audit_logs harus ada di add_audit_log (bukan init_auth_rbac)");
    for (const c of ["id", "user_id", "action", "entity_type", "entity_id", "before", "after", "ip", "user_agent", "created_at"]) {
      assert.ok(cols!.includes(c), `audit_logs.${c} hilang`);
    }
  });

  it("index (user_id, entity_type+entity_id, action+created_at) + FK user_id → users ON DELETE SET NULL", async () => {
    const sql = await readMigration("add_audit_log");
    const idx = parseIndexes(sql);
    for (const name of ["audit_logs_user_id_idx", "audit_logs_entity_type_entity_id_idx", "audit_logs_action_created_at_idx"]) {
      assert.ok(idx.has(name), `index ${name} harus ada`);
    }
    assert.deepEqual(idx.get("audit_logs_entity_type_entity_id_idx")![0].columns, ["entity_type", "entity_id"]);
    const fk = parseForeignKeys(sql).find((f) => f.constraint === "audit_logs_user_id_fkey");
    assert.ok(fk, "FK audit_logs_user_id_fkey harus ada");
    assert.equal(fk!.refTable, "users");
    assert.equal(fk!.onDelete, "SET NULL");
  });
});

describe("kesesuaian schema.prisma vs migration (model @map == kolom SQL)", () => {
  it("model User/Role/Permission/UserRole/RolePermission/AuditLog: kolom model ⊆ kolom tabel", async () => {
    const prisma = await readFile(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    const models = parseModels(prisma);

    const init = parseTables(await readMigration("init_auth_rbac"));
    const audit = parseTables(await readMigration("add_audit_log"));
    const sessions = parseTables(await readMigration("add_sessions"));

    const expect: [string, string, Map<string, string[]>][] = [
      ["User", "users", init],
      ["Role", "roles", init],
      ["Permission", "permissions", init],
      ["UserRole", "user_roles", init],
      ["RolePermission", "role_permissions", init],
      ["AuditLog", "audit_logs", audit],
      ["Session", "sessions", sessions],
    ];
    for (const [model, table, tables] of expect) {
      const cols = models.get(model);
      assert.ok(cols, `model ${model} harus ada di schema.prisma`);
      const actual = tables.get(table);
      assert.ok(actual, `tabel ${table} harus ada`);
      for (const col of cols!) {
        assert.ok(actual!.includes(col), `kolom ${model}.${col} tidak ada di tabel ${table}`);
      }
    }
  });

  it("sessions (add_sessions): token_hash unique + FK userId → users CASCADE", async () => {
    const sql = await readMigration("add_sessions");
    const idx = parseIndexes(sql);
    assert.equal(idx.get("sessions_token_hash_key")?.[0].unique, true);
    const fk = parseForeignKeys(sql).find((f) => f.constraint === "sessions_user_id_fkey");
    assert.equal(fk?.refTable, "users");
    assert.equal(fk?.onDelete, "CASCADE");
  });

  it("pivot user_roles & role_permissions TIDAK memiliki kolom id (composite PK murni)", async () => {
    const sql = await readMigration("init_auth_rbac");
    const tables = parseTables(sql);
    assert.equal(tables.get("user_roles")!.includes("id"), false);
    assert.equal(tables.get("role_permissions")!.includes("id"), false);
  });
});