// TASK buat-layanan-pencatatan-audit-trail — verifikasi peta action audit
// (lib/rbac/audit-map.ts). Test memastikan:
//   - semua route yang MENULIS audit terdaftar di AUDIT_ROUTE_MAP (penulis =
//     prisma.auditLog.create inline ATAU helper writeAudit dari lib/audit),
//   - action di tiap route ∈ AUDIT_ACTIONS (registry lib/audit/record) atau
//     UNREGISTERED_ACTIONS (terpakai tapi belum didaftarkan — lihat laporan),
//   - action dinamis (result.auditAction) hanya di route login (LOGIN_FAILED/
//     ACCOUNT_LOCKED).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, AUDIT_ROUTE_MAP, UNREGISTERED_ACTIONS } from "@/lib/rbac/audit-map";
import { listApiRouteFiles } from "./scan";

const DYNAMIC_ACTIONS_FOR_LOGIN = ["LOGIN_FAILED", "ACCOUNT_LOCKED"];
const KNOWN_ACTIONS = new Set<string>([...AUDIT_ACTIONS, ...UNREGISTERED_ACTIONS]);

describe("audit log (peta action route)", () => {
  it("AUDIT_ACTIONS tidak punya duplikat", () => {
    assert.equal(new Set(AUDIT_ACTIONS).size, AUDIT_ACTIONS.length);
  });

  it("semua route penulis audit terdaftar di AUDIT_ROUTE_MAP (dan sebaliknya)", async () => {
    const routes = await listApiRouteFiles();
    const writers = routes.filter((r) => r.source.includes("auditLog.create") || /\bwriteAudit\(/.test(r.source));
    const mappedKeys = Object.keys(AUDIT_ROUTE_MAP);

    for (const r of writers) {
      assert.ok(mappedKeys.includes(r.file), `route ${r.file} menulis audit tapi tidak ada di AUDIT_ROUTE_MAP`);
    }
    for (const key of mappedKeys) {
      assert.ok(writers.some((r) => r.file === key), `entri peta ${key} tidak menulis audit`);
    }
  });

  it("action literal & dinamis di route ∈ AUDIT_ACTIONS/UNREGISTERED dan cocok peta", async () => {
    const routes = await listApiRouteFiles();
    const problems: string[] = [];

    for (const r of routes) {
      if (!(r.source.includes("auditLog.create") || /\bwriteAudit\(/.test(r.source))) continue;
      const { actions, dynamic } = extractAuditActions(r.source);
      const expected = new Set<string>(AUDIT_ROUTE_MAP[r.file] ?? []);

      if (dynamic === "unknown") {
        problems.push(`${r.file}: action tidak terbaca (bukan literal, bukan AUDIT_ACTIONS.*, bukan result.auditAction)`);
      }
      const covered = new Set(actions);
      if (dynamic === "login") {
        for (const a of DYNAMIC_ACTIONS_FOR_LOGIN) covered.add(a);
        if (r.file !== "app/api/auth/login/route.ts") {
          problems.push(`${r.file}: memakai result.auditAction di luar route login`);
        }
      }

      for (const a of covered) {
        if (!KNOWN_ACTIONS.has(a)) {
          problems.push(`${r.file}: action "${a}" tidak terdaftar di registry/UNREGISTERED`);
        }
        if (!expected.has(a)) {
          problems.push(`${r.file}: action "${a}" tidak ada di peta AUDIT_ROUTE_MAP`);
        }
      }
      for (const a of expected) {
        if (!covered.has(a)) {
          problems.push(`${r.file}: peta mendaftar "${a}" tapi tidak ditemukan di route`);
        }
      }
    }

    assert.deepEqual(problems, []);
  });

  it("tidak ada route/map yang menulis action di luar registry tanpa tanda UNREGISTERED", () => {
    // Linear check: nilai peta yang tidak ada di registry harus ∈ UNREGISTERED.
    const registry = new Set(AUDIT_ACTIONS);
    for (const [file, actions] of Object.entries(AUDIT_ROUTE_MAP)) {
      for (const a of actions) {
        if (registry.has(a)) continue;
        assert.ok(
          (UNREGISTERED_ACTIONS as readonly string[]).includes(a),
          `${file}: action "${a}" tidak di registry dan tidak ditandai UNREGISTERED`
        );
      }
    }
  });
});

// Ekstraksi action dari route sumber — dua bentuk:
//   1. inline:  prisma/tx.auditLog.create({ … action: <token>, … })
//   2. helper:  writeAudit({ … action: <token>, … })
// token = literal "LOGIN_SUCCESS" | AUDIT_ACTIONS.LOGIN_SUCCESS (resolve via
// registri saat import) | result.auditAction (login, dinamis).
function extractAuditActions(source: string): {
  actions: Set<string>;
  dynamic: "login" | "unknown" | null;
} {
  const actions = new Set<string>();
  let dynamic: "login" | "unknown" | null = null;

  const blockRe = /(?:auditLog\.create|writeAudit)\(\s*\{([\s\S]*?)\n\s*\}\)/g;
  for (const m of source.matchAll(blockRe)) {
    for (const line of m[1].split("\n").filter((l) => l.includes("action:"))) {
      // prioritas: literal quoted, lalu ref AUDIT_ACTIONS.<KEY>
      const literals = [...line.matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]);
      const refs = [...line.matchAll(/AUDIT_ACTIONS\.(\w+)/g)].map((x) => x[1]);
      for (const l of literals) actions.add(l);
      for (const r of refs) {
        const v = (AUDIT_ACTIONS as readonly string[]).includes(r) ? r : undefined;
        if (v) actions.add(v);
      }
      if (literals.length === 0 && refs.length === 0) {
        if (/result\.auditAction/.test(line)) dynamic = "login";
        else dynamic = "unknown";
      }
    }
  }
  return { actions, dynamic };
}