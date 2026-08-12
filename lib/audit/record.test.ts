// Test kontrak writeAudit + metaFromRequest + AUDIT_ACTIONS (task
// "buat-middleware-pencatatan-aktivitas-pengguna"). Murni node:test, klien
// audit palsu (tanpa DB).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES, metaFromRequest, writeAudit, type AuditLogClient } from "./record";
import { Prisma } from "@/app/generated/prisma/client";

type FakeClient = AuditLogClient & { calls: unknown[] };

function fakeClient(): FakeClient {
  const client = {
    auditLog: {
      create: (args: unknown) => {
        client.calls.push(args);
        return Promise.resolve({ id: "aud-1" });
      },
    },
    calls: [] as unknown[],
  };
  return client;
}

const meta = {
  ip: "203.0.113.7",
  userAgent: "test-agent/1.0",
};

describe("writeAudit", () => {
  it("data lengkap diteruskan apa adanya", async () => {
    const client = fakeClient();
    await writeAudit({
      client,
      userId: "user-1",
      action: AUDIT_ACTIONS.RECORD_CREATED,
      entityType: AUDIT_ENTITY_TYPES.PRODUCTION_RECORD,
      entityId: "rec-1",
      before: { status: "DRAFT" },
      after: { status: "SUBMITTED" },
      ...meta,
    });
    assert.deepEqual(client.calls, [
      {
        data: {
          userId: "user-1",
          action: "RECORD_CREATED",
          entityType: "PRODUCTION_RECORD",
          entityId: "rec-1",
          before: { status: "DRAFT" },
          after: { status: "SUBMITTED" },
          ip: "203.0.113.7",
          userAgent: "test-agent/1.0",
        },
      },
    ]);
  });

  it("nilai opsional undefined dinormalisasi jadi null (bukan kolom tak disentuh)", async () => {
    const client = fakeClient();
    await writeAudit({
      client,
      action: AUDIT_ACTIONS.LOGIN_FAILED, // aksi anonim: userId tidak dikenal
      entityType: AUDIT_ENTITY_TYPES.USER,
    });
    assert.deepEqual(client.calls[0], {
      data: {
        userId: null,
        action: "LOGIN_FAILED",
        entityType: "USER",
        entityId: null,
        before: Prisma.JsonNull,
        after: Prisma.JsonNull,
        ip: null,
        userAgent: null,
      },
    });
  });

  it("before null eksplisit dinormalisasi jadi Prisma.JsonNull (SQL NULL)", async () => {
    const client = fakeClient();
    await writeAudit({
      client,
      userId: "user-1",
      action: AUDIT_ACTIONS.LOGOUT,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: "user-1",
      before: null,
      after: null,
    });
    const data = (client.calls[0] as { data: { before: unknown; after: unknown } }).data;
    assert.equal(data.before, Prisma.JsonNull);
    assert.equal(data.after, Prisma.JsonNull);
  });

  it("action literal dijamin dari kontrak (typo = error tipe)", async () => {
    const client = fakeClient();
    await writeAudit({
      client,
      userId: "u",
      action: AUDIT_ACTIONS.KPI_UPDATED,
      entityType: AUDIT_ENTITY_TYPES.KPI,
      entityId: "kpi-1",
      before: { decimals: 2 },
      after: { decimals: 3 },
    });
    assert.equal((client.calls[0] as { data: { action: string } }).data.action, "KPI_UPDATED");
  });
});

describe("AUDIT_ACTIONS kontrak", () => {
  it("mencakup aksi login kontrak mock frontend (lib/mocks/audit.ts)", () => {
    for (const a of ["LOGIN_SUCCESS", "LOGIN_FAILED", "ACCOUNT_LOCKED", "UNLOCKED", "USER_ROLE_CHANGED", "BACKUP_RESTORED"]) {
      assert.ok(Object.values(AUDIT_ACTIONS).includes(a as never), `${a} harus ada di AUDIT_ACTIONS`);
    }
  });

  it("mencakup semua aksi yang saat ini ditulis backend (grep prisma.auditLog.create)", () => {
    const backendActions = [
      "LOGIN_SUCCESS",
      "LOGIN_FAILED",
      "ACCOUNT_LOCKED",
      "LOGOUT",
      "LOGOUT_ALL",
      "USER_ROLE_CHANGED",
      "RECORD_CREATED",
      "RECORD_UPDATED",
      "RECORD_DELETED",
      "RECORD_STATUS_CHANGED",
      "RECORD_CORRECTED",
      "KPI_CREATED",
      "KPI_UPDATED",
      "KPI_DELETED",
      "IMPORT_COMPLETED",
      "IMPORT_ROLLED_BACK",
      "EXPORTED",
      "BACKUP_RESTORED",
    ];
    for (const a of backendActions) {
      assert.ok(Object.values(AUDIT_ACTIONS).includes(a as never), `${a} harus ada di AUDIT_ACTIONS`);
    }
  });

  it("tidak ada nilai duplikat (set action benar-benar unik)", () => {
    const values = Object.values(AUDIT_ACTIONS);
    assert.equal(new Set(values).size, values.length);
  });
});

describe("metaFromRequest", () => {
  it("x-forwarded-for berantai diambil hop paling awal", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.5" },
    });
    assert.equal(metaFromRequest(req).ip, "198.51.100.1");
  });

  it("tanpa x-forwarded-for fallback ke x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "192.0.2.9" } });
    assert.equal(metaFromRequest(req).ip, "192.0.2.9");
  });

  it("userAgent dibaca apa adanya; tanpa IP hasilnya null", () => {
    const req = new Request("http://x", { headers: { "user-agent": "curl/8" } });
    assert.deepEqual(metaFromRequest(req), { ip: null, userAgent: "curl/8" });
  });
});