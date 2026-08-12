// TASK "buat-skema-tabel-audit-log-migrasi" — VERIFIKASI konsistensi
// prisma/schema.prisma (model AuditLog) vs prisma/migrations/add_audit_log/
// migration.sql. DB offline → test ini murni parse teks (node:test), tanpa
// koneksi. Migration add_audit_log, TRIGGER immutabilitas, dan model sudah
// dibuat oleh agen skema/migrasi lain — kita hanya memeriksa kontrak, TIDAK
// mengedit prisma/**.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../../", import.meta.url).pathname;

const schemaSql = readFileSync(`${ROOT}prisma/schema.prisma`, "utf8");
const migrationSql = readFileSync(
  `${ROOT}prisma/migrations/add_audit_log/migration.sql`,
  "utf8"
);
const initMigrationSql = readFileSync(
  `${ROOT}prisma/migrations/init_auth_rbac/migration.sql`,
  "utf8"
);

// ---- parser teks sederhana (schema.prisma) ----
type SchemaField = { field: string; dbColumn: string | null; type: string; nullable: boolean };
type SchemaModel = {
  table: string | null;
  fields: SchemaField[];
  indexes: string[][];
  fk: { field: string; table: string; onDelete: string } | null;
};

function parseSchemaModel(src: string, modelName: string): SchemaModel {
  const start = src.indexOf(`model ${modelName} {`);
  assert.ok(start >= 0, `model ${modelName} tidak ditemukan di schema.prisma`);
  const end = src.indexOf("\n}", start);
  const block = src.slice(start + modelName.length + 2, end);

  const fields: SchemaField[] = [];
  const indexes: string[][] = [];
  let table: string | null = null;
  let fk: SchemaModel["fk"] = null;

  const mapCol = (line: string) => line.match(/@map\("([^"]+)"\)/)?.[1] ?? null;

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("@@index(")) {
      const inner = line.match(/@@index\(\[([^\]]+)\]\)/)?.[1] ?? "";
      indexes.push(inner.split(",").map((s) => s.trim()));
    } else if (line.startsWith("@@map(")) {
      table = line.match(/@@map\("([^"]+)"\)/)?.[1] ?? null;
    } else if (line.startsWith("@")) {
      continue; // atribut model lain (mis. @@unique) — tak relevan di sini
    } else {
      const head = line.match(/^(\w+)\s+(\w+)(\?)?/);
      if (!head) continue;
      const rel = line.match(/@relation\(fields: \[(\w+)\], references: \[(\w+)\], onDelete: (\w+)/);
      if (rel) {
        fk = { field: rel[1], table: rel[2], onDelete: rel[3] };
      }
      fields.push({
        field: head[1],
        type: head[2],
        dbColumn: mapCol(line),
        nullable: head[3] === "?",
      });
    }
  }
  return { table, fields, indexes, fk };
}

// ---- parser teks sederhana (migration.sql) ----
type MigrationTable = {
  name: string;
  columns: { name: string; type: string; notNull: boolean; default: string | null }[];
  indexes: { name: string; columnText: string }[];
  fks: { name: string; column: string; refTable: string; onDelete: string }[];
};

function parseMigrationTables(src: string): MigrationTable[] {
  const tables: MigrationTable[] = [];
  for (const m of src.matchAll(/CREATE TABLE "([^"]+)"\s*\(([\s\S]*?)\);/g)) {
    const name = m[1];
    const columns: MigrationTable["columns"] = [];
    for (const row of m[2].split("\n")) {
      const c = row.match(/^\s*"(\w+)"\s+([A-Z()0-9,_ ]+?)(NOT NULL)?\s*(DEFAULT (.+))?,?\s*$/);
      if (c) {
        columns.push({ name: c[1], type: c[2].trim(), notNull: !!c[3], default: c[5] ?? null });
      }
    }
    tables.push({ name, columns, indexes: [], fks: [] });
  }
  // FK Prisma 7 ditulis sebagai ALTER TABLE terpisah di luar CREATE TABLE.
  for (const f of src.matchAll(
    /ALTER TABLE "(\w+)" ADD CONSTRAINT "(\w+)" FOREIGN KEY \("(\w+)"\) REFERENCES "(\w+)"\("(\w+)"\) ON DELETE (SET NULL|CASCADE|RESTRICT|NO ACTION)/g
  )) {
    const table = tables.find((t) => t.name === f[1]);
    table?.fks.push({ name: f[2], column: f[3], refTable: f[4], onDelete: f[6] });
  }
  return tables;
}

