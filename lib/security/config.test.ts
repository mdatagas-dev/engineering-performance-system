import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTH_CONFIG } from "@/lib/auth/config";
import {
  DEFAULT_SECURITY_CONFIG,
  SECURITY_CONFIG_STORAGE_KEY,
  isSecurityConfigValid,
  loadSecurityConfig,
  parseSecurityConfig,
  saveSecurityConfig,
  validateSecurityConfig,
} from "./config";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  let data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {
      data = {};
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
    get length() {
      return Object.keys(data).length;
    },
  };
}

describe("DEFAULT_SECURITY_CONFIG", () => {
  it("default mengikuti AUTH_CONFIG backend (ms → menit)", () => {
    assert.equal(DEFAULT_SECURITY_CONFIG.maxFailedAttempts, AUTH_CONFIG.maxFailedAttempts);
    assert.equal(DEFAULT_SECURITY_CONFIG.lockoutBaseMinutes, AUTH_CONFIG.lockoutBaseMs / 60_000);
    assert.equal(DEFAULT_SECURITY_CONFIG.lockoutMaxMinutes, AUTH_CONFIG.lockoutMaxMs / 60_000);
    assert.equal(isSecurityConfigValid(DEFAULT_SECURITY_CONFIG), true);
  });
});

describe("parseSecurityConfig", () => {
  it("input rusak/kosong → default", () => {
    assert.deepEqual(parseSecurityConfig(null), DEFAULT_SECURITY_CONFIG);
    assert.deepEqual(parseSecurityConfig("kacau"), DEFAULT_SECURITY_CONFIG);
    assert.deepEqual(parseSecurityConfig({ maxFailedAttempts: "x" }), DEFAULT_SECURITY_CONFIG);
  });

  it("nilai di luar range → field itu kembali default", () => {
    const parsed = parseSecurityConfig({ maxFailedAttempts: 999, lockoutBaseMinutes: 0, lockoutMaxMinutes: 60 });
    assert.equal(parsed.maxFailedAttempts, DEFAULT_SECURITY_CONFIG.maxFailedAttempts);
    assert.equal(parsed.lockoutBaseMinutes, DEFAULT_SECURITY_CONFIG.lockoutBaseMinutes);
    assert.equal(parsed.lockoutMaxMinutes, 60);
  });

  it("nilai valid string numeric → diterima", () => {
    assert.deepEqual(parseSecurityConfig({ maxFailedAttempts: "10", lockoutBaseMinutes: 30, lockoutMaxMinutes: 120 }), {
      maxFailedAttempts: 10,
      lockoutBaseMinutes: 30,
      lockoutMaxMinutes: 120,
      rateLimitMax: DEFAULT_SECURITY_CONFIG.rateLimitMax,
      rateLimitWindowMinutes: DEFAULT_SECURITY_CONFIG.rateLimitWindowMinutes,
    });
  });

  it("nilai rate limit di luar range → field itu kembali default", () => {
    const parsed = parseSecurityConfig({ rateLimitMax: 0, rateLimitWindowMinutes: 999 });
    assert.equal(parsed.rateLimitMax, DEFAULT_SECURITY_CONFIG.rateLimitMax);
    assert.equal(parsed.rateLimitWindowMinutes, DEFAULT_SECURITY_CONFIG.rateLimitWindowMinutes);
  });
});

describe("validateSecurityConfig", () => {
  it("konfigurasi valid → tanpa error", () => {
    assert.deepEqual(validateSecurityConfig({ ...DEFAULT_SECURITY_CONFIG, maxFailedAttempts: 5, lockoutBaseMinutes: 15, lockoutMaxMinutes: 480 }), {});
  });

  it("di luar range → error per field", () => {
    const errors = validateSecurityConfig({ ...DEFAULT_SECURITY_CONFIG, maxFailedAttempts: 0, lockoutBaseMinutes: 2000, lockoutMaxMinutes: 1.5 });
    assert.ok(errors.maxFailedAttempts);
    assert.ok(errors.lockoutBaseMinutes);
    assert.ok(errors.lockoutMaxMinutes);
  });

  it("rate limit di luar range → error per field", () => {
    const errors = validateSecurityConfig({ ...DEFAULT_SECURITY_CONFIG, rateLimitMax: 0, rateLimitWindowMinutes: 100 });
    assert.ok(errors.rateLimitMax);
    assert.ok(errors.rateLimitWindowMinutes);
  });

  it("lockoutMax < lockoutBase → error", () => {
    const errors = validateSecurityConfig({ ...DEFAULT_SECURITY_CONFIG, maxFailedAttempts: 5, lockoutBaseMinutes: 60, lockoutMaxMinutes: 30 });
    assert.match(errors.lockoutMaxMinutes ?? "", /lebih kecil/i);
  });
});

describe("load/saveSecurityConfig", () => {
  it("tanpa storage → default", () => {
    assert.deepEqual(loadSecurityConfig(), DEFAULT_SECURITY_CONFIG);
  });

  it("simpan lalu muat → roundtrip", () => {
    const storage = fakeStorage();
    const custom = { ...DEFAULT_SECURITY_CONFIG, maxFailedAttempts: 3, lockoutBaseMinutes: 10, lockoutMaxMinutes: 240, rateLimitMax: 20, rateLimitWindowMinutes: 10 };
    saveSecurityConfig(custom, storage);
    assert.deepEqual(loadSecurityConfig(storage), custom);
    assert.ok(storage.getItem(SECURITY_CONFIG_STORAGE_KEY));
  });

  it("JSON rusak di storage → default", () => {
    const storage = fakeStorage({ [SECURITY_CONFIG_STORAGE_KEY]: "{oops" });
    assert.deepEqual(loadSecurityConfig(storage), DEFAULT_SECURITY_CONFIG);
  });
});
