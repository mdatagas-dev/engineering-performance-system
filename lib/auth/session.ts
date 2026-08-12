import { RoleName } from "@/app/generated/prisma/enums";
import { getJwtSecret } from "./config";
import { verifyToken, type SessionPayload } from "./jwt";

export type { SessionPayload } from "./jwt";

export function getSession(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  return verifyToken(token, getJwtSecret());
}

export type SessionGateDeps = {
  // touch aktifkan sesi (update lastUsedAt) via tokenHash; kembalikan 1 bila
  // sesi valid (ada, belum revoked, belum kedaluwarsa) dan 0 bila tidak.
  touchActive(tokenHash: string, now?: Date): Promise<number>;
  // baca lastUsedAt sesi valid (ada, belum revoked, belum kedaluwarsa):
  // Date = lastUsedAt, null = sesi ada tapi lastUsedAt kosong (login lama),
  // undefined = sesi tidak valid (tak ada / revoked / kedaluwarsa).
  readLastUsed?(tokenHash: string): Promise<Date | null | undefined>;
  // revoke baris sesi karena idle timeout (isRevoked=true + revokedAt).
  revokeIdle?(tokenHash: string, now?: Date): Promise<unknown>;
};

// Cek sesi server-side (tabel Session) — pelengkap getSession (JWT stateless):
// tokenHash = sha256(token JWT). Dipakai di proxy.ts sebagai gerbang revoke/
// logout-all & idle timeout; lastUsedAt di-touch tiap request valid.
// Urutan cek: idle dulu (lastUsedAt < now - idleTimeoutMs -> revoke + false),
// baru touch — supaya touch TIDAK menghidupkan sesi yang idle. idleTimeoutMs
// null = tanpa idle timeout (pakai abs expiry saja).
export async function isActiveSession(
  deps: SessionGateDeps,
  tokenHash: string,
  now?: Date,
  idleTimeoutMs?: number | null
): Promise<boolean> {
  const d = now ?? new Date();
  if (idleTimeoutMs != null && deps.readLastUsed) {
    const lastUsedAt = await deps.readLastUsed(tokenHash);
    if (lastUsedAt === undefined) return false;
    if (lastUsedAt !== null && lastUsedAt.getTime() < d.getTime() - idleTimeoutMs) {
      await deps.revokeIdle?.(tokenHash, d);
      return false;
    }
  }
  const touched = await deps.touchActive(tokenHash, d);
  return touched > 0;
}

export function requirePermission(session: SessionPayload, permission: string): boolean {
  if (session.role === RoleName.SUPER_ADMIN) return true;
  return session.permissions.includes(permission);
}
