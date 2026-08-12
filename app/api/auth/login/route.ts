import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG, getJwtSecret } from "@/lib/auth/config";
import { signToken } from "@/lib/auth/jwt";
import { loginUser, type LoginDeps } from "@/lib/auth/login";
import {
  isIpRateLimited,
  recordLoginAttempt,
  cleanupOldLoginAttempts,
  type RateLimitDeps,
} from "@/lib/auth/rateLimit";
import { loadSecurityConfig } from "@/lib/brute-force/config";
import { hashToken } from "@/lib/auth/sessions";

export const dynamic = "force-dynamic";

const deps: LoginDeps = {
  getUserByEmail: async (email) =>
    prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    }),
  updateUser: async (id, data) => prisma.user.update({ where: { id }, data }),
};

const securityConfigDeps = {
  findRows: () =>
    prisma.securityConfig.findMany({
      select: { key: true, value: true, updatedAt: true, updatedBy: true },
    }),
};

const rateLimitDeps: RateLimitDeps = {
  findRecent: (ip, since) =>
    prisma.loginAttempt.findMany({
      where: { ip, createdAt: { gt: since } },
      select: { success: true, createdAt: true },
    }),
  create: (data) => prisma.loginAttempt.create({ data }),
  deleteBefore: (cutoff) => prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
};

// Pesan aman: tidak sebut ambang/window/per-IP (sama semangat dengan mock
// frontend "Terlalu banyak percobaan"). 429 = client bisa coba lagi nanti.
const RATE_LIMIT_MESSAGE = "Terlalu banyak percobaan. Silakan coba lagi nanti.";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rememberMe = body?.rememberMe === true;

  if (!email || !password) {
    return NextResponse.json({ message: "Email dan password wajib diisi." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // 0) CONFIG dinamis (Perlindungan Brute-Force): nilai maxAttempts/lockout/
  // rate-limit dari tabel security_configs (key "brute_force"); tabel kosong ->
  // fallback AUTH_CONFIG (lihat lib/brute-force/config.ts). Dibaca per-request
  // tanpa cache (login low-frequency; hindari stale window setelah admin ubah).
  const { config: cfg } = await loadSecurityConfig(securityConfigDeps);

  // 1) RATE LIMIT per-IP (LoginAttempt) — SEBELUM verifikasi kredensial maupun
  // lockout per-akun. IP yang sudah >= rateLimitMaxAttempts gagal dalam
  // rateLimitWindowMs ditolak 429 tanpa membaca akun / hashing password: IP
  // attacker tidak bisa menghabiskan failedLoginAttempts akun korban (lockout
  // per-akun cuma lapisan kedua), dan CPU argon2 tidak terpakai percuma. Tanpa
  // header ip (null) tidak bisa di-rate-limit — hanya terjadi tanpa proxy.
  if (ip && (await isIpRateLimited(rateLimitDeps, ip, { maxAttempts: cfg.rateLimitMaxAttempts, windowMs: cfg.rateLimitWindowMs }))) {
    // Audit tiap penolakan 429 (gap audit task): percobaan rate-limited TIDAK
    // masuk LoginAttempt (keputusan lama dipertahankan — sudah ditolak sebelum
    // pemrosesan, menambah baris hanya noise; window berbasis waktu, bukan
    // jumlah) TAPI tercatat sebagai event audit agar serangan terlihat.
    await prisma.auditLog.create({
      data: {
        userId: null,
        action: "LOGIN_RATE_LIMITED",
        entityType: "USER",
        entityId: null,
        after: { email, ip },
        ip,
        userAgent,
      },
    });
    return NextResponse.json({ message: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const result = await loginUser({ email, password }, { ...deps, config: cfg });

  // 2) CATAT LoginAttempt utk setiap percobaan yang diproses (sukses & gagal):
  // dasar hitungan window berikutnya + riwayat audit per-IP/email. Percobaan
  // yang rate-limited TIDAK dicatat (sudah ditolak tanpa pemrosesan).
  if (ip) await recordLoginAttempt(rateLimitDeps, { ip, email, success: result.ok });

  // 3) CLEANUP oportunistik: buang LoginAttempt lebih tua dari retensi (> 24 jam).
  await cleanupOldLoginAttempts(rateLimitDeps);

  if (!result.ok) {
    // PRD: audit mencatat login sukses & gagal (action sama dengan contract
    // mock frontend). userId null utk email yang tak dikenal.
    await prisma.auditLog.create({
      data: {
        userId: result.userId,
        action: result.auditAction,
        entityType: "USER",
        entityId: result.userId,
        after: { email },
        ip,
        userAgent,
      },
    });
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  const ttl = rememberMe ? AUTH_CONFIG.rememberTtlSeconds : AUTH_CONFIG.sessionTtlSeconds;
  const token = signToken(
    { sub: result.user.id, role: result.user.role.name, permissions: result.user.permissions },
    getJwtSecret(),
    ttl
  );

  // sesi DB + audit sukses atomik; tokenHash = sha256(JWT) — token mentah tak
  // tersimpan, dan proxy.ts memvalidasi sesi ini tiap request (revoke/logout all).
  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        userId: result.user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(result.lastLoginAt.getTime() + ttl * 1000),
        ip,
        userAgent,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: result.user.id,
        action: "LOGIN_SUCCESS",
        entityType: "USER",
        entityId: result.user.id,
        after: { lastLoginAt: result.lastLoginAt.toISOString() },
        ip,
        userAgent,
      },
    });
  });

  const res = NextResponse.json({ user: result.user, message: "Login berhasil." }, { status: 200 });
  res.cookies.set(AUTH_CONFIG.cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: AUTH_CONFIG.cookieSecure,
    path: "/",
    maxAge: ttl,
  });
  return res;
}

export async function GET() {
  return NextResponse.json({ message: "Method tidak diizinkan. Gunakan POST." }, { status: 405 });
}
