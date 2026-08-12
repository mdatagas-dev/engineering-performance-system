-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'LOCKED');

-- CreateTable
CREATE TABLE "production_records" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "model" TEXT NOT NULL,
    "shift" TEXT,
    "area_id" UUID,
    "uph_target" DOUBLE PRECISION NOT NULL,
    "uph_result" DOUBLE PRECISION NOT NULL,
    "hc_standard" DOUBLE PRECISION NOT NULL,
    "hc_actual" DOUBLE PRECISION NOT NULL,
    "plan" DOUBLE PRECISION NOT NULL,
    "output_prod" DOUBLE PRECISION NOT NULL,
    "total_setup" DOUBLE PRECISION NOT NULL,
    "working_hour" DOUBLE PRECISION NOT NULL,
    "total_setup_packing" DOUBLE PRECISION NOT NULL,
    "working_hour_packing" DOUBLE PRECISION NOT NULL,
    "gap_uph" DOUBLE PRECISION NOT NULL,
    "gap_hc" DOUBLE PRECISION NOT NULL,
    "gap_op" DOUBLE PRECISION NOT NULL,
    "upph" DOUBLE PRECISION NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "reviewed_by" UUID,
    "locked_by" UUID,
    "approved_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_records_date_model_status_idx" ON "production_records"("date", "model", "status");

-- CreateIndex
CREATE INDEX "production_records_status_created_at_idx" ON "production_records"("status", "created_at");

-- CreateIndex
CREATE INDEX "production_records_area_id_date_idx" ON "production_records"("area_id", "date");

-- CreateIndex
CREATE INDEX "production_records_created_by_idx" ON "production_records"("created_by");

-- CreateIndex
CREATE INDEX "production_records_model_idx" ON "production_records"("model");

-- CreateIndex
CREATE UNIQUE INDEX "production_records_date_model_shift_area_id_key" ON "production_records"("date", "model", "shift", "area_id");

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
