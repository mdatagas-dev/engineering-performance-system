import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@/app/generated/prisma/client";
import { BackupStatus, BackupType } from "@/app/generated/prisma/enums";
import { createPgRestoreExecutor, restoreBackup } from "./restoreService";

type BackupRow = {
  id: string;
  status: BackupStatus;
  type: BackupType;
  sizeBytes: bigint | null;
  path: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  triggeredBy: string | null;
  createdAt: Date;
};

function makeBackup(overrides: Partial<BackupRow> = {}): BackupRow {
  return {
    id: "backup-1",
    status: BackupStatus.SUCCESS,
    type: BackupType.FULL,
    sizeBytes: BigInt(1024),
    path: "/backups/dump.dump",
    startedAt: new Date("2026-08-12T01:00:00.000Z"),
    finishedAt: new Date("2026-08-12T01:00:05.000Z"),
    error: null,
    triggeredBy: "manual:user-1",
    createdAt: new Date("2026-08-12T01:00:00.000Z"),
    ...overrides,
  };
}

type AuditData = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
};

function makeFakeTx(backup: BackupRow | null) {
  const auditLogs: AuditData[] = [];
  const tx = {
    backupRun: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        backup && where.id === backup.id ? backup : null,
    },
    auditLog: {
      create: async ({ data }: { data: AuditData }) => {
        auditLogs.push(data);
        return { id: `audit-${auditLogs.length}`, ...data };
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, auditLogs };
}

const ACTOR = { userId: "user-1", ip: "127.0.0.1", userAgent: "node:test" };
const FIXED_NOW = new Date("2026-08-12T02:00:00.000Z");

describe("restoreBackup", () => {
  it("backup tidak ada → NOT_FOUND, executor & audit tidak dipanggil", async () => {
    const { tx, auditLogs } = makeFakeTx(null);
    let executorCalled = false;
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: true,
      actor: ACTOR,
      deps: { now: () => FIXED_NOW, executor: async () => void (executorCalled = true) },
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "NOT_FOUND");
    assert.equal(executorCalled, false);
    assert.equal(auditLogs.length, 0);
  });

  it("status bukan SUCCESS → NOT_SUCCESS, tanpa eksekusi", async () => {
    const { tx, auditLogs } = makeFakeTx(makeBackup({ status: BackupStatus.FAILED }));
    let executorCalled = false;
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: true,
      actor: ACTOR,
      deps: { now: () => FIXED_NOW, executor: async () => void (executorCalled = true) },
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "NOT_SUCCESS");
    assert.equal(executorCalled, false);
    assert.equal(auditLogs.length, 0);
  });

  it("tanpa confirm → NO_CONFIRM, tanpa eksekusi", async () => {
    const { tx, auditLogs } = makeFakeTx(makeBackup());
    let executorCalled = false;
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: false,
      actor: ACTOR,
      deps: { now: () => FIXED_NOW, executor: async () => void (executorCalled = true) },
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "NO_CONFIRM");
    assert.equal(executorCalled, false);
    assert.equal(auditLogs.length, 0);
  });

  it("SUCCESS tanpa path → NO_PATH", async () => {
    const { tx } = makeFakeTx(makeBackup({ path: null }));
    let executorCalled = false;
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: true,
      actor: ACTOR,
      deps: { now: () => FIXED_NOW, executor: async () => void (executorCalled = true) },
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "NO_PATH");
    assert.equal(executorCalled, false);
  });

  it("sukses → executor dipanggil dengan path & AuditLog BACKUP_RESTORED tercatat", async () => {
    const backup = makeBackup();
    const { tx, auditLogs } = makeFakeTx(backup);
    let calledPath: string | null = null;
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: true,
      actor: ACTOR,
      deps: {
        now: () => FIXED_NOW,
        executor: async ({ path }) => void (calledPath = path),
      },
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(calledPath, "/backups/dump.dump");
    assert.equal(auditLogs.length, 1);

    const log = auditLogs[0];
    assert.equal(log.action, "BACKUP_RESTORED");
    assert.equal(log.entityType, "BACKUP");
    assert.equal(log.entityId, "backup-1");
    assert.equal(log.userId, "user-1");
    assert.equal(log.ip, "127.0.0.1");
    assert.equal(log.userAgent, "node:test");
    assert.equal(log.before?.path, "/backups/dump.dump");
    assert.equal(log.after?.path, "/backups/dump.dump");
    assert.equal(log.after?.restoredAt, FIXED_NOW.toISOString());
  });

  it("executor gagal → EXECUTION_FAILED dengan pesan error, audit tidak tercatat", async () => {
    const { tx, auditLogs } = makeFakeTx(makeBackup());
    const result = await restoreBackup({
      tx,
      id: "backup-1",
      confirm: true,
      actor: ACTOR,
      deps: {
        now: () => FIXED_NOW,
        executor: async () => {
          throw new Error("pg_restore: connection refused");
        },
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.ok ? "" : result.code, "EXECUTION_FAILED");
    assert.equal(result.ok ? "" : result.message, "pg_restore: connection refused");
    assert.equal(auditLogs.length, 0);
  });
});

describe("createPgRestoreExecutor", () => {
  it("BACKUP_PG_RESTORE_CMD tidak diset → lempar error", async () => {
    const saved = process.env.BACKUP_PG_RESTORE_CMD;
    delete process.env.BACKUP_PG_RESTORE_CMD;
    try {
      await assert.rejects(
        createPgRestoreExecutor()({ path: "/backups/dump.dump" }),
        /BACKUP_PG_RESTORE_CMD tidak diset/
      );
    } finally {
      if (saved !== undefined) process.env.BACKUP_PG_RESTORE_CMD = saved;
    }
  });

  it("env diset → eksekusi berhasil dengan path sebagai argumen", async () => {
    const saved = process.env.BACKUP_PG_RESTORE_CMD;
    process.env.BACKUP_PG_RESTORE_CMD = "echo";
    try {
      await createPgRestoreExecutor()({ path: "/backups/dump.dump" });
    } finally {
      if (saved !== undefined) process.env.BACKUP_PG_RESTORE_CMD = saved;
      else delete process.env.BACKUP_PG_RESTORE_CMD;
    }
  });
});
