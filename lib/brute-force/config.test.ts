import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BRUTE_FORCE_CONFIG_KEY,
  DEFAULT_BRUTE_FORCE_CONFIG,
  BRUTE_FORCE_BOUNDS,
  parseBruteForceConfig,
  loadSecurityConfig,
  validateSecurityConfigUpdate,
  type SecurityConfigDeps,
} from "./config";
import { AUTH_CONFIG } from "@/lib/auth/config";

const row = (overrides: Record<string, unknown> = {}) => ({
  key: BRUTE_FORCE_CONFIG_KEY,
  value: {
    maxAttempts: 5,
    lockoutBaseMs: 900_000,
    lockoutMaxMs: 28_800_000,
    rateLimitMaxAttempts: 10,
    rateLimitWindowMs: 300_000,
    ...overrides,
  },
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  updatedBy: "admin-1",
});

function makeDeps(
  rows: { key: string; value: unknown; updatedAt: Date; updatedBy: string | null }[]
): SecurityConfigDeps {
  return { findRows: async () => rows };
}

describe("parseBruteForceConfig", () => {
  it("nilai valid dipertahankan persis", () => {
    const cfg = parseBruteForceConfig({
      maxAttempts: 7,
      lockoutBaseMs: 1_200_000,
      lockoutMaxMs: 3_600_000,
      rateLimitMaxAttempts: 20,
      rateLimitWindowMs: 600_000,
    });
    assert.deepEqual(cfg, {
      maxAttempts: 7,
      lockoutBaseMs: 1_200_000,
      lockoutMaxMs: 3_600_000,
      rateLimitMaxAttempts: 20,
      rateLimitWindowMs: 600_000,
    });
  });

  it("merge default: field hilang/bukan angka -> nilai AUTH_CONFIG", () => {
    const cfg = parseBruteForceConfig({ maxAttempts: 6, lockoutBaseMs: "900000" });
    assert.equal(cfg.maxAttempts, 6);
    assert.equal(cfg.rateLimitMaxAttempts, DEFAULT_BRUTE_FORCE_CONFIG.rateLimitMaxAttempts);
    assert.equal(cfg.rateLimitWindowMs, DEFAULT_BRUTE_FORCE_CONFIG.rateLimitWindowMs);
    assert.equal(cfg.lockoutBaseMs, DEFAULT_BRUTE_FORCE_CONFIG.lockoutBaseMs);
    assert.equal(cfg.lockoutMaxMs, DEFAULT_BRUTE_FORCE_CONFIG.lockoutMaxMs);
  });

  it("bukan object -> murni default", () => {
    assert.deepEqual(parseBruteForceConfig(null), DEFAULT_BRUTE_FORCE_CONFIG);
    assert.deepEqual(parseBruteForceConfig("x"), DEFAULT_BRUTE_FORCE_CONFIG);
  });

  it("clamp bounds: maxAttempts 3..10, window 60s..1h, base 5mnt..2h", () => {
    const cfg = parseBruteForceConfig({
      maxAttempts: 100,
      rateLimitWindowMs: 1_000,
      lockoutBaseMs: 60_000,
    });
    assert.equal(cfg.maxAttempts, BRUTE_FORCE_BOUNDS.maxAttempts.max);
    assert.equal(cfg.rateLimitWindowMs, BRUTE_FORCE_BOUNDS.rateLimitWindowMs.min);
    assert.equal(cfg.lockoutBaseMs, BRUTE_FORCE_BOUNDS.lockoutBaseMs.min);

    const cfg2 = parseBruteForceConfig({
      maxAttempts: 1,
      rateLimitWindowMs: 99 * 60 * 60_000,
      lockoutBaseMs: 3 * 60 * 60_000,
    });
    assert.equal(cfg2.maxAttempts, BRUTE_FORCE_BOUNDS.maxAttempts.min);
    assert.equal(cfg2.rateLimitWindowMs, BRUTE_FORCE_BOUNDS.rateLimitWindowMs.max);
    assert.equal(cfg2.lockoutBaseMs, BRUTE_FORCE_BOUNDS.lockoutBaseMs.max);
  });

  it("cap < base -> cap dinaikkan ke base (invariant)", () => {
    const cfg = parseBruteForceConfig({ lockoutBaseMs: 3_600_000, lockoutMaxMs: 300_000 });
    assert.equal(cfg.lockoutMaxMs, 3_600_000);
  });

  it("default sama persis dengan AUTH_CONFIG saat ini", () => {
    assert.equal(DEFAULT_BRUTE_FORCE_CONFIG.maxAttempts, AUTH_CONFIG.maxFailedAttempts);
    assert.equal(DEFAULT_BRUTE_FORCE_CONFIG.lockoutBaseMs, AUTH_CONFIG.lockoutBaseMs);
    assert.equal(DEFAULT_BRUTE_FORCE_CONFIG.lockoutMaxMs, AUTH_CONFIG.lockoutMaxMs);
    assert.equal(DEFAULT_BRUTE_FORCE_CONFIG.rateLimitMaxAttempts, AUTH_CONFIG.rateLimitMaxAttempts);
    assert.equal(DEFAULT_BRUTE_FORCE_CONFIG.rateLimitWindowMs, AUTH_CONFIG.rateLimitWindowMs);
  });
});

