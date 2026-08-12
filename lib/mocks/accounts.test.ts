import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { DEFAULT_SECURITY_CONFIG } from "@/lib/security/config";
import {
  processMockLogin,
  mockAccounts,
  mockLoginAccounts,
  MOCK_LOGIN_ERROR,
  MOCK_LOCKED_MESSAGE,
  type MockLock,
  type MockLoginAccount,
} from "./accounts";
import { seedMockUsers } from "./users";
import { RoleName } from "@/app/generated/prisma/enums";

const staff = mockAccounts.find((a) => a.email === "staff@eps.local")!;
const now = new Date("2026-08-12T07:45:00+07:00");

function attempt(email: string, password: string, lock: MockLock | null = null, at = now) {
  return processMockLogin(email, password, lock, at);
}

describe("mock lockout (meniru backend lib/auth/login.ts)", () => {
  it("email tak terdaftar → invalid, tanpa membuat state lock", () => {
    const { result, lock } = attempt("nobody@eps.local", "Salah123!", null);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid");
    assert.equal(lock.attempts, 0);
    assert.equal(lock.lockoutCount, 0);
  });

  it("password salah → invalid, hitungan naik tiap gagal", () => {
    let state: Awaited<ReturnType<typeof processMockLogin>>["lock"] | null = null;
    for (let i = 1; i < AUTH_CONFIG.maxFailedAttempts; i++) {
      const { result, lock } = attempt(staff.email, "Salah123!", state, now);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.reason, "invalid");
      assert.equal(lock.attempts, i);
      state = lock;
    }
  });

  it("gagal ke-N (maxFailedAttempts) → locked dengan backoff pertama 15 menit", () => {
    let state = null;
    for (let i = 1; i < AUTH_CONFIG.maxFailedAttempts; i++) {
      ({ lock: state } = attempt(staff.email, "Salah123!", state, now));
    }
    const { result, lock } = attempt(staff.email, "Salah123!", state, now);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "locked");
    assert.equal(new Date(lock.lockedUntil!).getTime(), now.getTime() + AUTH_CONFIG.lockoutBaseMs);
    assert.equal(lock.lockoutCount, 1);
  });

  it("akun terkunci → locked walau password benar, state tidak berubah", () => {
    const locked = {
      attempts: 0,
      lockoutCount: 1,
      lockedUntil: new Date(now.getTime() + AUTH_CONFIG.lockoutBaseMs).toISOString(),
    };
    const { result, lock } = attempt(staff.email, staff.password, locked, now);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "locked");
    assert.deepEqual(lock, locked);
  });

  it("lock habis → password benar berhasil, attempts direset", () => {
    const expired = {
      attempts: 0,
      lockoutCount: 1,
      lockedUntil: new Date(now.getTime() - 1000).toISOString(),
    };
    const { result, lock } = attempt(staff.email, staff.password, expired, now);
    assert.equal(result.ok, true);
    assert.equal(lock.attempts, 0);
  });

  it("lockout kedua lebih lama: exponential 2x backoff", () => {
    let state: Awaited<ReturnType<typeof processMockLogin>>["lock"] | null = {
      attempts: 0,
      lockoutCount: 1,
      lockedUntil: null,
    };
    for (let i = 0; i < AUTH_CONFIG.maxFailedAttempts; i++) {
      ({ lock: state } = attempt(staff.email, "Salah123!", state, now));
    }
    const { lock } = attempt(staff.email, "Salah123!", state, now);
    assert.equal(lock.lockoutCount, 2);
    assert.equal(
      new Date(lock.lockedUntil!).getTime(),
      now.getTime() + AUTH_CONFIG.lockoutBaseMs * 2
    );
  });

  it("config kustom (mock pengaturan keamanan) mengubah ambang & durasi lock", () => {
    const custom = { ...DEFAULT_SECURITY_CONFIG, maxFailedAttempts: 2, lockoutBaseMinutes: 10, lockoutMaxMinutes: 120 };
    const first = processMockLogin(staff.email, "Salah123!", null, now, false, custom);
    assert.equal(first.result.ok, false);
    const second = processMockLogin(staff.email, "Salah123!", first.lock, now, false, custom);
    assert.equal(second.result.ok, false);
    if (!second.result.ok) assert.equal(second.result.reason, "locked");
    assert.equal(new Date(second.lock.lockedUntil!).getTime(), now.getTime() + 10 * 60_000);
  });

  it("pesan error mock seragam dengan backend (tidak bocor)", () => {
    const { result } = attempt("nobody@eps.local", "apa saja", null, now);
    assert.equal(result.ok, false);
    const locked = {
      attempts: 0,
      lockoutCount: 1,
      lockedUntil: new Date(now.getTime() + 1000).toISOString(),
    };
    const { result: lockedResult } = attempt(staff.email, "apa saja", locked, now);
    assert.equal(lockedResult.ok, false);
    if (!result.ok && !lockedResult.ok) {
      assert.equal(MOCK_LOGIN_ERROR, "Email atau password salah.");
      assert.equal(MOCK_LOCKED_MESSAGE, "Terlalu banyak percobaan login. Akun dikunci sementara.");
      assert.equal(result.reason === "invalid", lockedResult.reason !== "invalid");
    }
  });
});

