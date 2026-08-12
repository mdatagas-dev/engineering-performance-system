import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@/app/generated/prisma/client";
import { BackupStatus, BackupType } from "@/app/generated/prisma/enums";
import { createPgDumpExecutor, runBackup } from "./backupService";

type RunRow = {
  id: string;
  status: BackupStatus;
  type: BackupType;
  sizeBytes: bigint | null;
  path: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  triggeredBy: string | null;
};

function makeFakeTx() {
  let seq = 0;
  const rows: RunRow[] = [];
  const tx = {
    backupRun: {
      create: async ({ data }: { data: Partial<RunRow> }) => {
        const row = {
          id: `run-${++seq}`,
          sizeBytes: null,
          path: null,
          error: null,
          finishedAt: null,
          ...data,
        } as RunRow;
        rows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<RunRow> }) => {
        const idx = rows.findIndex((r) => r.id === where.id);
        if (idx === -1) throw new Error(`row ${where.id} not found`);
        const row = { ...rows[idx], ...data };
        rows.push(row);
        return row;
      },
    },
  };
  return { tx: tx as unknown as Prisma.TransactionClient, rows };
}

const FIXED_NOW = new Date("2026-08-12T02:00:00.000Z");

describe("runBackup", () => {
  it("executor sukses → RUNNING lalu SUCCESS, size & path tercatat", async () => {
    const { tx, rows } = makeFakeTx();
    const calls: BackupType[] = [];
    const result = await runBackup({
      tx,
      type: BackupType.FULL,
      triggeredBy: "cron",
      deps: {
        now: () => FIXED_NOW,
        executor: async ({ type }) => {
          calls.push(type);
          return { sizeBytes: BigInt(1024), path: "/backups/dump.dump" };
        },
      },
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0].status, BackupStatus.RUNNING);
    assert.equal(rows[0].triggeredBy, "cron");
    assert.equal(rows[1].status, BackupStatus.SUCCESS);
    assert.equal(rows[1].sizeBytes, BigInt(1024));
    assert.equal(rows[1].path, "/backups/dump.dump");
    assert.deepEqual(rows[1].finishedAt, FIXED_NOW);
    assert.deepEqual(calls, [BackupType.FULL]);
    assert.equal(result.status, BackupStatus.SUCCESS);
  });

  it("executor gagal → FAILED dengan pesan error, size null", async () => {
    const { tx, rows } = makeFakeTx();
    const result = await runBackup({
      tx,
      type: BackupType.INCREMENTAL,
      deps: {
        now: () => FIXED_NOW,
        executor: async () => {
          throw new Error("pg_dump: connection refused");
        },
      },
    });

    assert.equal(rows[1].status, BackupStatus.FAILED);
    assert.equal(rows[1].error, "pg_dump: connection refused");
    assert.equal(rows[1].sizeBytes, null);
    assert.deepEqual(rows[1].finishedAt, FIXED_NOW);
    assert.equal(result.status, BackupStatus.FAILED);
  });

  it("startedAt tercatat pada row RUNNING", async () => {
    const { tx, rows } = makeFakeTx();
    await runBackup({
      tx,
      type: BackupType.FULL,
      deps: { now: () => FIXED_NOW, executor: async () => ({ sizeBytes: BigInt(1) }) },
    });
    assert.deepEqual(rows[0].startedAt, FIXED_NOW);
  });
});

describe("createPgDumpExecutor", () => {
  it("BACKUP_PG_DUMP_CMD tidak diset → lempar error", async () => {
    const saved = process.env.BACKUP_PG_DUMP_CMD;
    delete process.env.BACKUP_PG_DUMP_CMD;
    try {
      await assert.rejects(
        createPgDumpExecutor()({ type: BackupType.FULL }),
        /BACKUP_PG_DUMP_CMD tidak diset/
      );
    } finally {
      if (saved !== undefined) process.env.BACKUP_PG_DUMP_CMD = saved;
    }
  });
});
