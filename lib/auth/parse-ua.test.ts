import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseUserAgent } from "./parse-ua";

describe("parseUserAgent", () => {
  it("Chrome desktop -> Laptop / Chrome / Windows", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
      ),
      { device: "Laptop", browser: "Chrome", os: "Windows" }
    );
  });

  it("Firefox mobile Android -> Smartphone / Firefox / Android", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0"
      ),
      { device: "Smartphone", browser: "Firefox", os: "Android" }
    );
  });

  it("Chrome Android tanpa 'Mobile' -> Tablet", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
      ),
      { device: "Tablet", browser: "Chrome", os: "Android" }
    );
  });

  it("Edge -> Edge (bukan Chrome, walau UA memuat 'Chrome')", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0"
      ),
      { device: "Laptop", browser: "Edge", os: "macOS" }
    );
  });

  it("iPhone Safari -> Smartphone / Safari / iOS", () => {
    assert.deepEqual(
      parseUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      ),
      { device: "Smartphone", browser: "Safari", os: "iOS" }
    );
  });

  it("UA kosong/null/whitespace -> fallback (Laptop / Unknown)", () => {
    assert.deepEqual(parseUserAgent(null), { device: "Laptop", browser: "Unknown", os: "Unknown" });
    assert.deepEqual(parseUserAgent(""), { device: "Laptop", browser: "Unknown", os: "Unknown" });
    assert.deepEqual(parseUserAgent("   "), { device: "Laptop", browser: "Unknown", os: "Unknown" });
    assert.deepEqual(parseUserAgent(undefined), { device: "Laptop", browser: "Unknown", os: "Unknown" });
  });

  it("UA tak dikenal -> fallback device Laptop + Unknown browser/os", () => {
    assert.deepEqual(parseUserAgent("curl/8.4.0"), { device: "Laptop", browser: "Unknown", os: "Unknown" });
  });
});