describe("loadSecurityConfig", () => {
  it("table kosong -> fallback default + meta null", async () => {
    const loaded = await loadSecurityConfig(makeDeps([]));
    assert.deepEqual(loaded.config, DEFAULT_BRUTE_FORCE_CONFIG);
    assert.equal(loaded.updatedAt, null);
    assert.equal(loaded.updatedBy, null);
  });

  it("key brute_force ada -> config parse + meta baris", async () => {
    const r = row({ maxAttempts: 8 });
    const loaded = await loadSecurityConfig(makeDeps([{ key: "lain", value: {}, updatedAt: new Date(), updatedBy: null }, r]));
    assert.equal(loaded.config.maxAttempts, 8);
    assert.equal(loaded.updatedAt, r.updatedAt);
    assert.equal(loaded.updatedBy, "admin-1");
  });

  it("key lain saja -> default (bukan key yang salah)", async () => {
    const loaded = await loadSecurityConfig(makeDeps([{ key: "junk", value: { maxAttempts: 1 }, updatedAt: new Date(), updatedBy: null }]));
    assert.deepEqual(loaded.config, DEFAULT_BRUTE_FORCE_CONFIG);
  });
});

describe("validateSecurityConfigUpdate", () => {
  it("partial update: hanya field yang ada", () => {
    const r = validateSecurityConfigUpdate({ maxAttempts: 6 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.data, { maxAttempts: 6 });
  });

  it("body kosong -> ok dengan data kosong (route menolak 'tidak ada field')", () => {
    const r = validateSecurityConfigUpdate({});
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.data, {});
  });

  it("clamp nilai out-of-range pada partial update", () => {
    const r = validateSecurityConfigUpdate({ maxAttempts: 99, rateLimitWindowMs: 1 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.maxAttempts, BRUTE_FORCE_BOUNDS.maxAttempts.max);
  });

  it("bukan object -> 400", () => {
    const r = validateSecurityConfigUpdate("x");
    assert.equal(r.ok, false);
  });

  it("key bukan brute_force -> 400", () => {
    const r = validateSecurityConfigUpdate({ key: "rate_limit", maxAttempts: 6 });
    assert.equal(r.ok, false);
  });

  it("key brute_force -> diterima", () => {
    const r = validateSecurityConfigUpdate({ key: "brute_force", maxAttempts: 6 });
    assert.equal(r.ok, true);
  });

  it("field tak dikenal -> 400", () => {
    const r = validateSecurityConfigUpdate({ maxAttempt: 6 });
    assert.equal(r.ok, false);
  });

  it("nilai bukan integer -> 400", () => {
    assert.equal(validateSecurityConfigUpdate({ maxAttempts: 5.5 }).ok, false);
    assert.equal(validateSecurityConfigUpdate({ maxAttempts: "5" }).ok, false);
  });

  it("cap < base pada update -> 400 (bukan clamp diam-diam)", () => {
    const r = validateSecurityConfigUpdate({ lockoutBaseMs: 1_000_000, lockoutMaxMs: 500_000 });
    assert.equal(r.ok, false);
  });

  it("cap >= base -> diterima", () => {
    const r = validateSecurityConfigUpdate({ lockoutBaseMs: 500_000, lockoutMaxMs: 1_000_000 });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(r.data, { lockoutBaseMs: 500_000, lockoutMaxMs: 1_000_000 });
  });
});