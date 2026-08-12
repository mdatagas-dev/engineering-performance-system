import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@/app/generated/prisma/client";
import { BackupStatus, BackupType } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { createPgDumpExecutor, runBackup } from "@/lib/backup/backupService";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set<string>(Object.values(BackupStatus));
const VALID_TYPES = new Set<string>(Object.values(BackupType));

// GET /api/backups — riwayat backup (feature "Monitoring & Backup").
// Auth: permission backup.view (mapping di proxy.ts). Pagination page/perPage,
// filter opsional status & type (nilai invalid diabaikan). sizeBytes BigInt
// diserialisasi jadi string agar JSON aman.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage")) || 20));

  const where: Prisma.BackupRunWhereInput = {};
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  if (status && VALID_STATUS.has(status)) where.status = status as BackupStatus;
  if (type && VALID_TYPES.has(type)) where.type = type as BackupType;

  const [rows, total] = await Promise.all([
    prisma.backupRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.backupRun.count({ where }),
  ]);

  const items = rows.map(({ sizeBytes, ...row }) => ({
    ...row,
    sizeBytes: sizeBytes?.toString() ?? null,
  }));

  return NextResponse.json({ items, total, page, perPage });
}

// POST /api/backups — trigger backup manual dari UI/dashboard.
// Auth: backup.view (mapping di proxy.ts, sama untuk GET & POST) — role dengan
// backup.view adalah SUPER_ADMIN/ADMIN/ENGINEERING_MANAGER (lihat seed), yaitu
// tier ops-admin: "yang bisa melihat riwayat bisa menjalankan" cukup untuk
// phase 1; permission terpisah backup.run belum perlu (hindari over-build).
// Body: { type?: "FULL" | "INCREMENTAL" }, default FULL; nilai invalid → 400.
// Backup dijalankan sinkron via runBackup (executor default pg_dump dari env).
// Keputusan status: BackupRun hasil dikembalikan apa pun statusnya (SUCCESS
// atau FAILED — env BACKUP_PG_DUMP_CMD yang tidak diset dicatat FAILED oleh
// service) dengan 201 Created + message jujur; 500 hanya untuk error tak
// terduga (DB down dll). triggeredBy = `manual:${userId}` agar audit trail
// menunjuk aktor, tanpa relasi User (backup bisa juga jalan unattended).
export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawType = body?.type;
  const type =
    rawType === undefined || rawType === null
      ? BackupType.FULL
      : typeof rawType === "string" && VALID_TYPES.has(rawType)
        ? (rawType as BackupType)
        : null;
  if (type === null) {
    return NextResponse.json(
      { message: `type tidak valid. Gunakan salah satu: ${[...VALID_TYPES].join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const run = await prisma.$transaction(
      async (tx) => {
        const backupRun = await runBackup({
          tx,
          type,
          triggeredBy: `manual:${session.sub}`,
          deps: { executor: createPgDumpExecutor() },
        });
        await tx.auditLog.create({
          data: {
            userId: session.sub,
            action: "BACKUP_RUN",
            entityType: "BACKUP",
            entityId: backupRun.id,
            before: Prisma.JsonNull,
            after: {
              type: backupRun.type,
              status: backupRun.status,
              sizeBytes: backupRun.sizeBytes?.toString() ?? null,
            } as Prisma.InputJsonValue,
            ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
            userAgent: req.headers.get("user-agent"),
          },
        });
        return backupRun;
      },
      { maxWait: 5000, timeout: 3_600_000 }
    );

    const { sizeBytes, ...rest } = run;
    const message =
      run.status === BackupStatus.SUCCESS
        ? "Backup berhasil dijalankan."
        : run.status === BackupStatus.FAILED
          ? `Backup gagal: ${run.error ?? "kesalahan tidak diketahui"}`
          : "Backup sedang berjalan.";

    return NextResponse.json(
      { backup: { ...rest, sizeBytes: sizeBytes?.toString() ?? null }, message },
      { status: 201 }
    );
  } catch (e) {
    console.error("Backup manual gagal:", e);
    return NextResponse.json(
      { message: "Gagal menjalankan backup karena error tak terduga." },
      { status: 500 }
    );
  }
}
