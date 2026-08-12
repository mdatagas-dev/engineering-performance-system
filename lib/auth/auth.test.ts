import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loginUser, type AuthUser, type LoginDeps } from "./login";
import { signToken, verifyToken } from "./jwt";

const SECRET = "test-secret";
const NOW = new Date("2026-01-01T00:00:00Z");

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u1",
    email: "staff@eps.local",
    name: "Staff",
    isActive: true,
    passwordHash: "argon2-hash",
    failedLoginAttempts: 0,
    lockedUntil: null,
    lockoutCount: 0,
    userRoles: [
      {
        role: {
          name: "ENGINEERING_STAFF",
          permissions: [
            { permission: { key: "record.create" } },
            { permission: { key: "dashboard.view" } },
          ],
        },
      },
      {
        role: {
          name: "VIEWER",
          permissions: [
            { permission: { key: "dashboard.view" } },
            { permission: { key: "export.run" } },
          ],
        },
      },
    ],
    ...overrides,
  };
}

function makeDeps(opts: { user?: AuthUser | null; verifyOk?: boolean } = {}) {
  const updates: { id: string; data: Parameters<LoginDeps["updateUser"]>[1] }[] = [];
  const deps: LoginDeps = {
    getUserByEmail: async () => (opts.user === undefined ? makeUser() : opts.user),
    updateUser: async (id, data) => {
      updates.push({ id, data });
    },
    now: () => NOW,
    verifyPassword: async () => opts.verifyOk !== false,
  };
  return { deps, updates };
}

describe("loginUser", () => {
  it("login sukses: role + permissions (dedupe lintas role)", async () => {
    const { deps, updates } = makeDeps();
    const result = await loginUser({ email: "staff@eps.local", password: "pw" }, deps);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.user.role, { name: "ENGINEERING_STAFF" });
    assert.deepEqual(result.user.permissions, ["record.create", "dashboard.view", "export.run"]);
    assert.equal(updates.at(-1)?.data.failedLoginAttempts, 0);
    assert.equal(updates.at(-1)?.data.lastLoginAt, NOW);
    assert.equal(result.lastLoginAt, NOW);
  });

  it("password salah -> 401, failedLoginAttempts naik, pesan seragam", async () => {
    const { deps, updates } = makeDeps({ verifyOk: false });
    const result = await loginUser({ email: "staff@eps.local", password: "wrong" }, deps);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
    assert.equal(updates[0].data.failedLoginAttempts, 1);
    assert.equal(result.userId, "u1");
    assert.equal(result.auditAction, "LOGIN_FAILED");
  });

  it("email tak ada -> 401, pesan SAMA dengan password salah (tidak bocor)", async () => {
    const { deps } = makeDeps({ user: null });
    const wrongPass = await loginUser({ email: "x@eps.local", password: "wrong" }, makeDeps({ verifyOk: false }).deps);
    const noUser = await loginUser({ email: "x@eps.local", password: "whatever" }, deps);

    assert.equal(wrongPass.ok, false);
    assert.equal(noUser.ok, false);
    if (wrongPass.ok || noUser.ok) return;
    assert.equal(wrongPass.message, noUser.message);
    assert.equal(noUser.userId, null);
    assert.equal(noUser.auditAction, "LOGIN_FAILED");
  });

  it("percobaan ke-5 gagal -> lockout, lockoutCount naik", async () => {
    const { deps, updates } = makeDeps({
      user: makeUser({ failedLoginAttempts: 4 }),
      verifyOk: false,
    });
    const result = await loginUser({ email: "staff@eps.local", password: "wrong" }, deps);

    const update = updates[0].data;
    assert.equal(update.lockoutCount, 1);
    assert.equal(update.failedLoginAttempts, 0);
    assert.equal(update.lockedUntil?.toISOString(), new Date(NOW.getTime() + 15 * 60 * 1000).toISOString());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.auditAction, "ACCOUNT_LOCKED");
  });

  it("akun terkunci -> 403", async () => {
    const { deps } = makeDeps({
      user: makeUser({ lockedUntil: new Date(NOW.getTime() + 60_000) }),
    });
    const result = await loginUser({ email: "staff@eps.local", password: "pw" }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
    assert.equal(result.auditAction, "LOGIN_FAILED");
  });

  it("akun tidak aktif -> 403", async () => {
    const { deps } = makeDeps({ user: makeUser({ isActive: false }) });
    const result = await loginUser({ email: "staff@eps.local", password: "pw" }, deps);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });
});

describe("jwt", () => {
  it("sign -> verify roundtrip membawa role & permissions", () => {
    const token = signToken({ sub: "u1", role: "ADMIN", permissions: ["dashboard.view"] }, SECRET, 3600);
    const payload = verifyToken(token, SECRET);
    assert.ok(payload);
    assert.equal(payload?.sub, "u1");
    assert.equal(payload?.role, "ADMIN");
    assert.deepEqual(payload?.permissions, ["dashboard.view"]);
    assert.equal(payload!.exp, payload!.iat + 3600);
  });

  it("token kedaluwarsa -> null", () => {
    const token = signToken({ sub: "u1", role: "ADMIN", permissions: [] }, SECRET, -10);
    assert.equal(verifyToken(token, SECRET), null);
  });

  it("token dimanipulasi -> null", () => {
    const token = signToken({ sub: "u1", role: "ADMIN", permissions: [] }, SECRET, 3600);
    const tampered = token.slice(0, -4) + "AAAA";
    assert.equal(verifyToken(tampered, SECRET), null);
  });
});
