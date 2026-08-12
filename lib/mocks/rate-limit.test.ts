import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SECURITY_CONFIG } from "@/lib/security/config";
import {
  evaluateRateLimit,
  recordRateAttempt,
  processMockLogin,
  seedLoginAccounts,
  MOCK_RATE_LIMITED_MESSAGE,
  type MockRateLimit,
} from "./accounts";

const staff = seedLoginAccounts().find((a) => a.email === "staff@eps.local")!;
const t0 = new Date("2026-08-12T07:45:00+07:00");
const WINDOW_MS = DEFAULT_SECURITY_CONFIG.rateLimitWindowMinutes * 60_000;
const MAX = DEFAULT_SECURITY_CONFIG.rateLimitMax;

describe("evaluateRateLimit (jendela tetap global)", () => {
  it("tanpa state → tidak diblokir, state baru di-reset", () => {
    const r = evaluateRateLimit(null, t0);
    assert.equal(r.blocked, false);
    assert.deepEqual(r.state, { count: 0, windowStart: t0.getTime() });
  });

  it("count di bawah ambang → tidak diblokir", () => {
    const r = evaluateRateLimit({ count: MAX - 1, windowStart: t0.getTime() }, t0);
    assert.equal(r.blocked, false);
  });

  it("count mencapai ambang → diblokir dengan sisa waktu sampai akhir window", () => {
    const state: MockRateLimit = { count: MAX, windowStart: t0.getTime() };
    const later = new Date(t0.getTime() + 60_000);
    const r = evaluateRateLimit(state, later);
    assert.equal(r.blocked, true);
    assert.equal(r.remainingMs, WINDOW_MS - 60_000);
    assert.deepEqual(r.state, state); // blokir tidak mengubah state
  });

  it("boundary: tepat saat window berakhir → reset, tidak diblokir", () => {
    const expired = new Date(t0.getTime() + WINDOW_MS);
    const r = evaluateRateLimit({ count: MAX, windowStart: t0.getTime() }, expired);
    assert.equal(r.blocked, false);
    assert.equal(r.state.count, 0);
    assert.equal(r.state.windowStart, expired.getTime());
  });

  it("boundary: tepat sebelum window berakhir → tetap diblokir", () => {
    const almost = new Date(t0.getTime() + WINDOW_MS - 1);
    const r = evaluateRateLimit({ count: MAX, windowStart: t0.getTime() }, almost);
    assert.equal(r.blocked, true);
  });

  it("config kustom mengubah ambang & lebar window", () => {
    const config = { ...DEFAULT_SECURITY_CONFIG, rateLimitMax: 2, rateLimitWindowMinutes: 1 };
    const state: MockRateLimit = { count: 2, windowStart: t0.getTime() };
    assert.equal(evaluateRateLimit(state, t0, config).blocked, true);
    assert.equal(evaluateRateLimit({ count: 1, windowStart: t0.getTime() }, t0, config).blocked, false);
  });
});

describe("recordRateAttempt", () => {
  it("gagal → count +1", () => {
    const r = recordRateAttempt({ count: 3, windowStart: 1 }, true);
    assert.deepEqual(r, { count: 4, windowStart: 1 });
  });

  it("berhasil → count direset", () => {
    const r = recordRateAttempt({ count: 3, windowStart: 1 }, false);
    assert.deepEqual(r, { count: 0, windowStart: 1 });
  });
});

describe("proses login + rate limit global", () => {
  function attempt(email: string, password: string, rate: MockRateLimit | null = null, at = t0, config = DEFAULT_SECURITY_CONFIG) {
    return processMockLogin(email, password, null, at, false, config, undefined, rate);
  }

  it("MAX percobaan gagal → percobaan berikutnya ditolak rate_limited", () => {
    let rate: MockRateLimit | null = null;
    for (let i = 0; i < MAX; i++) {
      const { result, rate: next } = attempt(staff.email, "Salah123!", rate);
      assert.equal(result.ok, false);
      rate = next;
    }
    assert.equal(rate?.count, MAX);
    const { result } = attempt(staff.email, staff.password!, rate);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "rate_limited");
  });

  it("rate limit mendahului lockout per-akun: blokir walau password benar", () => {
    const blocked: MockRateLimit = { count: MAX, windowStart: t0.getTime() };
    const { result } = attempt(staff.email, staff.password!, blocked);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "rate_limited");
  });

  it("window kedaluwarsa → reset, percobaan dilayani lagi", () => {
    const expired: MockRateLimit = { count: MAX, windowStart: t0.getTime() };
    const after = new Date(t0.getTime() + WINDOW_MS);
    const { result, rate } = attempt(staff.email, staff.password!, expired, after);
    assert.equal(result.ok, true);
    assert.equal(rate.count, 0);
  });

  it("sukses login mereset hitungan rate limit", () => {
    const mid: MockRateLimit = { count: 3, windowStart: t0.getTime() };
    const { result, rate } = attempt(staff.email, staff.password!, mid);
    assert.equal(result.ok, true);
    assert.equal(rate.count, 0);
  });

  it("akun nonaktif tidak menambah hitungan (bukan percobaan gagal)", () => {
    const inactive = { ...staff, isActive: false };
    const { result, rate } = processMockLogin(
      staff.email,
      staff.password!,
      null,
      t0,
      false,
      DEFAULT_SECURITY_CONFIG,
      [inactive],
      { count: 4, windowStart: t0.getTime() }
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "inactive");
    assert.equal(rate.count, 4);
  });

  it("percobaan yang diblokir tidak menambah count", () => {
    const blocked: MockRateLimit = { count: MAX, windowStart: t0.getTime() };
    const { rate } = attempt(staff.email, "apa saja", blocked);
    assert.equal(rate.count, MAX);
  });

  it("gagal pada akun terdaftar menambah hitungan global", () => {
    const { result, rate } = attempt(staff.email, "Salah123!", { count: 0, windowStart: t0.getTime() });
    assert.equal(result.ok, false);
    assert.equal(rate.count, 1);
  });

  it("pesan rate limit aman, tidak sebut ambang/window", () => {
    assert.equal(MOCK_RATE_LIMITED_MESSAGE, "Terlalu banyak percobaan");
  });
});
