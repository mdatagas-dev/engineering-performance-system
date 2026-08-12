// TASK "terapkan-mekanisme-append-only-tamper-resistant" — VERIFIKASI trigger
// DB enforce_history_immutability (migrasi sudah ada, agen migrasi lain).
// DB offline → parse teks migration.sql (node:test), TIDAK mengedit prisma/**.
// Desain/konteks append-only: lihat lib/audit/immutability.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { IMMUTABLE_TABLES, isImmutableTable } from "./immutability";

const ROOT = new URL("../../", import.meta.url).pathname;
const sql = readFileSync(
  `${ROOT}prisma/migrations/enforce_history_immutability/migration.sql`,
  "utf8"
);

// ---- parser teks sederhana ----
const triggers = [...sql.matchAll(/CREATE TRIGGER "?(\w+)"?\s+BEFORE (UPDATE OR DELETE|DELETE|UPDATE) ON "?(\w+)"?\s+FOR EACH ROW EXECUTE FUNCTION "?(\w+)"?/g)].map(
  (m) => ({ name: m[1], operation: m[2], table: m[3], fn: m[4] })
);

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

describe("enforce_history_immutability (append-only)", () => {
  it("fungsi trigger menolak UPDATE/DELETE langsung (cek pg_trigger_depth <= 1)", () => {
    assert.ok(has(sql, /CREATE\s+FUNCTION\s+enforce_history_immutability/), "fungsi trigger tidak ada");
    assert.ok(has(sql, /pg_trigger_depth\(\)\s*<=\s*1/), "guard depth 1 (operasi langsung) harus ada");
    assert.ok(has(sql, /RAISE\s+EXCEPTION\s+'Riwayat immutable/), "exception penolakan harus ada");
  });

  it("cakupan trigger mencakup audit_logs (wajib) + production_record_versions", () => {
    for (const table of IMMUTABLE_TABLES) {
      assert.ok(
        triggers.some((t) => t.table === table),
        `tidak ada trigger untuk ${table}`
      );
    }
    // Tidak ada trigger ke tabel lain yang tak terduga (daftar desain = kontrak).
    const covered = triggers.map((t) => t.table);
    assert.deepEqual(new Set(covered), new Set([...IMMUTABLE_TABLES]));
  });

  it("semua trigger BEFORE UPDATE OR DELETE FOR EACH ROW, memakai fungsi bersama", () => {
    for (const t of triggers) {
      assert.equal(t.operation, "UPDATE OR DELETE", `trigger ${t.name}`);
      assert.equal(t.fn, "enforce_history_immutability", `fungsi trigger ${t.name}`);
    }
    assert.equal(triggers.length, IMMUTABLE_TABLES.length);
  });

  it("pengecualian FK (depth >= 2) diakomodasi trigger — komentar migrasi menyebut kasusnya", () => {
    assert.ok(
      has(sql, /pg_trigger_depth\(\)\s*>=\s*2/i) || has(sql, /RETURN\s+COALESCE\(NEW,\s*OLD\)/),
      "trigger harus mengembalikan NEW/OLD untuk aksi FK bertingkat"
    );
    // audit_logs: DELETE users -> user_id NULL (SET NULL); versions: CASCADE
    assert.ok(
      has(sql, /SET NULL/i),
      "komentar migrasi harus menjelaskan pengecualian ON DELETE SET NULL"
    );
  });

  it("helper isImmutableTable mencerminkan daftar desain", () => {
    assert.ok(isImmutableTable("audit_logs"));
    assert.ok(isImmutableTable("production_record_versions"));
    assert.ok(!isImmutableTable("users"));
    assert.equal(IMMUTABLE_TABLES.length, 2);
  });

  it("konsistensi desain: tidak ada update/delete auditLog di kode aplikasi", () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.includes("generated") || entry.name === "node_modules" || entry.name === ".next") continue;
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(p);
      }
      return out;
    };
    const offenders: string[] = [];
    for (const file of walk(`${ROOT}app`).concat(walk(`${ROOT}lib`))) {
      const text = readFileSync(file, "utf8");
      if (/\bauditLog\.(update|delete|updateMany|deleteMany|upsert)\b/.test(text)) {
        offenders.push(file);
      }
    }
    assert.deepEqual(offenders, [], `mutasi auditLog ditemukan: ${offenders.join(", ")}`);
  });

  it("produksi versi ditulis append-only (create) di lib/records/versioning.ts", () => {
    const src = readFileSync(`${ROOT}lib/records/versioning.ts`, "utf8");
    assert.match(src, /productionRecordVersion\.create/);
    assert.ok(!/\bproductionRecordVersion\.(update|delete|upsert)\b/.test(src), "versi harus create-only");
  });
});