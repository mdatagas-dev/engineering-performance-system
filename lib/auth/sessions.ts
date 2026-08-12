import { createHash, randomBytes } from "node:crypto";
import { AUTH_CONFIG } from "./config";

export type SessionMeta = {
  ip?: string;
  userAgent?: string;
};

export type SessionDeps = {
  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<unknown>;
  revoke(id: string): Promise<unknown>;
  revokeAll(userId: string): Promise<unknown>;
  deleteExpired(now: Date): Promise<unknown>;
};

// sha256 hex dari token sesi — lookup & logout pakai hash ini, token mentah
// tidak pernah disimpan di DB.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  deps: SessionDeps,
  input: { userId: string; ttlSeconds?: number; meta?: SessionMeta; now?: Date }
): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const ttl = input.ttlSeconds ?? AUTH_CONFIG.sessionTtlSeconds;
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  await deps.create({
    userId: input.userId,
    tokenHash,
    expiresAt: new Date(now.getTime() + ttl * 1000),
    ip: input.meta?.ip ?? null,
    userAgent: input.meta?.userAgent ?? null,
  });
  return { token, tokenHash, expiresAt: new Date(now.getTime() + ttl * 1000) };
}

export async function revokeSession(deps: SessionDeps, id: string): Promise<void> {
  await deps.revoke(id);
}

export async function revokeAllSessions(deps: SessionDeps, userId: string): Promise<void> {
  await deps.revokeAll(userId);
}

export async function cleanupExpiredSessions(deps: SessionDeps, now?: Date): Promise<void> {
  await deps.deleteExpired(now ?? new Date());
}
