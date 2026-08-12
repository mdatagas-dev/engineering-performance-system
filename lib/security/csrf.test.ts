import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractHost, isAllowedOrigin, isSameHost, isUnsafeMethod, parseHost } from "./csrf";

describe("isUnsafeMethod", () => {
  it("POST/PUT/PATCH/DELETE = unsafe, GET/HEAD/OPTIONS = aman", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(isUnsafeMethod(m), true);
    for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(isUnsafeMethod(m), false);
    assert.equal(isUnsafeMethod("post"), true);
  });
});

describe("parseHost / extractHost normalisasi", () => {
  it("host header polos (tanpa skema) + origin ber-skema → host sama", () => {
    assert.equal(isSameHost(parseHost("example.com")!, parseHost("https://example.com")!), true);
    assert.equal(extractHost("api.example.com:3030"), extractHost("http://api.example.com:3030/path?q=1"));
  });

  it("case-insensitive: hostname besar/kecil disamakan", () => {
    assert.equal(extractHost("HTTPS://EXAMPLE.COM"), "example.com");
    assert.equal(extractHost("Example.COM:8080"), "example.com:8080");
  });

  it("trailing dot FQDN dianggap origin sama", () => {
    assert.equal(extractHost("example.com."), "example.com");
    assert.equal(isSameHost(parseHost("example.com.")!, parseHost("example.com")!), true);
  });

  it("userinfo + path/query dibuang, hostname tetap", () => {
    assert.equal(extractHost("https://user:pass@example.com:8443/x?y=1"), "example.com:8443");
  });

  it("IPv6: bracket di host header & origin", () => {
    assert.equal(extractHost("[::1]:3030"), "[::1]:3030");
    assert.equal(extractHost("http://[::1]:3030/"), "[::1]:3030");
    assert.equal(extractHost("[2001:db8::1]"), "[2001:db8::1]");
  });

  it("input tak ter-parse → null (sampah, kosong, IPv6 tanpa bracket)", () => {
    assert.equal(extractHost("::::"), null);
    assert.equal(extractHost("  "), null);
    assert.equal(extractHost(null), null);
    assert.equal(extractHost(undefined), null);
    assert.equal(extractHost("http://"), null);
    assert.equal(extractHost("::1"), null); // tanpa bracket ambigu → ditolak
  });

  it("literal 'null' ter-parse sebagai host 'null' — tidak pernah sama host asli", () => {
    assert.equal(extractHost("null"), "null");
    assert.equal(isSameHost(parseHost("null")!, parseHost("eps.local:3030")!), false);
  });
});

describe("isSameHost — perbandingan port", () => {
  it("port eksplisit yang sama → sama", () => {
    assert.equal(isSameHost(parseHost("http://x:3030")!, parseHost("http://x:3030")!), true);
  });

  it("port berbeda → beda", () => {
    assert.equal(isSameHost(parseHost("http://x:3030")!, parseHost("http://x:3031")!), false);
  });

  it("default port skema di-resolve: http://x == x:80, https://x == x:443", () => {
    assert.equal(isSameHost(parseHost("http://x")!, parseHost("http://x:80")!), true);
    assert.equal(isSameHost(parseHost("https://x")!, parseHost("https://x:443")!), true);
  });

  it("Host tanpa port ambigu: origin https://x cocok dengan Host 'x' (proxy)", () => {
    assert.equal(isSameHost(parseHost("https://app.example.com")!, parseHost("app.example.com")!), true);
    assert.equal(isSameHost(parseHost("http://app.example.com")!, parseHost("app.example.com")!), true);
  });

  it("bukan default port tidak disembunyikan: http://x vs x:443 → beda", () => {
    assert.equal(isSameHost(parseHost("http://x")!, parseHost("http://x:443")!), false);
  });

  it("subdomain berbeda → beda (tanpa www-normalization)", () => {
    assert.equal(isSameHost(parseHost("https://www.example.com")!, parseHost("https://example.com")!), false);
    assert.equal(isSameHost(parseHost("https://api.example.com")!, parseHost("https://example.com")!), false);
  });
});

describe("isAllowedOrigin (keputusan CSRF proxy)", () => {
  const HOST = "eps.local:3030";

  it("Origin cocok dengan Host → izinkan", () => {
    assert.equal(isAllowedOrigin("http://eps.local:3030", "http://eps.local:3030/login", HOST), true);
  });

  it("Origin host lain → tolak", () => {
    assert.equal(isAllowedOrigin("https://evil.example.com", null, HOST), false);
  });

  it("Origin subdomain lain → tolak", () => {
    assert.equal(isAllowedOrigin("http://www.eps.local:3030", null, HOST), false);
  });

  it("port Origin beda dari Host → tolak", () => {
    assert.equal(isAllowedOrigin("http://eps.local:9999", null, HOST), false);
  });

  it("Origin litereal 'null' (sandbox/redirect) → tolak", () => {
    assert.equal(isAllowedOrigin("null", null, HOST), false);
  });

  it("Origin tak ada + Referer cocok → izinkan", () => {
    assert.equal(isAllowedOrigin(null, "http://eps.local:3030/login", HOST), true);
  });

  it("Origin tak ada + Referer host lain → tolak", () => {
    assert.equal(isAllowedOrigin(null, "https://evil.example.com/x", HOST), false);
  });

  it("Origin + Referer sama-sama ada → Origin menang", () => {
    assert.equal(
      isAllowedOrigin("http://eps.local:3030", "https://evil.example.com/ref-leak", HOST),
      true
    );
  });

  it("keduanya absen (curl / dev tools) → izinkan", () => {
    assert.equal(isAllowedOrigin(null, null, HOST), true);
    assert.equal(isAllowedOrigin("", "", HOST), true);
  });

  it("Host header tak ter-parse → tolak defensif", () => {
    assert.equal(isAllowedOrigin(null, null, "::::"), false);
    assert.equal(isAllowedOrigin("http://eps.local:3030", null, null), false);
  });

  it("Origin cocok dengan Host default-port → izinkan (tanpa :3030)", () => {
    assert.equal(isAllowedOrigin("http://eps.local", null, "eps.local:80"), true);
    assert.equal(isAllowedOrigin("https://eps.local", null, "eps.local:443"), true);
  });
});