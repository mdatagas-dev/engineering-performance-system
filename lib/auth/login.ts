import { verify as verifyArgon2 } from "@node-rs/argon2";
import { RoleName } from "@/app/generated/prisma/enums";
import { DEFAULT_BRUTE_FORCE_CONFIG, type BruteForceConfig } from "@/lib/brute-force/config";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  passwordHash: string;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lockoutCount: number;
  userRoles: {
    role: { name: RoleName; permissions: { permission: { key: string } }[] };
  }[];
};

export type LoginDeps = {
  getUserByEmail(email: string): Promise<AuthUser | null>;
  updateUser(
    id: string,
    data: {
      failedLoginAttempts?: number;
      lockedUntil?: Date | null;
      lockoutCount?: number;
      lastLoginAt?: Date;
    }
  ): Promise<unknown>;
  now?(): Date;
  verifyPassword?(hash: string, password: string): Promise<boolean>;
  // config brute-force dinamis (lib/brute-force/config.ts) — maxAttempts utk
  // lockout, lockoutBaseMs/lockoutMaxMs utk backoff. Absen = default AUTH_CONFIG.
  config?: BruteForceConfig;
};

export type LoginResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string;
        role: { name: RoleName };
        permissions: string[];
      };
      lastLoginAt: Date;
    }
  | {
      ok: false;
      status: 401 | 403;
      message: string;
      // akun ter-resolve (null = email tak dikenal) + aksi audit yang cocok
      // dengan contract mock frontend (lib/mocks/accounts.ts): ACCOUNT_LOCKED
      // hanya saat lock BARU terpicu; percobaan saat sudah terkunci tetap LOGIN_FAILED.
      userId: string | null;
      auditAction: "LOGIN_FAILED" | "ACCOUNT_LOCKED";
    };

const MESSAGES = {
  invalid: "Email atau password salah.",
  locked: "Terlalu banyak percobaan login. Akun dikunci sementara.",
  inactive: "Akun ini tidak aktif.",
  noRole: "Akun tidak memiliki peran yang valid.",
} as const;

export async function loginUser(
  { email, password }: { email: string; password: string },
  deps: LoginDeps
): Promise<LoginResult> {
  const now = deps.now?.() ?? new Date();
  const user = await deps.getUserByEmail(email);
  // Nilai lockout dari config dinamis; login route inject dari
  // loadSecurityConfig() (fallback AUTH_CONFIG di lib/brute-force/config.ts).
  const cfg = deps.config ?? DEFAULT_BRUTE_FORCE_CONFIG;

  if (!user) return { ok: false, status: 401, message: MESSAGES.invalid, userId: null, auditAction: "LOGIN_FAILED" };

  if (user.lockedUntil && user.lockedUntil > now) {
    return { ok: false, status: 403, message: MESSAGES.locked, userId: user.id, auditAction: "LOGIN_FAILED" };
  }
  if (!user.isActive) return { ok: false, status: 403, message: MESSAGES.inactive, userId: user.id, auditAction: "LOGIN_FAILED" };

  let passwordOk = false;
  try {
    passwordOk = deps.verifyPassword
      ? await deps.verifyPassword(user.passwordHash, password)
      : await verifyArgon2(user.passwordHash, password);
  } catch {
    passwordOk = false;
  }

  if (!passwordOk) {
    const attempts = user.failedLoginAttempts + 1;
    if (attempts >= cfg.maxAttempts) {
      const backoffMs = Math.min(
        cfg.lockoutBaseMs * 2 ** user.lockoutCount,
        cfg.lockoutMaxMs
      );
      await deps.updateUser(user.id, {
        failedLoginAttempts: 0,
        lockoutCount: user.lockoutCount + 1,
        lockedUntil: new Date(now.getTime() + backoffMs),
      });
    } else {
      await deps.updateUser(user.id, { failedLoginAttempts: attempts });
    }
    const locked = attempts >= cfg.maxAttempts;
    return {
      ok: false,
      status: 401,
      message: MESSAGES.invalid,
      userId: user.id,
      auditAction: locked ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
    };
  }

  // Sukses: reset failedLoginAttempts DAN lockoutCount. Tanpa reset lockoutCount,
  // eskalasi backoff permanen per-akun: akun yang rutin dipakai pemilik sah tetap
  // dihukum lockout 8 jam pada kesalahan berikutnya (laporan agen lain). Login
  // sukses = akun di tangan pemegang password yang benar -> tier backoff kembali ke 0.
  await deps.updateUser(user.id, { failedLoginAttempts: 0, lockoutCount: 0, lastLoginAt: now });

  const role = user.userRoles[0]?.role;
  if (!role) return { ok: false, status: 403, message: MESSAGES.noRole, userId: user.id, auditAction: "LOGIN_FAILED" };

  const permissions = Array.from(
    new Set(user.userRoles.flatMap((ur) => ur.role.permissions.map((p) => p.permission.key)))
  );

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: { name: role.name }, permissions },
    lastLoginAt: now,
  };
}
