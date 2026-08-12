import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isActiveSession, type SessionGateDeps } from "./session";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeDeps(active: number) {
  const calls: { tokenHash: string; now: Date }[] = [];
  const deps: SessionGateDeps = {
    touchActive: async (tokenHash, now) => {
      calls.push({ tokenHash, now: now ?? new Date() });
      return active;
    },
  };
  return { deps, calls };
}

describe("isActiveSession", () => {
  it("sesi aktif -> true, meneruskan tokenHash + now", async () => {
    const { deps, calls } = makeDeps(1);
    const active = await isActiveSession(deps, "hash-abc", NOW);
    assert.equal(active, true);
    assert.deepEqual(calls, [{ tokenHash: "hash-abc", now: NOW }]);
  });

  it("sesi revoked/kedaluwarsa (0 baris di-touch) -> false", async () => {
    const { deps } = makeDeps(0);
    assert.equal(await isActiveSession(deps, "hash-xyz"), false);
  });
});

const IDLE_MS = 30 * 60 * 1000;

function makeIdleGate(lastUsedAt?: Date | null | undefined, touched = 1) {
  const touchedCalls: { tokenHash: string; now: Date }[] = [];
  const revokedCalls: { tokenHash: string; now: Date }[] = [];
  const deps: SessionGateDeps = {
    touchActive: async (tokenHash, now) => {
      touchedCalls.push({ tokenHash, now: now ?? new Date() });
      return touched;
    },
    readLastUsed: async () => lastUsedAt,
    revokeIdle: async (tokenHash, now) => {
      revokedCalls.push({ tokenHash, now: now ?? new Date() });
    },
  };
  return { deps, touchedCalls, revokedCalls };
}

describe("isActiveSession idle timeout", () => {
  it("tepat di ambang (lastUsedAt = now - idle) -> masih aktif + touch", async () => {
    const { deps, touchedCalls, revokedCalls } = makeIdleGate(new Date(NOW.getTime() - IDLE_MS));
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, IDLE_MS), true);
    assert.equal(touchedCalls.length, 1);
    assert.equal(revokedCalls.length, 0);
  });

  it("lewat 1 detik -> idle, sesi di-revoke + false, touch TIDAK dipanggil", async () => {
    const { deps, touchedCalls, revokedCalls } = makeIdleGate(new Date(NOW.getTime() - IDLE_MS - 1000));
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, IDLE_MS), false);
    assert.deepEqual(revokedCalls, [{ tokenHash: "hash-abc", now: NOW }]);
    assert.equal(touchedCalls.length, 0);
  });

  it("lastUsedAt null (login lama) -> dianggap aktif + touch, tidak di-revoke", async () => {
    const { deps, touchedCalls, revokedCalls } = makeIdleGate(null);
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, IDLE_MS), true);
    assert.equal(touchedCalls.length, 1);
    assert.equal(revokedCalls.length, 0);
  });

  it("sesi tidak valid (undefined = tak ada/revoked/expired) -> false tanpa revoke/touch", async () => {
    const { deps, touchedCalls, revokedCalls } = makeIdleGate(undefined, 0);
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, IDLE_MS), false);
    assert.equal(touchedCalls.length, 0);
    assert.equal(revokedCalls.length, 0);
  });

  it("idleTimeoutMs null -> idle check dinonaktifkan, sesi lama tetap aktif", async () => {
    const { deps, touchedCalls } = makeIdleGate(new Date(NOW.getTime() - IDLE_MS - 1000));
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, null), true);
    assert.equal(touchedCalls.length, 1);
  });

  it("tanpa deps idle (hanya touchActive) -> idle check dilewati", async () => {
    const { deps } = makeDeps(1);
    assert.equal(await isActiveSession(deps, "hash-abc", NOW, IDLE_MS), true);
  });
});
