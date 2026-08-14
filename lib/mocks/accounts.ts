import type { MockSession, MockUser } from "@/lib/mocks/session";
import { withExpiry } from "@/lib/mocks/session";
import { resolveSessionMenu } from "@/lib/auth/menu";
import { DEFAULT_SECURITY_CONFIG, loadSecurityConfig, type SecurityConfig } from "@/lib/security/config";
import { appendMockAudit, clientMeta, type MockAuditAction } from "@/lib/mocks/audit";
import { applyUserOverrides, loadUserOverrides, type MockUserPatch } from "@/lib/mocks/roleChange";
import { seedMockUsers } from "@/lib/mocks/users";

export const SESSION_KEY = "eps_mock_session";

// Pesan error tiruan meniru backend (lib/auth/login.ts) — seragam, tidak bocor
// apakah email terdaftar atau hanya password salah.
export const MOCK_LOGIN_ERROR = "Email atau password salah.";
export const MOCK_LOCKED_MESSAGE = "Terlalu banyak percobaan login. Akun dikunci sementara.";
export const MOCK_INACTIVE_MESSAGE = "Akun ini tidak aktif.";
// Pesan rate limit aman: tidak sebut detail internal (ambang, window, per-sesi).
export const MOCK_RATE_LIMITED_MESSAGE = "Terlalu banyak percobaan";

// Mirrors prisma/seed.ts ROLE_PERMISSIONS — seed akun untuk fallback login tiruan.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["user.manage", "record.create", "record.approve", "record.lock", "dashboard.view", "import.run", "export.run", "kpi.configure", "audit.view", "backup.view", "quality.view", "quality.record", "quality.approve"],
  ADMIN: ["user.manage", "record.create", "record.approve", "record.lock", "dashboard.view", "import.run", "export.run", "kpi.configure", "audit.view", "backup.view", "quality.view", "quality.record", "quality.approve"],
  ENGINEERING_MANAGER: ["record.approve", "record.lock", "dashboard.view", "export.run", "kpi.configure", "backup.view", "quality.view", "quality.approve"],
  ENGINEERING_STAFF: ["record.create", "dashboard.view", "import.run", "export.run", "quality.view", "quality.record"],
  VIEWER: ["dashboard.view", "export.run", "quality.view"],
};

type MockAccount = {
  email: string;
  password: string;
  name: string;
  role: string;
  area?: { id: string; name: string } | null;
};

export const mockAccounts: MockAccount[] = [
  { email: "superadmin@eps.local", password: "Superadmin123!", name: "Super Admin", role: "SUPER_ADMIN", area: null },
  { email: "admin@eps.local", password: "Admin123!", name: "Admin", role: "ADMIN", area: null },
  { email: "manager@eps.local", password: "Manager123!", name: "Engineering Manager", role: "ENGINEERING_MANAGER", area: null },
  { email: "staff@eps.local", password: "Staff123!", name: "Engineering Staff", role: "ENGINEERING_STAFF", area: { id: "area_machining", name: "Machining Line 1" } },
  { email: "viewer@eps.local", password: "Viewer123!", name: "Viewer", role: "VIEWER", area: null },
];

// Akun login mock gabungan: seed (password plaintext demo) + user override
// (passwordHash "argon2-mock:<pw>", isActive, role bisa berubah dari /users).
export type MockLoginAccount = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  area: { id: string; name: string } | null;
  password?: string; // seed demo
  passwordHash?: string; // override: argon2-mock:<pw>
};

export type MockLoginResult =
  | { ok: true; session: MockSession }
  | { ok: false; reason: "invalid" | "locked" | "inactive" | "rate_limited" };

// State lockout per email, meniru kolom backend failedLoginAttempts/lockoutCount/lockedUntil.
export type MockLock = {
  attempts: number;
  lockoutCount: number;
  lockedUntil: string | null;
};

export const MOCK_LOCK_KEY = "eps_mock_login_locks";

// Rate limit global mock (eps_rate_limit): jendela waktu tetap — maks
// rateLimitMax percobaan GAGAL dalam rateLimitWindowMinutes, lintas akun
// (per-sesi browser, meniru rate limit per-IP). Dihitung sebelum lockout
// per-akun: window kedaluwarsa → reset; mencapai ambang → blokir percobaan
// berikutnya sampai window berakhir. Sukses login mereset hitungan.
export const RATE_LIMIT_KEY = "eps_rate_limit";

export type MockRateLimit = {
  count: number;
  windowStart: number; // epoch ms saat window mulai
};