function parseMigrationIndexes(src: string): { table: string; name: string; columnText: string }[] {
  const out: { table: string; name: string; columnText: string }[] = [];
  for (const m of src.matchAll(/CREATE INDEX "([^"]+)" ON "([^"]+)"\(([^)]+)\);/g)) {
    out.push({
      name: m[1],
      table: m[2],
      // normalisasi: drop tanda kutip identifier SQL — bandingkan nama kolom polos
      columnText: m[3].replaceAll('"', "").replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

const schemaAuditLog = parseSchemaModel(schemaSql, "AuditLog");
const tables = parseMigrationTables(migrationSql);
const indexes = parseMigrationIndexes(migrationSql);
const auditLogTable = tables.find((t) => t.name === "audit_logs");
const col = (name: string) => auditLogTable?.columns.find((c) => c.name === name);

describe("AuditLog schema vs migrasi add_audit_log", () => {
  it("audit_logs DIBUAT di migrasi add_audit_log, BUKAN di init_auth_rbac", () => {
    assert.ok(auditLogTable, "CREATE TABLE audit_logs tidak ada di add_audit_log");
    assert.ok(!initMigrationSql.includes("audit_logs"), "init_auth_rbac tidak boleh membuat audit_logs");
  });

  it("nama tabel konsisten (@@map = audit_logs)", () => {
    assert.equal(schemaAuditLog.table, "audit_logs");
    assert.equal(auditLogTable!.name, "audit_logs");
  });

  it("mapping kolom Prisma (db column via @@map) MATCHING kolom SQL", () => {
    const expected: [string, string, string, boolean][] = [
      ["id", "id", "UUID", false],
      ["userId", "user_id", "UUID", true],
      ["action", "action", "TEXT", false],
      ["entityType", "entity_type", "TEXT", false],
      ["entityId", "entity_id", "TEXT", true],
      ["before", "before", "JSONB", true],
      ["after", "after", "JSONB", true],
      ["ip", "ip", "TEXT", true],
      ["userAgent", "user_agent", "TEXT", true],
      ["createdAt", "created_at", "TIMESTAMP(3)", false],
    ];
    assert.ok(schemaAuditLog.fields.length >= expected.length, "field schema kurang dari migrasi");
    for (const [field, dbCol, sqlType, nullable] of expected) {
      const sf = schemaAuditLog.fields.find((f) => f.field === field);
      assert.ok(sf, `field schema ${field} tidak ditemukan`);
      assert.equal(sf!.dbColumn ?? sf!.field, dbCol, `@map field ${field}`);
      const mc = col(dbCol);
      assert.ok(mc, `kolom SQL ${dbCol} tidak ada di CREATE TABLE`);
      assert.equal(mc!.type, sqlType, `tipe kolom ${dbCol}`);
      assert.equal(mc!.notNull, !nullable, `nullability kolom ${dbCol}`);
    }
  });

  it("default createdAt = CURRENT_TIMESTAMP(3) & id UUID default uuid", () => {
    assert.match(col("created_at")!.default ?? "", /CURRENT_TIMESTAMP/i);
    const idField = schemaAuditLog.fields.find((f) => f.field === "id");
    assert.equal(idField!.type, "String");
  });

  it("indeks schema == indeks migrasi (user_id, entity_type+entity_id, action+created_at)", () => {
    const expected = [
      ["userId"],
      ["entityType", "entityId"],
      ["action", "createdAt"],
    ];
    assert.deepEqual(schemaAuditLog.indexes, expected);

    const mapDb = (cols: string[]) =>
      cols.map((c) => schemaAuditLog.fields.find((f) => f.field === c)!.dbColumn ?? c).join(", ");
    for (const cols of expected) {
      const dbText = mapDb(cols);
      assert.ok(
        indexes.some((i) => i.table === "audit_logs" && i.columnText === dbText),
        `indeks migrasi (${dbText}) tidak ditemukan`
      );
    }
  });

  it("FK user_id -> users(id) ON DELETE SET NULL (relasi User SetNull)", () => {
    assert.equal(schemaAuditLog.fk?.field, "userId");
    assert.equal(schemaAuditLog.fk?.table, "id");
    assert.equal(schemaAuditLog.fk?.onDelete, "SetNull");
    const fk = auditLogTable!.fks.find((f) => f.name === "audit_logs_user_id_fkey");
    assert.ok(fk, "FK audit_logs_user_id_fkey tidak ada di migrasi");
    assert.equal(fk!.column, "user_id");
    assert.equal(fk!.refTable, "users");
    assert.equal(fk!.onDelete, "SET NULL");
  });
});