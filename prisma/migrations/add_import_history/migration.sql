-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- AlterTable
ALTER TABLE "production_records" ADD COLUMN     "import_history_id" UUID;

-- CreateTable
CREATE TABLE "import_histories" (
    "id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "rows_total" INTEGER NOT NULL,
    "rows_valid" INTEGER NOT NULL,
    "rows_skipped" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'SUCCESS',
    "errors" JSONB,
    "imported_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_histories_imported_by_idx" ON "import_histories"("imported_by");

-- CreateIndex
CREATE INDEX "import_histories_status_created_at_idx" ON "import_histories"("status", "created_at");

-- CreateIndex
CREATE INDEX "production_records_import_history_id_idx" ON "production_records"("import_history_id");

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_import_history_id_fkey" FOREIGN KEY ("import_history_id") REFERENCES "import_histories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_histories" ADD CONSTRAINT "import_histories_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;