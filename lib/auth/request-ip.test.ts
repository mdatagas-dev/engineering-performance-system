import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { getClientIp } from "./request-ip";

const OLD = process.env.TRUSTED_PROXIES;

describe("getClientIp (anti XFF spoofing)", () => {
  after(() => {
    if (OLD === undefined) delete process.env.TRUSTED_PROXIES;
    else process.env.TRUSTED_PROXIES = OLD;
  });

  it("tanpa TRUSTED_PROXIES → null walau header x-forwarded-for diisi", () => {
    delete process.env.TRUSTED_PROXIES;
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" },
    });
    assert.equal(getClientIp(req), null);
  });

  it("tanpa TRUSTED_PROXIES → null walau header x-real-ip diisi", () => {
    delete process.env.TRUSTED_PROXIES;
    const req = new Request("http://x", { headers: { "x-real-ip": "203.0.113.9" } });
    assert.equal(getClientIp(req), null);
  });

  it("dengan TRUSTED_PROXIES → ambil hop pertama x-forwarded-for", () => {
    process.env.TRUSTED_PROXIES = "127.0.0.1";
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
    });
    assert.equal(getClientIp(req), "203.0.113.9");
  });

  it("dengan TRUSTED_PROXIES → fallback x-real-ip", () => {
    process.env.TRUSTED_PROXIES = "127.0.0.1";
    const req = new Request("http://x", { headers: { "x-real-ip": "203.0.113.9" } });
    assert.equal(getClientIp(req), "203.0.113.9");
  });

  it("TRUSTED_PROXIES spasi/komma di-trim; tanpa header → null", () => {
    process.env.TRUSTED_PROXIES = " 127.0.0.1, ::1 ";
    const req = new Request("http://x");
    assert.equal(getClientIp(req), null);
  });
});
