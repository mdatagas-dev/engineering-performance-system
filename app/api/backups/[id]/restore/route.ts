import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { createPgRestoreExecutor, restoreBackup } from "@/lib/backup/restoreService";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

type Params = { params: Promise<{ id: string }> };

// POST /api/backups/[id]/restore — recovery data dari backup (feature
// "Monitoring & Backup", PRD Fase 5). Auth: backup.view (mapping di proxy.ts,
// sama dengan riwayat/trigger backup) — restore adalah tindakan recovery tier
// ops-admin yang sama dengan pengelola backup; permission terpisah
// backup.restore belum perlu di phase 1 (siapa yang boleh membuat backup boleh
// me-restore; pisahkan kalau kebutuhan audit pemisah muncul).
// Body: { confirm: true } — WAJIB (restore menimpa data). Hanya backup
// berstatus SUCCESS + punya path yang boleh direstore. Jalankan executor default
// createPgRestoreExecutor (BACKUP_PG_RESTORE_CMD + path dari BackupRun.path)
// sinkron dalam tx; AuditLog BACKUP_RESTORED ditulis di tx yang sama.
// Restore tidak membuat BackupRun baru (bukan backup) — cukup AuditLog.
// Sukses → 200 { message }; backup tak ada → 404; status/confirm/path tidak
// layak → 400; executor gagal → 500 (restore parsial tidak ditangani).

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const confirm = body?.confirm === true;

  try {
    const result = await prisma.$transaction(
      (tx) =>
        restoreBackup({
          tx,
          id,
          confirm,
          actor: {
            userId: session.sub,
            ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
            userAgent: req.headers.get("user-agent"),
          },
          deps: { executor: createPgRestoreExecutor() },
        }),
      { maxWait: 5000, timeout: 3_600_000 }
    );

    if (!result.ok) {
      if (result.code === "EXECUTION_FAILED") {
        return NextResponse.json(
          {
            message:
              `Restore gagal: ${result.message}. ` +
              "Keterbatasan: restore parsial tidak ditangani — bila restore gagal di tengah jalan, " +
              "data bisa berada di kondisi antara (sebagian ter-restore); audit tidak tercatat.",
          },
          { status: 500 }
        );
      }
      const status = result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ message: result.message }, { status });
    }

    return NextResponse.json({ message: "Restore berhasil dijalankan. Data dikembalikan dari backup." });
  } catch (e) {
    console.error("Restore backup gagal:", e);
    return NextResponse.json(
      { message: "Gagal menjalankan restore karena error tak terduga." },
      { status: 500 }
    );
  }
}