describe("mock login user override (dibuat via /users, eps_mock_users)", () => {
  // User buatan: tersimpan sebagai hash argon2-mock:<pw>, bukan plaintext.
  const created: MockLoginAccount = {
    id: "usr_test_created",
    email: "created@eps.local",
    name: "User Baru",
    role: "ADMIN",
    isActive: true,
    area: null,
    passwordHash: "argon2-mock:Rahasia123!",
  };

  it("user override bisa login: hash cocok, sesi menu dihitung dari role", () => {
    const { result, lock } = processMockLogin("created@eps.local", "Rahasia123!", null, now, false, undefined, [created]);
    assert.equal(result.ok, true);
    assert.equal(lock.attempts, 0);
    if (result.ok) {
      assert.equal(result.session.user.id, "usr_test_created");
      assert.equal(result.session.user.email, "created@eps.local");
      assert.equal(result.session.user.role.name, "ADMIN");
      const settings = result.session.menu.find((m) => m.key === "settings");
      assert.ok(settings && settings.href === "/settings", "menu memuat Pengaturan (flat, href /settings)");
    }
  });

  it("password salah pada user override → invalid, hitungan naik (mirror backend)", () => {
    const { result, lock } = processMockLogin("created@eps.local", "SalahBanget!", null, now, false, undefined, [created]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid");
    assert.equal(lock.attempts, 1);
  });

  it("user override nonaktif (isActive=false) → ditolak inactive (403-style)", () => {
    const inactive: MockLoginAccount = { ...created, isActive: false };
    const { result } = processMockLogin("created@eps.local", "Rahasia123!", null, now, false, undefined, [inactive]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "inactive");
  });

  it("passwordHash override menang atas password seed untuk email yang sama", () => {
    const patched: MockLoginAccount = {
      id: "usr_staff",
      email: staff.email,
      name: "Engineering Staff",
      role: "ENGINEERING_STAFF",
      isActive: true,
      area: null,
      password: staff.password,
      passwordHash: "argon2-mock:Ganti123!",
    };
    const seedOld = processMockLogin(staff.email, staff.password, null, now, false, undefined, [patched]);
    assert.equal(seedOld.result.ok, false);
    const hashOk = processMockLogin(staff.email, "Ganti123!", null, now, false, undefined, [patched]);
    assert.equal(hashOk.result.ok, true);
  });

  it("email tak dikenal (bukan seed, bukan override) → invalid", () => {
    const { result } = processMockLogin("ghost@eps.local", "apa saja", null, now, false, undefined, [created]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "invalid");
  });
});

describe("mockLoginAccounts (gabungan seed + override eps_mock_users)", () => {
  it("user buatan (patch created + passwordHash) muncul sebagai akun login", () => {
    const patch = {
      id: "usr_baru",
      passwordHash: "argon2-mock:PassBaru123!",
      created: {
        id: "usr_baru",
        email: "baru@eps.local",
        name: "User Baru",
        role: { name: RoleName.VIEWER },
        area: null,
        isActive: true,
        createdAt: "2026-08-12T00:00:00.000Z",
        updatedAt: "2026-08-12T00:00:00.000Z",
      },
    };
    const accounts = mockLoginAccounts([patch]);
    const found = accounts.find((a) => a.email === "baru@eps.local");
    assert.ok(found);
    assert.equal(found?.passwordHash, "argon2-mock:PassBaru123!");
    assert.equal(found?.role, "VIEWER");
    assert.equal(found?.isActive, true);

    const login = processMockLogin("baru@eps.local", "PassBaru123!", null, now, false, undefined, accounts);
    assert.equal(login.result.ok, true);
  });

  it("override isActive=false pada seed → akun seed ditolak inactive", () => {
    const patch = { id: "usr_staff", isActive: false, updatedAt: "2026-08-12T00:00:00.000Z" };
    const accounts = mockLoginAccounts([patch]);
    const found = accounts.find((a) => a.email === staff.email);
    assert.equal(found?.isActive, false);
    const login = processMockLogin(staff.email, staff.password, null, now, false, undefined, accounts);
    assert.equal(login.result.ok, false);
    if (!login.result.ok) assert.equal(login.result.reason, "inactive");
  });

  it("tanpa patch: daftar = seed users; hanya 5 akun demo punya password", () => {
    const accounts = mockLoginAccounts([]);
    assert.equal(accounts.length, seedMockUsers().length);
    assert.equal(accounts.filter((a) => a.password).length, mockAccounts.length);
    const demo = accounts.find((a) => a.email === staff.email);
    assert.equal(demo?.password, staff.password);
    assert.equal(demo?.isActive, true);
    const nonDemo = accounts.find((a) => a.email === "andi.wijaya@eps.local");
    assert.equal(nonDemo?.isActive, false);
    assert.equal(nonDemo?.password, undefined);
  });
});
