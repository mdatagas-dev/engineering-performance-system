// Cron backup — "Monitoring & Backup" (PRD Fase 5). Jalankan via system cron /
// PM2 cron (bukan in-process: Next.js dev/standalone tidak boleh menjalankan
// job terjadwal sendiri). Contoh crontab:
//   0 2 * * * cd /path/ke/proyek && npm run backup:run >> /var/log/eps-backup.log 2>&1
// Butuh DATABASE_URL asli + BACKUP_PG_DUMP_CMD (lihat lib/backup/backupService.ts).
// BACKUP_TYPE=incremental opsional (default FULL).

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BackupType } from "../app/generated/prisma/enums";
import { createPgDumpExecutor, runBackup } from "../lib/backup/backupService";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const type =
    process.env.BACKUP_TYPE === "incremental" ? BackupType.INCREMENTAL : BackupType.FULL;

  const run = await prisma.$transaction(
    (tx) =>
      runBackup({ tx, type, triggeredBy: "cron", deps: { executor: createPgDumpExecutor() } }),
    { maxWait: 5000, timeout: 3_600_000 }
  );

  console.log(
    `Backup ${run.type} ${run.status} (id=${run.id}, sizeBytes=${run.sizeBytes?.toString() ?? "-"}, path=${run.path ?? "-"}${run.error ? `, error=${run.error}` : ""})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
