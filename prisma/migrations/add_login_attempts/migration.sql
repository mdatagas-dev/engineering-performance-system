Loaded Prisma config from prisma.config.ts.

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "ip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts"("ip", "created_at");

-- CreateIndex
CREATE INDEX "login_attempts_email_created_at_idx" ON "login_attempts"("email", "created_at");

