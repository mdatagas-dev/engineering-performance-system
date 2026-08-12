import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hash, verify } from "@node-rs/argon2";
import { loginUser, type AuthUser, type LoginDeps } from "./login";
import { AUTH_CONFIG } from "./config";

const PASSWORD = "Staff123!";
const NOW = new Date("2026-01-01T00:00:00Z");
const EMAIL = "staff@eps.local";

// Verifikasi TASK 1 (implementasi-hashing-argon2id): login.ts memakai
// verifyArgon2 (@node-rs/argon2) sebagai fallback deps.verifyPassword, seed
// memakai hash() dengan default library. Test di bawah mengunci format
// konkret yang dihasilkan + perilaku verify.
describe("argon2id (@node-rs/argon2 default — dipakai seed & login)", () => {
  it("hash default menghasilkan PHC Argon2id v19, parameter m=19456 t=2 p=1 (OWASP)", async () => {
    const phc = await hash(PASSWORD);
    // $argon2id$v=19$m=19456,t=2,p=1$<salt 16B b64 tanpa padding=22>$<digest 32B=43>
    assert.match(phc, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/);
  });

  it("PHC parse: algoritma, version, salt & digest terpisah", async () => {
    const phc = await hash(PASSWORD);
    const parts = phc.slice(1).split("$");
    assert.equal(parts.length, 5, "PHC = algo$v=..$params$salt$digest");
    assert.equal(parts[0], "argon2id");
    assert.equal(parts[1], "v=19");
    const params = Object.fromEntries(parts[2].split(",").map((kv) => kv.split("=")));
    assert.ok(Number(params.m) >= 19 * 1024, "memoryCost >= 19 MiB");
    assert.ok(Number(params.t) >= 2, "timeCost >= 2");
    assert.equal(Buffer.from(parts[3], "base64").length, 16, "salt 16 byte");
    assert.equal(Buffer.from(parts[4], "base64").length, 32, "digest 32 byte");
  });

  it("verify: password benar → true; salah/kosong → false", async () => {
    const phc = await hash(PASSWORD);
    assert.equal(await verify(phc, PASSWORD), true);
    assert.equal(await verify(phc, "Password123!"), false);
    assert.equal(await verify(phc, ""), false);
  });

  it("verify: hash password lain tidak mem-verify; phc korup → THROW (login menangkapnya)", async () => {
    const a = await hash(PASSWORD);
    const b = await hash(PASSWORD + "x");
    assert.equal(await verify(a, PASSWORD + "x"), false);
    assert.equal(await verify(b, PASSWORD), false);
    // verifyArgon2 melempar utk string non-PHC; login.ts membungkus dengan
    // try/catch → passwordOk=false → 401 (diuji di blok loginUser di bawah).
    await assert.rejects(() => verify("bukan-phc", PASSWORD), /Invalid hashed password/);
  });

  it("hash ber-salt acak: dua hash password sama ≠ sama", async () => {
    const [a, b] = await Promise.all([hash(PASSWORD), hash(PASSWORD)]);
    assert.notEqual(a, b);
    assert.equal(await verify(a, PASSWORD), true);
    assert.equal(await verify(b, PASSWORD), true);
  });
});

// TASK 2 (endpoint login dengan verifikasi argon2id): route /api/auth/login
// terikat DB (prisma, read-only utk saya) — pola test: lapisan pure
// (loginUser) diuji dengan deps; di sini terutama jalur fallback NYATA ke
// @node-rs/argon2 (deps.verifyPassword kosong) + cap backoff lockout.
function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u1",
    email: EMAIL,
    name: "Staff",
    isActive: true,
    passwordHash: "argon2-hash",
    failedLoginAttempts: 0,
    lockedUntil: null,
    lockoutCount: 0,
    userRoles: [{ role: { name: "ENGINEERING_STAFF", permissions: [{ permission: { key: "dashboard.view" } }] } }],
    ...overrides,
  };
}

function makeDeps(user: AuthUser | null) {
  const updates: { id: string; data: Parameters<LoginDeps["updateUser"]>[1] }[] = [];
  const deps: LoginDeps = {
    getUserByEmail: async () => user,
    updateUser: async (id, data) => {
      updates.push({ id, data });
    },
    now: () => NOW,
    // TANPA verifyPassword → login.ts fallback ke verify Argon2id nyata
  };
  return { deps, updates };
}

describe("loginUser × Argon2id nyata (tanpa DB)", () => {
  it("password benar → login sukses via verifyArgon2", async () => {
    const phc = await hash(PASSWORD);
    const { deps } = makeDeps(makeUser({ passwordHash: phc }));
    const result = await loginUser({ email: EMAIL, password: PASSWORD }, deps);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.user.role.name, "ENGINEERING_STAFF");
  });

  it("password salah → 401 (bukan throw)", async () => {
    const phc = await hash(PASSWORD);
    const { deps } = makeDeps(makeUser({ passwordHash: phc }));
    const result = await loginUser({ email: EMAIL, password: "salah" }, deps);
    assert.equal(result.ok, false);
  });

  it("phc tak valid di DB → gagal 401, bukan crash", async () => {
    const { deps } = makeDeps(makeUser({ passwordHash: "bukan-phc" }));
    const result = await loginUser({ email: EMAIL, password: PASSWORD }, deps);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });

  it("backoff lockout ter-cap di lockoutMaxMs (8 jam) saat lockoutCount besar", async () => {
    const { deps, updates } = makeDeps(
      makeUser({
        passwordHash: "x",
        failedLoginAttempts: AUTH_CONFIG.maxFailedAttempts - 1,
        lockoutCount: 20,
      })
    );
    const result = await loginUser({ email: EMAIL, password: "salah" }, deps);
    assert.equal(result.ok, false);
    const update = updates[0].data;
    assert.equal(
      update.lockedUntil?.getTime(),
      NOW.getTime() + AUTH_CONFIG.lockoutMaxMs,
      "backoff eksponensial tidak boleh melebihi cap 8 jam"
    );
  });

  it("lockout kedua (count=1) naik eksponensial menjadi 30 menit", async () => {
    const { deps, updates } = makeDeps(
      makeUser({
        passwordHash: "x",
        failedLoginAttempts: AUTH_CONFIG.maxFailedAttempts - 1,
        lockoutCount: 1,
      })
    );
    await loginUser({ email: EMAIL, password: "salah" }, deps);
    assert.equal(
      updates[0].data.lockedUntil?.getTime(),
      NOW.getTime() + AUTH_CONFIG.lockoutBaseMs * 2
    );
  });
});