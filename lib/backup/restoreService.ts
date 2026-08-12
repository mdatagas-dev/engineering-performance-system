// Service restore — "Monitoring & Backup" (PRD Fase 5: recovery data).
// Kebalikan dari runBackup (lib/backup/backupService.ts): memakai BackupRun
// yang SUCCESS + punya path, menjalankan restore via executor yang di-inject
// (produksi: createPgRestoreExecutor() dari env BACKUP_PG_RESTORE_CMD, path
// backup dari BackupRun.path), lalu mencatat AuditLog BACKUP_RESTORED dalam tx
// yang sama. Restore BUKAN backup → tidak membuat BackupRun baru; ledger backup
// hanya merekam backup, jejak restore cukup di AuditLog.
// Operasi destruktif: menolak tanpa confirm=true, hanya dari backup SUCCESS.
// Keterbatasan jujur: restore parsial tidak ditangani — kalau executor gagal
// di tengah jalan, DB bisa berada di kondisi antara dan AuditLog tidak ditulis
// (tx rollback). Pemulihan kondisi penuh butuh strategi di luar fase 1.

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Prisma } from "@/app/generated/prisma/client";
import { BackupStatus } from "@/app/generated/prisma/enums";
import type { BackupRunModel } from "@/app/generated/prisma/models/BackupRun";

const execAsync = promisify(exec);

export type RestoreExecutor = (params: { path: string }) => Promise<void>;

export type RestoreDeps = {
  executor: RestoreExecutor;
  now?: () => Date;
};

export type RestoreActor = {
  userId: string;
  ip: string | null;
  userAgent: string | null;
};

export type RestoreOutcome =
  | { ok: true }
  | {
      ok: false;
      code: "NOT_FOUND" | "NOT_SUCCESS" | "NO_CONFIRM" | "NO_PATH" | "EXECUTION_FAILED";
      message: string;
    };

export type RestoreParams = {
  tx: Prisma.TransactionClient;
  id: string;
  confirm: boolean;
  actor: RestoreActor;
  deps: RestoreDeps;
};

// Snapshot backup yang JSON-safe untuk AuditLog before/after (sizeBytes BigInt
// diserialisasi jadi string).
function restoreMeta(b: BackupRunModel) {
  return {
    id: b.id,
    type: b.type,
    status: b.status,
    sizeBytes: b.sizeBytes?.toString() ?? null,
    path: b.path ?? null,
    startedAt: b.startedAt.toISOString(),
    finishedAt: b.finishedAt?.toISOString() ?? null,
    error: b.error ?? null,
    triggeredBy: b.triggeredBy ?? null,
    createdAt: b.createdAt.toISOString(),
  };
}

export async function restoreBackup({
  tx,
  id,
  confirm,
  actor,
  deps,
}: RestoreParams): Promise<RestoreOutcome> {
  const backup = await tx.backupRun.findUnique({ where: { id } });
  if (!backup) {
    return { ok: false, code: "NOT_FOUND", message: "Backup tidak ditemukan." };
  }
  if (backup.status !== BackupStatus.SUCCESS) {
    return {
      ok: false,
      code: "NOT_SUCCESS",
      message: `Restore hanya bisa dari backup berstatus SUCCESS (status saat ini: ${backup.status}).`,
    };
  }
  if (!confirm) {
    return {
      ok: false,
      code: "NO_CONFIRM",
      message: "Restore menimpa data yang ada. Kirim body { confirm: true } untuk melanjutkan.",
    };
  }
  if (!backup.path) {
    return {
      ok: false,
      code: "NO_PATH",
      message: "Backup tidak memiliki path file — tidak bisa direstore.",
    };
  }

  try {
    await deps.executor({ path: backup.path });
  } catch (e) {
    return {
      ok: false,
      code: "EXECUTION_FAILED",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const restoredAt = deps.now ? deps.now() : new Date();
  await tx.auditLog.create({
    data: {
      userId: actor.userId,
      action: "BACKUP_RESTORED",
      entityType: "BACKUP",
      entityId: backup.id,
      before: restoreMeta(backup),
      after: { ...restoreMeta(backup), restoredAt: restoredAt.toISOString() },
      ip: actor.ip,
      userAgent: actor.userAgent,
    },
  });

  return { ok: true };
}

// Executor default: BACKUP_PG_RESTORE_CMD = perintah lengkap tanpa argumen file
// (mis. `pg_restore --clean --if-exists --dbname=...`); path dari BackupRun.path
// ditambahkan sebagai argumen terakhir. Kalau env tidak diset, lempar error →
// route balas 500. stdout/stderr pg_restore diabaikan; status keluar != 0
// melempar error via execAsync.
export function createPgRestoreExecutor(): RestoreExecutor {
  return async ({ path }) => {
    const cmd = process.env.BACKUP_PG_RESTORE_CMD;
    if (!cmd) {
      throw new Error(
        "BACKUP_PG_RESTORE_CMD tidak diset — executor restore tidak tersedia. Konfigurasikan env atau inject executor custom."
      );
    }
    await execAsync(`${cmd} ${JSON.stringify(path)}`, { maxBuffer: 1_073_741_824 });
  };
}
