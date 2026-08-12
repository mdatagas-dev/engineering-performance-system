import { AUTH_CONFIG } from "@/lib/auth/config";

export type MockUser = {
  id: string;
  email: string;
  name: string;
  role: { name: string };
  permissions: string[];
  area: { id: string; name: string } | null;
};

export type MockMenuItem = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  children?: MockMenuItem[];
};

export type MockSession = {
  user: MockUser;
  menu: MockMenuItem[];
  expiresAt: string; // ISO — saat sesi tiruan dianggap berakhir (dihitung saat login).
};

// Anchor waktu demo untuk SessionClock (durasi sesi di beranda); sesi tiruan
// menyimpan expiresAt, bukan createdAt, jadi start tidak bisa diderivasi ulang.
export const sessionStartedAt = "2026-08-12T07:45:00+07:00";

// TTL sesi tiruan meniru backend JWT (lib/auth/config.ts): 8 jam, 30 hari kalau Remember Me.
export const SESSION_TTL_MS = AUTH_CONFIG.sessionTtlSeconds * 1000;
export const REMEMBER_TTL_MS = AUTH_CONFIG.rememberTtlSeconds * 1000;

export function sessionExpiresAt(now: Date, rememberMe: boolean): string {
  const ttl = rememberMe ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  return new Date(now.getTime() + ttl).toISOString();
}

// Stamp expiresAt saat sesi tiruan disimpan (login mock).
export function withExpiry(
  session: Omit<MockSession, "expiresAt">,
  rememberMe: boolean,
  now: Date = new Date()
): MockSession {
  return { ...session, expiresAt: sessionExpiresAt(now, rememberMe) };
}

// Sesi lama tanpa expiresAt (simpanan sebelum fitur ini) dianggap belum kedaluwarsa — jangan dihapus paksa.
export function isSessionExpired(session: MockSession, now: Date = new Date()): boolean {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now.getTime();
}
