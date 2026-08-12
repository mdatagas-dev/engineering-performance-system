// Service backup — "Monitoring & Backup" (PRD Fase 5: strategi backup
// berkala/recovery). Lifecycle: BackupRun RUNNING → SUCCESS/FAILED, lengkap
// dengan startedAt/finishedAt, sizeBytes, path, error. Eksekusi "backup"
// diserahkan ke executor yang di-inject (testable): produksi memakai
// createPgDumpExecutor() (pg_dump via BACKUP_PG_DUMP_CMD), test pakai fake.
// Catatan jujur: tanpa infra backup sungguhan, executor default hanya berjalan
// kalau BACKUP_PG_DUMP_CMD diset; kalau tidak, run dicatat FAILED dengan alasan.
// Pemanggil (script/route) menentukan scope transaksi — create + update berada
// dalam tx yang sama agar ledger selalu konsisten.

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Prisma } from "@/app/generated/prisma/client";
import { BackupStatus, BackupType } from "@/app/generated/prisma/enums";
import type { BackupRunModel } from "@/app/generated/prisma/models/BackupRun";

const execAsync = promisify(exec);

export type BackupResult = {
  sizeBytes: bigint;
  path?: string;
};

export type BackupExecutor = (params: { type: BackupType }) => Promise<BackupResult>;

export type BackupDeps = {
  executor: BackupExecutor;
  now?: () => Date;
};

export type RunBackupParams = {
  tx: Prisma.TransactionClient;
  type: BackupType;
  deps: BackupDeps;
  triggeredBy?: string;
};

export async function runBackup({
  tx,
  type,
  deps,
  triggeredBy,
}: RunBackupParams): Promise<BackupRunModel> {
  const now = deps.now ?? (() => new Date());
  const run = await tx.backupRun.create({
    data: {
      status: BackupStatus.RUNNING,
      type,
      startedAt: now(),
      triggeredBy: triggeredBy ?? null,
    },
  });

  try {
    const result = await deps.executor({ type });
    return await tx.backupRun.update({
      where: { id: run.id },
      data: {
        status: BackupStatus.SUCCESS,
        sizeBytes: result.sizeBytes,
        path: result.path ?? null,
        finishedAt: now(),
      },
    });
  } catch (e) {
    return await tx.backupRun.update({
      where: { id: run.id },
      data: {
        status: BackupStatus.FAILED,
        error: e instanceof Error ? e.message : String(e),
        finishedAt: now(),
      },
    });
  }
}

// Executor default: pg_dump lewat perintah shell. BACKUP_PG_DUMP_CMD = perintah
// lengkap (mis. `pg_dump --dbname=... -Fc -f /backups/dump_$(date +%F).dump`);
// BACKUP_PG_DUMP_PATH = path output untuk dicatat di BackupRun.path.
// Kalau BACKUP_PG_DUMP_CMD tidak diset, lempar error → run tercatat FAILED.
// stdout dipakai sebagai ukuran dump (byte) — cocok untuk pg_dump tanpa -f.
export function createPgDumpExecutor(): BackupExecutor {
  return async () => {
    const cmd = process.env.BACKUP_PG_DUMP_CMD;
    if (!cmd) {
      throw new Error(
        "BACKUP_PG_DUMP_CMD tidak diset — executor pg_dump tidak tersedia. Konfigurasikan env atau inject executor custom."
      );
    }
    const { stdout } = await execAsync(cmd, { maxBuffer: 1_073_741_824 });
    return {
      sizeBytes: BigInt(Buffer.byteLength(stdout)),
      path: process.env.BACKUP_PG_DUMP_PATH || undefined,
    };
  };
}