export function evaluateRateLimit(
  state: MockRateLimit | null,
  now: Date,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG
): { blocked: boolean; remainingMs: number; state: MockRateLimit } {
  const ts = now.getTime();
  const windowMs = config.rateLimitWindowMinutes * 60_000;
  if (!state || ts - state.windowStart >= windowMs) {
    return { blocked: false, remainingMs: 0, state: { count: 0, windowStart: ts } };
  }
  if (state.count >= config.rateLimitMax) {
    return { blocked: true, remainingMs: state.windowStart + windowMs - ts, state };
  }
  return { blocked: false, remainingMs: 0, state };
}

// Catat hasil percobaan ke hitungan rate limit: gagal → +1; berhasil → reset.
export function recordRateAttempt(state: MockRateLimit, failed: boolean): MockRateLimit {
  if (!failed) return { ...state, count: 0 };
  return { ...state, count: state.count + 1 };
}

// Aturan sama dengan backend lib/auth/login.ts: setelah N gagal → lockout
// exponential min(base * 2^lockoutCount, max); sukses login mereset hitungan.
// Batas & durasi bisa dikonfigurasi via halaman Pengaturan Keamanan (mock localStorage).
// Urutan verifikasi mirror backend: tak terdaftar → invalid; terkunci → locked;
// nonaktif → inactive; password salah → invalid; benar → reset + menu dari role.
export function processMockLogin(
  email: string,
  password: string,
  lock: MockLock | null,
  now: Date,
  rememberMe = false,
  config: SecurityConfig = DEFAULT_SECURITY_CONFIG,
  accounts: MockLoginAccount[] = seedLoginAccounts(),
  rate: MockRateLimit | null = null
): { result: MockLoginResult; lock: MockLock; rate: MockRateLimit } {
  const fresh: MockLock = { attempts: 0, lockoutCount: 0, lockedUntil: null };

  // Rate limit global didahulukan: saat jendela terpakai habis, semua percobaan
  // ditolak (429-style) walau akun/lockout belum diperiksa.
  const rateEval = evaluateRateLimit(rate, now, config);
  if (rateEval.blocked) {
    return { result: { ok: false, reason: "rate_limited" }, lock: lock ?? fresh, rate: rateEval.state };
  }

  const account = accounts.find((a) => a.email === email.trim().toLowerCase());

  // Email tak terdaftar → 401 generik, tanpa state lockout (backend tidak punya
  // baris akun untuk di-update) — tidak membocorkan keberadaan email.
  if (!account) {
    return { result: { ok: false, reason: "invalid" }, lock: lock ?? fresh, rate: recordRateAttempt(rateEval.state, true) };
  }

  if (lock && lock.lockedUntil && new Date(lock.lockedUntil).getTime() > now.getTime()) {
    return { result: { ok: false, reason: "locked" }, lock, rate: recordRateAttempt(rateEval.state, true) };
  }

  if (!account.isActive) {
    return { result: { ok: false, reason: "inactive" }, lock: lock ?? fresh, rate: rateEval.state };
  }

  if (!passwordMatches(account, password)) {
    const base = lock ?? fresh;
    const attempts = base.attempts + 1;
    if (attempts >= config.maxFailedAttempts) {
      const backoffMs = Math.min(
        config.lockoutBaseMinutes * 60_000 * 2 ** base.lockoutCount,
        config.lockoutMaxMinutes * 60_000
      );
      return {
        result: { ok: false, reason: "locked" },
        lock: {
          attempts: 0,
          lockoutCount: base.lockoutCount + 1,
          lockedUntil: new Date(now.getTime() + backoffMs).toISOString(),
        },
        rate: recordRateAttempt(rateEval.state, true),
      };
    }
    return {
      result: { ok: false, reason: "invalid" },
      lock: { ...base, attempts },
      rate: recordRateAttempt(rateEval.state, true),
    };
  }

  const user: MockUser = {
    id: account.id,
    email: account.email,
    name: account.name,
    role: { name: account.role },
    permissions: ROLE_PERMISSIONS[account.role] ?? [],
    area: account.area ?? null,
  };
  const session = withExpiry(
    { user, menu: resolveSessionMenu(user) },
    rememberMe
  );
  return {
    result: { ok: true, session },
    lock: { ...(lock ?? fresh), attempts: 0 },
    rate: recordRateAttempt(rateEval.state, false),
  };
}

// Override disimpan sebagai hash "argon2-mock:<pw>"; seed pakai plaintext demo.
function passwordMatches(account: MockLoginAccount, password: string): boolean {
  if (account.passwordHash) return account.passwordHash === `argon2-mock:${password}`;
  return account.password === password;
}

