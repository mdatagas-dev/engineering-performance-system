import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTH_CONFIG } from "./config";
import { hashToken } from "./sessions";
import { logoutAll, logoutCookieOptions, logoutCurrent } from "./logout";

describe("logout", () => {
  it("logoutCurrent tanpa token: idempotent, deps tidak dipanggil", async () => {
    let called = false;
    const deps = {
      revokeByTokenHash: async () => {
        called = true;
      },
    };
    await logoutCurrent(deps, null);
    await logoutCurrent(deps, undefined);
    await logoutCurrent(deps, "");
    assert.equal(called, false);
  });

  it("logoutCurrent merevoke via sha256 tokenHash (token mentah tak ke DB)", async () => {
    const token = "abc.def.ghi";
    const revoked: string[] = [];
    const deps = {
      revokeByTokenHash: async (hash: string) => {
        revoked.push(hash);
      },
    };
    await logoutCurrent(deps, token);
    assert.deepEqual(revoked, [hashToken(token)]);
    assert.notEqual(revoked[0], token);
  });

  it("logoutAll meneruskan userId", async () => {
    const revoked: string[] = [];
    const deps = {
      revokeAllByUserId: async (id: string) => {
        revoked.push(id);
      },
    };
    await logoutAll(deps, "u1");
    assert.deepEqual(revoked, ["u1"]);
  });

  it("logoutCurrent tidak error saat baris sesi sudah tak ada (deps kembalikan 0)", async () => {
    const deps = {
      revokeByTokenHash: async () => 0,
    };
    await logoutCurrent(deps, "abc.def.ghi");
    // idempotent: tidak throw, handler route tetap 200
  });

  it("logoutCookieOptions: flags konsisten dengan login, TTL 0 + expires epoch", () => {
    const o = logoutCookieOptions();
    assert.equal(o.maxAge, 0);
    assert.equal(o.expires.getTime(), 0);
    assert.equal(o.httpOnly, true);
    assert.equal(o.sameSite, "lax");
    assert.equal(o.secure, AUTH_CONFIG.cookieSecure);
    assert.equal(o.path, "/");
  });
});
