import { AUTH_CONFIG } from "./config";

// deps di-inject dari route login (prisma); test memakai fake tanpa DB nyata
// (pola auth.test.ts).
export type RateLimitDeps = {
  findRecent(ip: string, since: Date): Promise<{ success: boolean; createdAt: Date }[]>;
  create(data: { ip: string; email: string; success: boolean }): Promise<unknown>;
  deleteBefore(cutoff: Date): Promise<unknown>;
  now?(): Date;
};

// Jumlah kegagalan yang dihitung untuk window rate limit: createdAt dalam
// (resetPoint, now]. resetPoint = sukses terakhir dalam window — sukses login
// "menandai window fresh" (mirror mock frontend eps_rate_limit) — atau awal
// window bila tak ada sukses. Kegagalan sebelum sukses terakhir tidak dihitung;
// createdAt tepat di awal window tidak dihitung (boundary, pakai >).
export function countWindowFailures(
  attempts: { success: boolean; createdAt: Date }[],
  now: Date,
  windowMs: number
): number {
  const cutoff = now.getTime() - windowMs;
  let resetPoint = cutoff;
  for (const a of attempts) {
    const ts = a.createdAt.getTime();
    if (ts > cutoff && a.success && ts > resetPoint) resetPoint = ts;
  }
  let failures = 0;
  for (const a of attempts) {
    const ts = a.createdAt.getTime();
    if (ts > resetPoint && !a.success) failures++;
  }
  return failures;
}

// Overrides opsional utk nilai rate limit — di-inject dari config dinamis
// (lib/brute-force/config.ts: rateLimitMaxAttempts/rateLimitWindowMs). Absen =
// pakai AUTH_CONFIG (fallback). now() tetap boleh di-inject utk test.
export type RateLimitOptions = {
  maxAttempts?: number;
  windowMs?: number;
  now?: Date;
};

// Gate rate limit per-IP: blokir bila gagal dalam window >= maxAttempts.
// Dipanggil SEBELUM verifikasi kredensial & lockout per-akun (lihat route login):
// IP yang habis jatah ditolak tanpa menyentuh akun korban maupun hashing password.
// SIGNATURE CHANGE (task brute-force dinamis): arg ke-3 berubah dari `now?: Date`
// menjadi options {maxAttempts, windowMs, now} — pemanggil lama (2 arg) tetap valid.
export async function isIpRateLimited(
  deps: RateLimitDeps,
  ip: string,
  options: RateLimitOptions = {}
): Promise<boolean> {
  const t = options.now ?? deps.now?.() ?? new Date();
  const windowMs = options.windowMs ?? AUTH_CONFIG.rateLimitWindowMs;
  const maxAttempts = options.maxAttempts ?? AUTH_CONFIG.rateLimitMaxAttempts;
  const attempts = await deps.findRecent(ip, new Date(t.getTime() - windowMs));
  return countWindowFailures(attempts, t, windowMs) >= maxAttempts;
}

// Append-only: satu baris per percobaan login yang DIPROSES (sukses & gagal).
// Percobaan yang rate-limited TIDAK dicatat: sudah ditolak sebelum pemrosesan,
// menambah baris hanya menaikkan noise tanpa mengubah keputusan (reset window
// berbasis waktu, bukan jumlah absolut).
export async function recordLoginAttempt(
  deps: RateLimitDeps,
  input: { ip: string; email: string; success: boolean }
): Promise<void> {
  await deps.create(input);
}

// Cleanup oportunistik per percobaan login: buang baris lebih tua dari
// loginAttemptRetentionMs (> 24 jam). Jauh lebih panjang dari window supaya
// riwayat audit per-IP tetap tersedia sementara tabel tetap terikat.
export async function cleanupOldLoginAttempts(deps: RateLimitDeps, now?: Date): Promise<void> {
  const t = now ?? deps.now?.() ?? new Date();
  await deps.deleteBefore(new Date(t.getTime() - AUTH_CONFIG.loginAttemptRetentionMs));
}
