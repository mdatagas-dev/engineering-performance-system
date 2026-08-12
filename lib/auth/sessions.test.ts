import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  revokeSession,
  revokeAllSessions,
  cleanupExpiredSessions,
  hashToken,
  type SessionDeps,
} from "./sessions";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeDeps() {
  const created: Parameters<SessionDeps["create"]>[0][] = [];
  const revoked: string[] = [];
  const revokedAll: string[] = [];
  let expired: Date | null = null;
  const deps: SessionDeps = {
    create: async (data) => {
      created.push(data);
    },
    revoke: async (id) => {
      revoked.push(id);
    },
    revokeAll: async (userId) => {
      revokedAll.push(userId);
    },
    deleteExpired: async (now) => {
      expired = now;
    },
  };
  return { deps, created, revoked, revokedAll, getExpired: () => expired };
}

describe("sessions", () => {
  it("hashToken: sha256 hex deterministik, token mentah tak tersimpan", () => {
    const token = "abc.def.ghi";
    const hash = hashToken(token);
    assert.equal(hash, hashToken(token));
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
  });

  it("createSession: token + hash + expiresAt sesuai ttl, meta masuk deps", async () => {
    const { deps, created } = makeDeps();
    const result = await createSession(
      deps,
      { userId: "u1", ttlSeconds: 3600, meta: { ip: "1.2.3.4", userAgent: "Chrome" }, now: NOW }
    );

    assert.equal(result.tokenHash, hashToken(result.token));
    assert.equal(result.expiresAt.toISOString(), new Date(NOW.getTime() + 3600_000).toISOString());
    assert.equal(created[0].userId, "u1");
    assert.equal(created[0].ip, "1.2.3.4");
    assert.equal(created[0].userAgent, "Chrome");
    assert.equal(created[0].tokenHash, result.tokenHash);
  });

  it("createSession: tanpa meta -> null di DB", async () => {
    const { deps, created } = makeDeps();
    await createSession(deps, { userId: "u1", now: NOW });
    assert.equal(created[0].ip, null);
    assert.equal(created[0].userAgent, null);
  });

  it("revokeSession/revokeAllSessions/cleanupExpiredSessions meneruskan argumen", async () => {
    const { deps, revoked, revokedAll, getExpired } = makeDeps();

    await revokeSession(deps, "s1");
    assert.deepEqual(revoked, ["s1"]);

    await revokeAllSessions(deps, "u1");
    assert.deepEqual(revokedAll, ["u1"]);

    await cleanupExpiredSessions(deps, NOW);
    assert.equal(getExpired(), NOW);
  });
});