// Daftar akun login default = 5 akun seed demo.
export function seedLoginAccounts(): MockLoginAccount[] {
  return mockAccounts.map((a) => ({
    id: `usr_mock_${a.role.toLowerCase()}`,
    email: a.email,
    name: a.name,
    role: a.role,
    isActive: true,
    area: a.area ?? null,
    password: a.password,
  }));
}

// Daftar akun login gabungan: seed + override eps_mock_users (user buatan via
// /users, ubah role/status). passwordHash override menang atas password seed.
export function mockLoginAccounts(patches: MockUserPatch[]): MockLoginAccount[] {
  const hashById = new Map(patches.filter((p) => p.passwordHash).map((p) => [p.id, p.passwordHash!]));
  return applyUserOverrides(seedMockUsers(), patches).map((u) => {
    const seed = mockAccounts.find((a) => a.email.toLowerCase() === u.email.toLowerCase());
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role.name,
      isActive: u.isActive,
      area: u.area,
      password: seed?.password,
      passwordHash: hashById.get(u.id),
    };
  });
}

export function loginMockAccount(email: string, password: string, rememberMe = false): MockLoginResult {
  if (typeof window === "undefined") return { ok: false, reason: "invalid" };
  const locks = loadMockLocks();
  const key = email.trim().toLowerCase();
  const now = new Date();
  const incoming = locks[key] ?? null;
  const wasLocked = !!(incoming?.lockedUntil && new Date(incoming.lockedUntil).getTime() > now.getTime());
  const accounts = mockLoginAccounts(loadUserOverrides(window.localStorage));
  const { result, lock, rate } = processMockLogin(
    email,
    password,
    incoming,
    now,
    rememberMe,
    loadSecurityConfig(window.localStorage),
    accounts,
    loadMockRateLimit()
  );
  locks[key] = lock;
  window.localStorage.setItem(MOCK_LOCK_KEY, JSON.stringify(locks));
  window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rate));
  const account = accounts.find((a) => a.email === key);
  recordLoginAudit(key, result, incoming, lock, now, wasLocked, account);
  return result;
}

// Catat percobaan login mock ke audit trail (eps_mock_audit): sukses, gagal,
// dan lock yang baru terpicu. Lock saat sudah terkunci tetap LOGIN_FAILED.
// account ter-resolve (seed atau override) supaya id/nama akun buatan benar.
function recordLoginAudit(
  email: string,
  result: MockLoginResult,
  incoming: MockLock | null,
  lock: MockLock,
  now: Date,
  wasLocked: boolean,
  account?: MockLoginAccount
): void {
  const userId = account?.id ?? "unknown";
  const base = {
    entityType: "USER",
    entityId: userId,
    ip: clientMeta().ip,
    userAgent: clientMeta().userAgent,
    user: { id: userId, name: account?.name ?? email, email },
  };

  let action: MockAuditAction;
  let before: Record<string, unknown> | null;
  let after: Record<string, unknown> | null;
  if (result.ok) {
    action = "LOGIN_SUCCESS";
    before = null;
    after = { lastLoginAt: now.toISOString() };
  } else if (result.reason === "locked" && !wasLocked) {
    action = "ACCOUNT_LOCKED";
    before = { failedLoginAttempts: incoming?.attempts ?? 0, lockedUntil: null };
    after = {
      failedLoginAttempts: 0,
      lockoutCount: lock.lockoutCount,
      lockedUntil: lock.lockedUntil,
    };
  } else {
    action = "LOGIN_FAILED";
    before = { failedLoginAttempts: incoming?.attempts ?? 0 };
    after = { failedLoginAttempts: lock.attempts };
  }
  appendMockAudit({ ...base, action, before, after });
}

export function loadMockLocks(): Record<string, MockLock> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(MOCK_LOCK_KEY) ?? "{}") as Record<string, MockLock>;
  } catch {
    return {};
  }
}

export function getMockLock(email: string): MockLock | null {
  return loadMockLocks()[email.trim().toLowerCase()] ?? null;
}

export function loadMockRateLimit(): MockRateLimit | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(RATE_LIMIT_KEY) ?? "null") as MockRateLimit | null;
  } catch {
    return null;
  }
}

// Sisa waktu blokir rate limit aktif (ms) untuk countdown UI; null = bebas.
export function getMockRateLimitRemaining(): number | null {
  if (typeof window === "undefined") return null;
  const rateEval = evaluateRateLimit(loadMockRateLimit(), new Date(), loadSecurityConfig(window.localStorage));
  return rateEval.blocked ? rateEval.remainingMs : null;
}

export function loadMockSession(): MockSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MockSession;
  } catch {
    return null;
  }
}

export function saveMockSession(session: MockSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearMockSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}
