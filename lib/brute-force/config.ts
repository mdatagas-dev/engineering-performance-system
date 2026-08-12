import { AUTH_CONFIG } from "@/lib/auth/config";

// Config brute-force aktif (hasil load + clamp). SATU satuan: ms untuk durasi
// (lockoutBaseMs/lockoutMaxMs/rateLimitWindowMs) — API admin & penyimpanan DB
// memakai ms juga (bukan menit seperti form frontend).
export type BruteForceConfig = {
  maxAttempts: number;
  lockoutBaseMs: number;
  lockoutMaxMs: number;
  rateLimitMaxAttempts: number;
  rateLimitWindowMs: number;
};

// Kunci konfigurasi tunggal di tabel security_configs. Tolak key lain di API.
export const BRUTE_FORCE_CONFIG_KEY = "brute_force";

// Fallback saat tabel kosong / key belum di-set: nilai AUTH_CONFIG saat ini
// (maxLoginAttempts=5, lockoutBaseMs=15mnt, lockoutMaxMs=8jam,
// rateLimitMaxAttempts=10, rateLimitWindowMs=5mnt). SATU sumber default —
// tanpa duplikasi literal; perubahan AUTH_CONFIG otomatis jadi default baru.
export const DEFAULT_BRUTE_FORCE_CONFIG: BruteForceConfig = {
  maxAttempts: AUTH_CONFIG.maxFailedAttempts,
  lockoutBaseMs: AUTH_CONFIG.lockoutBaseMs,
  lockoutMaxMs: AUTH_CONFIG.lockoutMaxMs,
  rateLimitMaxAttempts: AUTH_CONFIG.rateLimitMaxAttempts,
  rateLimitWindowMs: AUTH_CONFIG.rateLimitWindowMs,
};

// Batas sanitasi (clamp) — rentang operasional admin; lebih ketat dari rentang
// form frontend localStorage: maxAttempts 3..10, window 1mnt..1jam, base
// 5mnt..2jam, cap 5mnt..24jam (dan selalu >= base).
export const BRUTE_FORCE_BOUNDS = {
  maxAttempts: { min: 3, max: 10 },
  lockoutBaseMs: { min: 5 * 60_000, max: 2 * 60 * 60_000 },
  lockoutMaxMs: { min: 5 * 60_000, max: 24 * 60 * 60_000 },
  rateLimitMaxAttempts: { min: 1, max: 50 },
  rateLimitWindowMs: { min: 60_000, max: 60 * 60_000 },
} as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Integer valid (bulat, finite); selain itu null → pemanggil pakai fallback.
function toIntOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  return v;
}

