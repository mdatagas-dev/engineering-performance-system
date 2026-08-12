import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MockUser } from "./session";
import { SESSION_TTL_MS, REMEMBER_TTL_MS, isSessionExpired, sessionExpiresAt, withExpiry, type MockSession } from "./session";

const user: MockUser = {
  id: "usr_test",
  email: "test@eps.local",
  name: "Test",
  role: { name: "VIEWER" },
  permissions: [],
  area: null,
};

describe("session expiry mock", () => {
  it("TTL konsisten dengan backend JWT: 8 jam default, 30 hari dengan rememberMe", () => {
    assert.equal(SESSION_TTL_MS, 8 * 60 * 60 * 1000);
    assert.equal(REMEMBER_TTL_MS, 30 * 24 * 60 * 60 * 1000);
  });

  it("sessionExpiresAt default = now + 8 jam", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    assert.equal(new Date(sessionExpiresAt(now, false)).getTime(), now.getTime() + SESSION_TTL_MS);
  });

  it("sessionExpiresAt dengan rememberMe = now + 30 hari", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    assert.equal(new Date(sessionExpiresAt(now, true)).getTime(), now.getTime() + REMEMBER_TTL_MS);
  });

  it("isSessionExpired: belum lewat batas → false", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    const s = withExpiry({ user, menu: [] }, false, now);
    assert.equal(isSessionExpired(s, new Date("2026-08-12T07:59:59Z")), false);
  });

  it("isSessionExpired: tepat di batas → true", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    const s = withExpiry({ user, menu: [] }, false, now);
    assert.equal(isSessionExpired(s, new Date(s.expiresAt)), true);
  });

  it("isSessionExpired: lewat batas → true", () => {
    const now = new Date("2026-08-12T00:00:00Z");
    const s = withExpiry({ user, menu: [] }, false, now);
    assert.equal(isSessionExpired(s, new Date("2026-08-12T08:00:01Z")), true);
  });

  it("isSessionExpired: sesi lama tanpa expiresAt → dianggap hidup", () => {
    const legacy = { user, menu: [] } as unknown as MockSession;
    assert.equal(isSessionExpired(legacy, new Date("2099-01-01T00:00:00Z")), false);
  });
});
