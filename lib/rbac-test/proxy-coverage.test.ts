// TASK buat-middleware-otorisasi-berbasis-peran — SKAN coverage ROUTE_PERMISSIONS
// (proxy.ts). ROUTE_PERMISSIONS TIDAK diekspor (file sedang diedit agen lain),
// jadi test ini parse source proxy.ts (read-only) lalu mencocokkan tiap route di
// app/api/** dengan: PUBLIC_API_PATHS → rule ROUTE_PERMISSIONS → kategorije
// exempt (tanpa aturan eksplisit, punya pengaman internal di route) → FAIL.
//
// LAPORAN keluar via output test: routes matched / exempt / tanpa aturan.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { listApiRouteFiles, readProxyRules, type ApiRouteFile, type ProxyRule } from "./scan";

// 13 permission yang di-seed (prisma/seed.ts PERMISSION_KEYS) — acuan valid.
const SEED_PERMISSIONS = [
  "user.manage",
  "record.create",
  "record.approve",
  "record.lock",
  "dashboard.view",
  "import.run",
  "export.run",
  "kpi.configure",
  "audit.view",
  "backup.view",
  "quality.view",
  "quality.record",
  "quality.approve",
];

// Route TANPA aturan eksplisit — kategorisasi & justifikasi (lihat laporan task):
//   session-gate-auth   : endpoint autentikasi/sesi — sesi valid cukup (semua role)
//   session-scope-user  : data per-user, dibatasi recipientId = session.sub di route
//   inline-perm         : pengaman permission ada DI DALAM route (requirePermission)
//   internal-guard      : guard status/kepemilikan di route (guards/workflow/correction)
const EXEMPT: Record<string, { category: "session-gate-auth" | "session-scope-user" | "inline-perm" | "internal-guard"; reason: string }> = {
  "/api/auth/logout": {
    category: "session-gate-auth",
    reason: "logout harus bisa dipanggil role apa pun; sesi valid cukup (proxy).",
  },
  "/api/auth/logout-all": {
    category: "session-gate-auth",
    reason: "menutup sesi milik sendiri; sesi valid cukup.",
  },
  "/api/auth/me": {
    category: "session-gate-auth",
    reason: "profil sesi sendiri; sesi valid cukup (tidak ada data privileged).",
  },
  "/api/auth/sessions": {
    category: "session-gate-auth",
    reason: "daftar sesi sendiri (userId = session.sub di route); sesi valid cukup.",
  },
  "/api/auth/sessions/r1": {
    category: "session-gate-auth",
    reason: "akhiri sesi milik sendiri; route memverifikasi userId dan melarang sesi saat ini.",
  },
  "/api/notifications": {
    category: "session-scope-user",
    reason: "notifikasi per-recipient (recipientId = session.sub); tanpa data lintas-user.",
  },
  "/api/notifications/read-all": {
    category: "session-scope-user",
    reason: "tandai-baca milik sendiri; scoped session.sub.",
  },
  "/api/notifications/unread-count": {
    category: "session-scope-user",
    reason: "counter per-user; scoped session.sub.",
  },
  "/api/notifications/r1": {
    category: "session-scope-user",
    reason: "hapus notifikasi milik sendiri; scoped id + session.sub.",
  },
  "/api/notifications/r1/read": {
    category: "session-scope-user",
    reason: "tandai-baca satu notifikasi milik sendiri; scoped session.sub.",
  },
  "/api/dashboard/layout": {
    category: "inline-perm",
    reason: "PUT memakai requirePermission(session, 'dashboard.view') di dalam route; GET sesi valid cukup.",
  },
  "/api/security-config": {
    category: "inline-perm",
    reason: "seluruh handler memakai sessionGuard + requirePermission(session, 'user.manage') di dalam route.",
  },
  "/api/users/r1": {
    category: "inline-perm",
    reason: "GET/PATCH memakai getSession + requirePermission(session, 'user.manage') di dalam route (opsional rule proxy).",
  },
  "/api/records/r1": {
    category: "internal-guard",
    reason: "PATCH/DELETE lewat assertManageable + assertEditable/assertDeletable (lib/records/guards.ts).",
  },
  "/api/records/r1/status": {
    category: "internal-guard",
    reason: "PATCH lewat decideTransition (lib/records/workflow.ts) — permission per transisi.",
  },
  "/api/records/r1/correct": {
    category: "internal-guard",
    reason: "POST lewat decideCorrection (lib/records/correction.ts).",
  },
};

