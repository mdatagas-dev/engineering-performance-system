import { AUTH_CONFIG } from "./config";
import { hashToken } from "./sessions";

export type RevokeCurrentDeps = {
  revokeByTokenHash(tokenHash: string): Promise<unknown>;
};

export type RevokeAllDeps = {
  revokeAllByUserId(userId: string): Promise<unknown>;
};

// Flags cookie identik dengan login route, TTL 0 — browser langsung hapus.
export function logoutCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: AUTH_CONFIG.cookieSecure,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  };
}

// Idempotent: tanpa token (cookie sudah hilang / sesi sudah mati) revoke
// dilewati — handler tetap balas 200 + hapus cookie.
export async function logoutCurrent(
  deps: RevokeCurrentDeps,
  token: string | null | undefined
): Promise<void> {
  if (!token) return;
  await deps.revokeByTokenHash(hashToken(token));
}

export async function logoutAll(deps: RevokeAllDeps, userId: string): Promise<void> {
  await deps.revokeAllByUserId(userId);
}

export function requestMeta(req: Request) {
  return {
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}
