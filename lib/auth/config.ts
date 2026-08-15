export const AUTH_CONFIG = {
  cookieName: "eps_session",
  // Secure cookie HANYA ketika disajikan via HTTPS. Server ini berjalan HTTP
  // polos di LAN (standalone, tanpa TLS) — Secure=true justru membuat browser
  // menolak cookie (login gagal). Set COOKIE_SECURE=true bila HTTPS dipasang.
  cookieSecure: process.env.COOKIE_SECURE === "true",
  sessionTtlSeconds: 8 * 60 * 60,
  rememberTtlSeconds: 30 * 24 * 60 * 60,
  // idle timeout (sliding): sesi dibunuh bila tidak dipakai selama ini; null
  // untuk nonaktif. Berbeda dgn sessionTtlSeconds (batas absolut sejak login).
  idleTimeoutMs: 30 * 60 * 1000,
  maxFailedAttempts: 5,
  lockoutBaseMs: 15 * 60 * 1000,
  lockoutMaxMs: 8 * 60 * 60 * 1000,
  // rate limit per-IP (tabel LoginAttempt): maks percobaan GAGAL dalam window;
  // sukses login mereset. Sama dengan default mock frontend (lib/security/config.ts
  // rateLimitMax/rateLimitWindowMinutes). Dinamis (DB) bukan — frontend config
  // halaman masih localStorage mock, fase ini cukup statis.
  rateLimitMaxAttempts: 10,
  rateLimitWindowMs: 5 * 60 * 1000,
  // retensi baris LoginAttempt: cleanup oportunistik membuang yang lebih tua.
  // Lebih lama dari window rate limit supaya riwayat per-IP tetap tersedia
  // (audit), tanpa tabel menumpuk tanpa batas.
  loginAttemptRetentionMs: 24 * 60 * 60 * 1000,
} as const;

// JWT secret minimal 32 byte — secret pendek/tebakan mudah = JWT bisa
// dipalsukan. Generator: `openssl rand -base64 32`.
const MIN_JWT_SECRET_BYTES = 32;

export function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET tidak di-set di environment");
  if (Buffer.byteLength(secret, "utf8") < MIN_JWT_SECRET_BYTES) {
    throw new Error(
      `AUTH_SECRET terlalu pendek: minimal ${MIN_JWT_SECRET_BYTES} byte. ` +
        "Generate dengan `openssl rand -base64 32`."
    );
  }
  return secret;
}
