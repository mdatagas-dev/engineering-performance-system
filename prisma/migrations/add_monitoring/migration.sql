Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('UP', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL');

-- CreateTable
CREATE TABLE "health_checks" (
    "id" UUID NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "response_time_ms" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_runs" (
    "id" UUID NOT NULL,
    "status" "BackupStatus" NOT NULL,
    "type" "BackupType" NOT NULL,
    "size_bytes" BIGINT,
    "path" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "error" TEXT,
    "triggered_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slow_query_logs" (
    "id" UUID NOT NULL,
    "query" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slow_query_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "health_checks_status_created_at_idx" ON "health_checks"("status", "created_at");

-- CreateIndex
CREATE INDEX "backup_runs_status_created_at_idx" ON "backup_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "slow_query_logs_created_at_idx" ON "slow_query_logs"("created_at");

-- CreateIndex
CREATE INDEX "slow_query_logs_duration_ms_idx" ON "slow_query_logs"("duration_ms");