function clampInt(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// Merge raw JSON (dari DB atau body) ke config lengkap + clamp batas.
// Field rusak/absurd di-clamp ke BRUTE_FORCE_BOUNDS (bukan ditolak): nilai
// yang ekstrem bukan kesalahan data planel — admins, clamp lebih aman daripada
// 500/refuse. Field hilang → default AUTH_CONFIG.
export function parseBruteForceConfig(raw: unknown): BruteForceConfig {
  const obj = isRecord(raw) ? raw : {};
  const base = clampInt(
    toIntOrNull(obj.maxAttempts) ?? DEFAULT_BRUTE_FORCE_CONFIG.maxAttempts,
    BRUTE_FORCE_BOUNDS.maxAttempts.min,
    BRUTE_FORCE_BOUNDS.maxAttempts.max
  );
  const lockoutBase = clampInt(
    toIntOrNull(obj.lockoutBaseMs) ?? DEFAULT_BRUTE_FORCE_CONFIG.lockoutBaseMs,
    BRUTE_FORCE_BOUNDS.lockoutBaseMs.min,
    BRUTE_FORCE_BOUNDS.lockoutBaseMs.max
  );
  const lockoutMax = clampInt(
    toIntOrNull(obj.lockoutMaxMs) ?? DEFAULT_BRUTE_FORCE_CONFIG.lockoutMaxMs,
    BRUTE_FORCE_BOUNDS.lockoutMaxMs.min,
    BRUTE_FORCE_BOUNDS.lockoutMaxMs.max
  );
  return {
    maxAttempts: base,
    lockoutBaseMs: lockoutBase,
    // cap tidak boleh lebih kecil dari base (invariant backoff).
    lockoutMaxMs: Math.max(lockoutMax, lockoutBase),
    rateLimitMaxAttempts: clampInt(
      toIntOrNull(obj.rateLimitMaxAttempts) ?? DEFAULT_BRUTE_FORCE_CONFIG.rateLimitMaxAttempts,
      BRUTE_FORCE_BOUNDS.rateLimitMaxAttempts.min,
      BRUTE_FORCE_BOUNDS.rateLimitMaxAttempts.max
    ),
    rateLimitWindowMs: clampInt(
      toIntOrNull(obj.rateLimitWindowMs) ?? DEFAULT_BRUTE_FORCE_CONFIG.rateLimitWindowMs,
      BRUTE_FORCE_BOUNDS.rateLimitWindowMs.min,
      BRUTE_FORCE_BOUNDS.rateLimitWindowMs.max
    ),
  };
}

export type SecurityConfigRow = {
  key: string;
  value: unknown;
  updatedAt: Date;
  updatedBy: string | null;
};

export type SecurityConfigDeps = {
  findRows(): Promise<SecurityConfigRow[]>;
};

export type LoadedSecurityConfig = {
  config: BruteForceConfig;
  // meta baris DB (null = belum pernah di-set → murni default AUTH_CONFIG).
  updatedAt: Date | null;
  updatedBy: string | null;
};

// Baca config brute-force dari tabel security_configs + merge default.
//
// KEPUTUSAN CACHE: TANPA cache — baca per-request. Login = jalur low-frequency
// (puluhan rpm paling buruk, bukan per-detak), satu SELECT kecil per login
// tidak berasa; cache module-level malah menambah stale window (config baru
// butuh 30dtk/lebih berlaku) & kerumitan invalidasi tanpa untung. Logika murni:
// DB di-inject via deps (pola sama dengan RateLimitDeps) → test tanpa DB.
export async function loadSecurityConfig(
  deps: SecurityConfigDeps
): Promise<LoadedSecurityConfig> {
  const rows = await deps.findRows();
  const row = rows.find((r) => r.key === BRUTE_FORCE_CONFIG_KEY);
  if (!row) {
    return { config: DEFAULT_BRUTE_FORCE_CONFIG, updatedAt: null, updatedBy: null };
  }
  return {
    config: parseBruteForceConfig(row.value),
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export type SecurityConfigUpdateResult =
  | { ok: true; data: Partial<BruteForceConfig> }
  | { ok: false; message: string };

function fail(message: string): SecurityConfigUpdateResult {
  return { ok: false, message };
}

// Validasi body PUT /api/security-config: partial update (field yang ada saja),
// clamp setiap nilai ke batas, tolak key selain brute_force & field tak dikenal.
// Cross-field cap < base ditolak (400) — clamp diam-diam menyembunyikan
// kesalahan admin; baris pesan meniru contract form frontend.
export function validateSecurityConfigUpdate(body: unknown): SecurityConfigUpdateResult {
  if (!isRecord(body)) return fail("Body permintaan tidak valid.");

  const ALLOWED_FIELDS = new Set([
    "key",
    "maxAttempts",
    "lockoutBaseMs",
    "lockoutMaxMs",
    "rateLimitMaxAttempts",
    "rateLimitWindowMs",
  ]);
  for (const field of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(field)) return fail(`Field tidak dikenal: ${field}.`);
  }

  if (body.key !== undefined && body.key !== BRUTE_FORCE_CONFIG_KEY) {
    return fail(`Hanya konfigurasi "${BRUTE_FORCE_CONFIG_KEY}" yang didukung.`);
  }

  const data: Partial<BruteForceConfig> = {};

  if (body.maxAttempts !== undefined) {
    const n = toIntOrNull(body.maxAttempts);
    if (n === null) return fail("maxAttempts harus bilangan bulat.");
    data.maxAttempts = clampInt(n, BRUTE_FORCE_BOUNDS.maxAttempts.min, BRUTE_FORCE_BOUNDS.maxAttempts.max);
  }
  if (body.lockoutBaseMs !== undefined) {
    const n = toIntOrNull(body.lockoutBaseMs);
    if (n === null) return fail("lockoutBaseMs harus bilangan bulat (ms).");
    data.lockoutBaseMs = clampInt(n, BRUTE_FORCE_BOUNDS.lockoutBaseMs.min, BRUTE_FORCE_BOUNDS.lockoutBaseMs.max);
  }
  if (body.lockoutMaxMs !== undefined) {
    const n = toIntOrNull(body.lockoutMaxMs);
    if (n === null) return fail("lockoutMaxMs harus bilangan bulat (ms).");
    data.lockoutMaxMs = clampInt(n, BRUTE_FORCE_BOUNDS.lockoutMaxMs.min, BRUTE_FORCE_BOUNDS.lockoutMaxMs.max);
  }
  if (body.rateLimitMaxAttempts !== undefined) {
    const n = toIntOrNull(body.rateLimitMaxAttempts);
    if (n === null) return fail("rateLimitMaxAttempts harus bilangan bulat.");
    data.rateLimitMaxAttempts = clampInt(n, BRUTE_FORCE_BOUNDS.rateLimitMaxAttempts.min, BRUTE_FORCE_BOUNDS.rateLimitMaxAttempts.max);
  }
  if (body.rateLimitWindowMs !== undefined) {
    const n = toIntOrNull(body.rateLimitWindowMs);
    if (n === null) return fail("rateLimitWindowMs harus bilangan bulat (ms).");
    data.rateLimitWindowMs = clampInt(n, BRUTE_FORCE_BOUNDS.rateLimitWindowMs.min, BRUTE_FORCE_BOUNDS.rateLimitWindowMs.max);
  }

  if (data.lockoutMaxMs !== undefined && data.lockoutBaseMs !== undefined && data.lockoutMaxMs < data.lockoutBaseMs) {
    return fail("Durasi maksimal tidak boleh lebih kecil dari durasi dasar.");
  }

  return { ok: true, data };
}