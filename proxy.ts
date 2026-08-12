import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission, isActiveSession, type SessionGateDeps, type SessionPayload } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/sessions";
import { logoutCookieOptions } from "@/lib/auth/logout";
import { prisma } from "@/lib/prisma";
import { isAllowedOrigin, isUnsafeMethod } from "@/lib/security/csrf";

const PUBLIC_API_PATHS = new Set(["/api/auth/login"]);

type RoutePermission = {
  pattern: RegExp;
  permission: string | ((method: string) => string | null);
};

const ROUTE_PERMISSIONS: RoutePermission[] = [
  { pattern: /^\/api\/users$/, permission: "user.manage" },
  { pattern: /^\/api\/users\/[^/]+\/role$/, permission: "user.manage" },
  { pattern: /^\/api\/users\/[^/]+\/unlock$/, permission: "user.manage" },
  {
    // GET = daftar data produksi (Daily Production Table) — cukup dashboard.view
    // supaya Viewer bisa lihat; POST (create) tetap record.create.
    pattern: /^\/api\/records$/,
    permission: (method) => (method === "GET" ? "dashboard.view" : "record.create"),
  },
  { pattern: /^\/api\/records\/[^/]+\/approve$/, permission: "record.approve" },
  { pattern: /^\/api\/records\/[^/]+\/lock$/, permission: "record.lock" },
  { pattern: /^\/api\/records\/[^/]+\/history$/, permission: "dashboard.view" },
  { pattern: /^\/api\/records\/[^/]+\/versions(?:\/\d+)?$/, permission: "dashboard.view" },
  { pattern: /^\/api\/dashboard$/, permission: "dashboard.view" },
  // Analisis Tren — data turunan dari records; hanya baca, cukup dashboard.view
  // (sama tier dengan GET /api/records supaya Viewer tetap bisa melihat).
  { pattern: /^\/api\/trends\/series$/, permission: "dashboard.view" },
  { pattern: /^\/api\/trends\/compare$/, permission: "dashboard.view" },
  { pattern: /^\/api\/kpi\/meta$/, permission: "dashboard.view" },
  { pattern: /^\/api\/import$/, permission: "import.run" },
  { pattern: /^\/api\/export$/, permission: "export.run" },
  { pattern: /^\/api\/kpi$/, permission: "kpi.configure" },
  { pattern: /^\/api\/kpi\/[^/]+$/, permission: "kpi.configure" },
  { pattern: /^\/api\/audit$/, permission: "audit.view" },
  // health check butuh sesi valid (dashboard.view — semua role punya), jadi
  // tidak masuk PUBLIC_API_PATHS; infra yang butuh public health pakai path
  // terpisah (mis. /api/healthz) di allowlist.
  { pattern: /^\/api\/health$/, permission: "dashboard.view" },
  { pattern: /^\/api\/backups$/, permission: "backup.view" },
  // restore = recovery tier ops-admin, permission sama dengan backup manual
  // (backup.view) — pisahkan permission kalau kebutuhan audit pemisah muncul.
  { pattern: /^\/api\/backups\/[^/]+\/restore$/, permission: "backup.view" },
  // slow queries = data performa DB (query text bisa sensitif) — tier ops-admin
  // yang sama dengan backup (backup.view), bukan dashboard.view.
  { pattern: /^\/api\/slow-queries$/, permission: "backup.view" },
  { pattern: /^\/api\/quality-score$/, permission: "dashboard.view" },
  // Unduh template ekspor (GET /api/export/template) — /^\/api\/export$/ tidak
  // match path trailing /template, jadi butuh rule terpisah (sama permission).
  { pattern: /^\/api\/export\/template$/, permission: "export.run" },
  // Rollback impor (DELETE /api/imports/[id]) — hapus record produksi, tier
  // ops impor yang sama dengan jalankan impor (import.run).
  { pattern: /^\/api\/imports\/[^/]+$/, permission: "import.run" },
  // Riwayat impor (GET /api/imports) dan laporan detail (GET
  // /api/imports/[id]/report) — rule prefix mencakup semua subpath yg belum
  // dicakup rule rollback di atas (first-match-wins, di-append terakhir).
  { pattern: /^\/api\/imports(?:$|\/)/, permission: "import.run" },
];

function getRequiredPermission(pathname: string, method: string): string | null {
  for (const { pattern, permission } of ROUTE_PERMISSIONS) {
    if (!pattern.test(pathname)) continue;
    return typeof permission === "string" ? permission : permission(method);
  }
  return null;
}

const sessionGate: SessionGateDeps = {
  touchActive: async (tokenHash, now) => {
    const d = now ?? new Date();
    const res = await prisma.session.updateMany({
      where: { tokenHash, isRevoked: false, expiresAt: { gt: d } },
      data: { lastUsedAt: d },
    });
    return res.count;
  },
  readLastUsed: async (tokenHash) => {
    const row = await prisma.session.findUnique({
      where: { tokenHash },
      select: { lastUsedAt: true, isRevoked: true, expiresAt: true },
    });
    if (!row || row.isRevoked || row.expiresAt <= new Date()) return undefined;
    return row.lastUsedAt;
  },
  revokeIdle: async (tokenHash, now) => {
    const d = now ?? new Date();
    await prisma.session.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true, revokedAt: d },
    });
  },
};

async function readSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
  if (!token) return null;
  try {
    const payload = getSession(token);
    if (!payload) return null;
    // gerbang revoke/expiry server-side: JWT masih valid tapi sesi di-revoke
    // atau kedaluwarsa (abs / idle) di tabel Session -> 401.
    const active = await isActiveSession(sessionGate, hashToken(token), undefined, AUTH_CONFIG.idleTimeoutMs);
    return active ? payload : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

  // Gerbang CSRF (fase 5) — method unsafe (POST/PUT/PATCH/DELETE) di luar
  // PUBLIC_API_PATHS: Origin/Referer harus sama host dengan request (ambil
  // header host mentah, fallback ke nextUrl.host). Klien tanpa Origin/Referer
  // (curl, tooling lokal) dizinkan — keputusan & normalisasi di
  // lib/security/csrf.ts (pure, teruji). Public path (login POST) sengaja
  // dilewati: SameSite=Lax + body JSON sudah menutup form-CSRF, dan Origin
  // check di sini butuh sesi (login justru ketika belum ada sesi).
  if (isUnsafeMethod(req.method)) {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const host = req.headers.get("host") ?? req.nextUrl.host;
    if (!isAllowedOrigin(origin, referer, host)) {
      return NextResponse.json(
        { message: "Permintaan ditolak: asal permintaan (Origin/Referer) tidak cocok dengan host." },
        { status: 403 }
      );
    }
  }

  const session = await readSession(req);
  if (!session) {
    const res = NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
    res.cookies.set(AUTH_CONFIG.cookieName, "", logoutCookieOptions());
    return res;
  }

  const permission = getRequiredPermission(pathname, req.method);
  if (permission && !requirePermission(session, permission)) {
    return NextResponse.json(
      { message: "Anda tidak memiliki izin untuk mengakses resource ini." },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
