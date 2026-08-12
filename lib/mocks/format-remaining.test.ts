import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatRemaining } from "./format-remaining";

describe("formatRemaining (countdown lockout)", () => {
  it("durasi penuh: menit + detik", () => {
    assert.equal(formatRemaining(90_000), "1 menit 30 detik");
    assert.equal(formatRemaining(15 * 60_000), "15 menit 0 detik");
    assert.equal(formatRemaining(8 * 60 * 60_000), "480 menit 0 detik");
  });

  it("di bawah satu menit: hanya detik", () => {
    assert.equal(formatRemaining(59_000), "59 detik");
    assert.equal(formatRemaining(1_500), "2 detik");
  });

  it("bulatkan ke atas (jangan tampilkan 0 saat masih terkunci)", () => {
    assert.equal(formatRemaining(500), "1 detik");
    assert.equal(formatRemaining(59_999), "1 menit 0 detik");
  });

  it("boundary 0", () => {
    assert.equal(formatRemaining(0), "0 detik");
  });

  it("negatif → clamp ke 0", () => {
    assert.equal(formatRemaining(-5_000), "0 detik");
  });
});
