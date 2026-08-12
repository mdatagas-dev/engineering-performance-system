-- CreateEnum
CREATE TYPE "LayoutType" AS ENUM ('DASHBOARD', 'TV');

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "layout" JSONB NOT NULL,
    "theme" JSONB,
    "layout_type" "LayoutType" NOT NULL DEFAULT 'DASHBOARD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_user_id_key" ON "dashboard_layouts"("user_id");

-- CreateIndex
CREATE INDEX "dashboard_layouts_is_active_idx" ON "dashboard_layouts"("is_active");

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
