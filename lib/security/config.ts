import { AUTH_CONFIG } from "@/lib/auth/config";

export type SecurityConfig = {
  maxFailedAttempts: number;
  lockoutBaseMinutes: number;
  lockoutMaxMinutes: number;
  rateLimitMax: number;
  rateLimitWindowMinutes: number;
};

export const SECURITY_CONFIG_STORAGE_KEY = "eps_security_config";

// Nilai default meniru backend lib/auth/config.ts (lockout ms → menit).
// Backend config statis (tanpa DB tidak ada config dinamis) — halaman ini mock frontend.
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxFailedAttempts: AUTH_CONFIG.maxFailedAttempts,
  lockoutBaseMinutes: AUTH_CONFIG.lockoutBaseMs / 60_000,
  lockoutMaxMinutes: AUTH_CONFIG.lockoutMaxMs / 60_000,
  // Rate limit global mock: maks N percobaan gagal per jendela waktu (per-sesi).
  rateLimitMax: 10,
  rateLimitWindowMinutes: 5,
};

export const SECURITY_CONFIG_LIMITS = {
  maxFailedAttempts: { min: 1, max: 20 },
  lockoutBaseMinutes: { min: 1, max: 1440 },
  lockoutMaxMinutes: { min: 1, max: 1440 },
  rateLimitMax: { min: 1, max: 50 },
  rateLimitWindowMinutes: { min: 1, max: 60 },
} as const;

function intInRange(value: unknown, { min, max }: { min: number; max: number }): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

// Normalisasi input mentah (localStorage / form) → config valid; bagian rusak kembali ke default.
export function parseSecurityConfig(raw: unknown): SecurityConfig {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    maxFailedAttempts: intInRange(obj.maxFailedAttempts, SECURITY_CONFIG_LIMITS.maxFailedAttempts) ?? DEFAULT_SECURITY_CONFIG.maxFailedAttempts,
    lockoutBaseMinutes: intInRange(obj.lockoutBaseMinutes, SECURITY_CONFIG_LIMITS.lockoutBaseMinutes) ?? DEFAULT_SECURITY_CONFIG.lockoutBaseMinutes,
    lockoutMaxMinutes: intInRange(obj.lockoutMaxMinutes, SECURITY_CONFIG_LIMITS.lockoutMaxMinutes) ?? DEFAULT_SECURITY_CONFIG.lockoutMaxMinutes,
    rateLimitMax: intInRange(obj.rateLimitMax, SECURITY_CONFIG_LIMITS.rateLimitMax) ?? DEFAULT_SECURITY_CONFIG.rateLimitMax,
    rateLimitWindowMinutes: intInRange(obj.rateLimitWindowMinutes, SECURITY_CONFIG_LIMITS.rateLimitWindowMinutes) ?? DEFAULT_SECURITY_CONFIG.rateLimitWindowMinutes,
  };
}

// Validasi nilai form → peta pesan error per field (kosong = valid).
export function validateSecurityConfig(config: SecurityConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (intInRange(config.maxFailedAttempts, SECURITY_CONFIG_LIMITS.maxFailedAttempts) === null)
    errors.maxFailedAttempts = `Maksimal percobaan gagal harus ${SECURITY_CONFIG_LIMITS.maxFailedAttempts.min}–${SECURITY_CONFIG_LIMITS.maxFailedAttempts.max}.`;
  if (intInRange(config.lockoutBaseMinutes, SECURITY_CONFIG_LIMITS.lockoutBaseMinutes) === null)
    errors.lockoutBaseMinutes = `Durasi lock dasar harus ${SECURITY_CONFIG_LIMITS.lockoutBaseMinutes.min}–${SECURITY_CONFIG_LIMITS.lockoutBaseMinutes.max} menit.`;
  if (intInRange(config.lockoutMaxMinutes, SECURITY_CONFIG_LIMITS.lockoutMaxMinutes) === null)
    errors.lockoutMaxMinutes = `Durasi lock maksimal harus ${SECURITY_CONFIG_LIMITS.lockoutMaxMinutes.min}–${SECURITY_CONFIG_LIMITS.lockoutMaxMinutes.max} menit.`;
  if (intInRange(config.rateLimitMax, SECURITY_CONFIG_LIMITS.rateLimitMax) === null)
    errors.rateLimitMax = `Batas percobaan per jendela waktu harus ${SECURITY_CONFIG_LIMITS.rateLimitMax.min}–${SECURITY_CONFIG_LIMITS.rateLimitMax.max} percobaan.`;
  if (intInRange(config.rateLimitWindowMinutes, SECURITY_CONFIG_LIMITS.rateLimitWindowMinutes) === null)
    errors.rateLimitWindowMinutes = `Jendela waktu rate limit harus ${SECURITY_CONFIG_LIMITS.rateLimitWindowMinutes.min}–${SECURITY_CONFIG_LIMITS.rateLimitWindowMinutes.max} menit.`;
  if (!errors.lockoutBaseMinutes && !errors.lockoutMaxMinutes && config.lockoutMaxMinutes < config.lockoutBaseMinutes)
    errors.lockoutMaxMinutes = "Durasi maksimal tidak boleh lebih kecil dari durasi dasar.";
  return errors;
}

export function isSecurityConfigValid(config: SecurityConfig): boolean {
  return Object.keys(validateSecurityConfig(config)).length === 0;
}

export function loadSecurityConfig(storage: Pick<Storage, "getItem"> | null = null): SecurityConfig {
  if (!storage) return DEFAULT_SECURITY_CONFIG;
  try {
    const raw = storage.getItem(SECURITY_CONFIG_STORAGE_KEY);
    return raw ? parseSecurityConfig(JSON.parse(raw)) : DEFAULT_SECURITY_CONFIG;
  } catch {
    return DEFAULT_SECURITY_CONFIG;
  }
}

export function saveSecurityConfig(config: SecurityConfig, storage: Pick<Storage, "setItem"> | null = null): void {
  if (!storage) return;
  storage.setItem(SECURITY_CONFIG_STORAGE_KEY, JSON.stringify(config));
}