// Bukti pengaman diri per kategorije exempt — token wajib ada di source route.
const INTERNAL_EVIDENCE: Record<string, (s: string) => boolean> = {
  "session-gate-auth": (s) => /getSession\(/.test(s),
  "session-scope-user": (s) => /session\.sub/.test(s),
  "inline-perm": (s) => /getSession\(/.test(s) && /requirePermission\(/.test(s),
  "internal-guard": (s) =>
    /getSession\(/.test(s) &&
    /assertManageable|decideTransition|decideCorrection/.test(s),
};

let REPORT: string[] = [];

describe("coverage ROUTE_PERMISSIONS (proxy.ts) vs semua route /api/**", () => {
  let routes: ApiRouteFile[];
  let publicPaths: string[];
  let rules: ProxyRule[];

  before(async () => {
    routes = await listApiRouteFiles();
    const parsed = await readProxyRules();
    publicPaths = parsed.publicPaths;
    rules = parsed.rules;
  });

  it("setiap route terproteksi (non-PUBLIC) punya aturan pola atau pengaman internal (exempt)", () => {
    const unmatched: string[] = [];
    const exempted: { pathname: string; category: string }[] = [];
    const matched: string[] = [];

    for (const route of routes) {
      const { pathname, methods } = route;
      if (publicPaths.includes(pathname)) {
        matched.push(`${pathname} [PUBLIC]`);
        continue;
      }

      const rule = rules.find((r) => r.pattern.test(pathname));
      if (rule) {
        matched.push(`${pathname} [${rule.permissions.join("|") || "method-perm"}] ${methods.join("/")}`);
        continue;
      }

      const exempt = EXEMPT[pathname];
      if (exempt) {
        const evidence = INTERNAL_EVIDENCE[exempt.category];
        assert.ok(
          evidence(route.source),
          `${pathname}: kategori exempt "${exempt.category}" harus punya bukti pengaman internal (${exempt.reason})`
        );
        exempted.push({ pathname, category: exempt.category });
        continue;
      }

      unmatched.push(`${pathname} (${methods.join("/")})`);
    }

    REPORT = [`MATCHED (${matched.length}):`, ...matched.map((m) => `  ${m}`), "", `EXEMPT (${exempted.length}):`, ...exempted.map((e) => `  ${e.pathname} → ${e.category}`)];
    assert.deepEqual(unmatched, [], "ROUTE TANPA ATURAN & TANPA EXEMPT: " + unmatched.join(", "));
  });

  it("semua permission string di ROUTE_PERMISSIONS ∈ seed permission keys (no typo)", () => {
    for (const rule of rules) {
      for (const p of rule.permissions) {
        assert.ok(
          SEED_PERMISSIONS.includes(p),
          `permission "${p}" (pattern ${rule.pattern}) tidak ada di seed PERMISSION_KEYS`
        );
      }
    }
  });

  it("PUBLIC_API_PATHS hanya berisi /api/auth/login (tidak ada path lain bocor)", () => {
    assert.deepEqual([...publicPaths].sort(), ["/api/auth/login"]);
  });

  it("tidak ada aturan pola yang mati (tidak match route mana pun) — DILAPORKAN, bukan gagal", async () => {
    // Rule di bawah sengaja SENGAT dibiarkan (pre-declared untuk fase berikut):
    //   /^\/api\/records\/[^/]+\/approve$/ & …\/lock$ — endpoint approve/lock
    //   terpisah belum ada (workflow lewat PATCH /api/records/[id]/status).
    //   /^\/api\/dashboard$/ — dashboard aggregate endpoint belum dibuat
    //   (hanya GET/PUT /api/dashboard/layout). Rule ini HARMLESS (tidak guard
    //   apa pun) selama route-nya belum ada — jangan dihapus sebelum endpoint
    //   hidup. Catat di laporan saja; bukan failure.
    const report: string[] = [];
    for (const r of rules) {
      if (!routes.some((rt) => r.pattern.test(rt.pathname))) {
        report.push(`  DEAD (pre-declared/forward): ${String(r.pattern)}`);
      }
    }
    console.log(`\n[proxy-coverage] dead rules:\n${report.join("\n")}`);
  });
});

after(() => {
  if (REPORT.length > 0) console.log(`\n[proxy-coverage report]\n${REPORT.join("\n")}`);
});
