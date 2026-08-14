-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "shift" TEXT,
    "area_id" UUID,
    "inspectedQty" INTEGER NOT NULL,
    "passedQty" INTEGER NOT NULL,
    "failedQty" INTEGER NOT NULL,
    "defectCount" INTEGER NOT NULL,
    "note" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID,
    "reviewedById" UUID,
    "approvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityDefect" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "defectCode" TEXT NOT NULL,
    "defectName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityDefect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_date_model_shift_areaId_key" ON "QualityCheck"("date", "model", "shift", "area_id");

-- CreateIndex
CREATE INDEX "QualityCheck_date_model_idx" ON "QualityCheck"("date", "model");

-- CreateIndex
CREATE INDEX "QualityCheck_status_idx" ON "QualityCheck"("status");

-- CreateIndex
CREATE INDEX "QualityDefect_checkId_idx" ON "QualityDefect"("checkId");

-- CreateIndex
CREATE INDEX "QualityDefect_defectCode_idx" ON "QualityDefect"("defectCode");

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_areaId_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityDefect" ADD CONSTRAINT "QualityDefect_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "QualityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
