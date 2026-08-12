-- CreateTable
CREATE TABLE "kpi_configs" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "target" DOUBLE PRECISION NOT NULL,
    "warning_threshold" DOUBLE PRECISION,
    "critical_threshold" DOUBLE PRECISION,
    "definition" TEXT,
    "source_data" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "updated_by" UUID,
    "deleted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kpi_configs_key_key" ON "kpi_configs"("key");

-- CreateIndex
CREATE INDEX "kpi_configs_is_deleted_idx" ON "kpi_configs"("is_deleted");

-- CreateIndex
CREATE INDEX "kpi_configs_key_is_deleted_idx" ON "kpi_configs"("key", "is_deleted");

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_configs" ADD CONSTRAINT "kpi_configs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

