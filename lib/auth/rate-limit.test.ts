import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  countWindowFailures,
  isIpRateLimited,
  recordLoginAttempt,
  cleanupOldLoginAttempts,
  type RateLimitDeps,
} from "./rateLimit";
import { AUTH_CONFIG } from "./config";

const NOW = new Date("2026-01-01T00:00:00Z");
const WINDOW = AUTH_CONFIG.rateLimitWindowMs;
const MAX = AUTH_CONFIG.rateLimitMaxAttempts;

function attempt(offsetMs: number, success: boolean) {
  return { success, createdAt: new Date(NOW.getTime() + offsetMs) };
}

function makeDeps(overrides: Partial<RateLimitDeps> = {}) {
  const created: { ip: string; email: string; success: boolean }[] = [];
  const deleted: { cutoff: Date }[] = [];
  const deps: RateLimitDeps = {
    findRecent: async () => [],
    create: async (data) => {
      created.push(data);
    },
    deleteBefore: async (cutoff) => {
      deleted.push({ cutoff });
    },
    now: () => NOW,
    ...overrides,
  };
  return { deps, created, deleted };
}

describe("countWindowFailures", () => {
  it("menghitung semua kegagalan dalam window tanpa sukses", () => {
    const attempts = Array.from({ length: MAX }, (_, i) => attempt(-(i + 1) * 1000, false));
    assert.equal(countWindowFailures(attempts, NOW, WINDOW), MAX);
  });

  it("kegagalan tepat di awal window tidak dihitung (boundary)", () => {
    const attempts = [attempt(-WINDOW, false), attempt(-WINDOW + 1, false)];
    assert.equal(countWindowFailures(attempts, NOW, WINDOW), 1);
  });

  it("sukses dalam window mereset hitungan: gagal sebelum sukses tidak dihitung", () => {
    const attempts = [
      attempt(-300_000, false),
      attempt(-200_000, true),
      attempt(-100_000, false),
    ];
    assert.equal(countWindowFailures(attempts, NOW, WINDOW), 1);
  });

  it("sukses di luar window tidak mereset hitungan", () => {
    const attempts = [attempt(-WINDOW - 1000, true), attempt(-100_000, false)];
    assert.equal(countWindowFailures(attempts, NOW, WINDOW), 1);
  });

  it("tanpa percobaan -> 0", () => {
    assert.equal(countWindowFailures([], NOW, WINDOW), 0);
  });
});

describe("isIpRateLimited", () => {
  it("di bawah ambang -> tidak blokir", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: MAX - 1 }, (_, i) => attempt(-(i + 1) * 1000, false)),
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), false);
  });

  it("override maxAttempts (config dinamis) -> ambang lebih rendah berlaku", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: 2 }, (_, i) => attempt(-(i + 1) * 1000, false)),
    });
    assert.equal(
      await isIpRateLimited(deps, "1.2.3.4", { maxAttempts: 2, windowMs: WINDOW }),
      true
    );
    assert.equal(
      await isIpRateLimited(deps, "1.2.3.4", { maxAttempts: 3, windowMs: WINDOW }),
      false
    );
  });

  it("override windowMs lebih panjang -> kegagalan lama ikut dihitung", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: MAX }, (_, i) => attempt(-WINDOW - (i + 1) * 1000, false)),
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), false);
    assert.equal(
      await isIpRateLimited(deps, "1.2.3.4", { maxAttempts: MAX, windowMs: WINDOW * 2 }),
      true
    );
  });

  it(">= ambang gagal dalam window -> blokir", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: MAX }, (_, i) => attempt(-(i + 1) * 1000, false)),
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), true);
  });

  it("gagal lama di luar window -> tidak blokir (window reset)", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: MAX }, (_, i) => attempt(-WINDOW - (i + 1) * 1000, false)),
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), false);
  });

  it("sukses di antara kegagalan -> hitungan reset", async () => {
    const { deps } = makeDeps({
      findRecent: async () => [
        ...Array.from({ length: MAX - 2 }, (_, i) => attempt(-(i + 4) * 1000, false)),
        attempt(-3000, true),
        attempt(-2000, false),
      ],
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), false);
  });

  it("blokir per-IP lintas akun (findRecent tak memfilter email)", async () => {
    const { deps } = makeDeps({
      findRecent: async () =>
        Array.from({ length: MAX }, (_, i) => attempt(-(i + 1) * 1000, false)),
    });
    assert.equal(await isIpRateLimited(deps, "1.2.3.4"), true);
  });
});

describe("recordLoginAttempt", () => {
  it("mencatat percobaan sukses & gagal dengan ip + email", async () => {
    const { deps, created } = makeDeps();
    await recordLoginAttempt(deps, { ip: "1.2.3.4", email: "a@b.c", success: false });
    await recordLoginAttempt(deps, { ip: "1.2.3.4", email: "a@b.c", success: true });
    assert.deepEqual(created, [
      { ip: "1.2.3.4", email: "a@b.c", success: false },
      { ip: "1.2.3.4", email: "a@b.c", success: true },
    ]);
  });
});

describe("cleanupOldLoginAttempts", () => {
  it("deleteBefore dipanggil dengan cutoff = now - retensi", async () => {
    const { deps, deleted } = makeDeps();
    await cleanupOldLoginAttempts(deps);
    assert.equal(deleted.length, 1);
    assert.equal(deleted[0].cutoff.getTime(), NOW.getTime() - AUTH_CONFIG.loginAttemptRetentionMs);
  });
});
