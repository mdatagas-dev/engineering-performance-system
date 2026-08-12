-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archived_at" TIMESTAMP(3);
