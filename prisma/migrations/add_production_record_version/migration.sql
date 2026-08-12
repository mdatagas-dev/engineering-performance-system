-- CreateTable
CREATE TABLE "production_record_versions" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_reason" TEXT,
    "action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_record_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_record_versions_record_id_created_at_idx" ON "production_record_versions"("record_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_record_versions_record_id_version_key" ON "production_record_versions"("record_id", "version");

-- AddForeignKey
ALTER TABLE "production_record_versions" ADD CONSTRAINT "production_record_versions_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "production_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_record_versions" ADD CONSTRAINT "production_record_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
