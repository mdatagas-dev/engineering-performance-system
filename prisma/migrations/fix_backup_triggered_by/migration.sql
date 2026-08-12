-- AlterTable: triggered_by free string (cron/UI/CLI), bukan UUID
ALTER TABLE "backup_runs" ALTER COLUMN "triggered_by" DROP DEFAULT;
ALTER TABLE "backup_runs" ALTER COLUMN "triggered_by" TYPE TEXT USING ("triggered_by"::text);
