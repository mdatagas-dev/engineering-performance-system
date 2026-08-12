import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HealthStatus } from "@/app/generated/prisma/enums";
import { classifyDbHealth } from "@/lib/health/classify";
import pkg from "@/package.json";

export const dynamic = "force-dynamic";

// GET /api/health — status kesehatan sistem (feature "Monitoring & Backup").
// Auth: sesi valid, enforcement di proxy.ts (mapping /api/health →
// dashboard.view — semua role punya dashboard.view, health bukan data sensitif).
// Endpoint ini TIDAK dibuka public: kalau infra/load balancer butuh health
// tanpa sesi, tambah path terpisah (mis. /api/healthz) ke PUBLIC_API_PATHS di
// proxy.ts — jangan ubah yang ini, biar konsisten dengan proxy matcher /api/*.
//
// Pencatatan: simpan satu baris HealthCheck per panggilan. Dashboard butuh
// history (uptime %, avg response time), dan monitor internal polling 60s ≈
// 1.440 baris/hari — volume kecil. Saat DB down, insert ikut gagal → di-catch
// dan dilewati; response DOWN (503) tetap dikembalikan.
export async function GET() {
  const checkedAt = new Date();
  const startedAt = performance.now();

  let latencyMs: number | null = null;
  let error: unknown = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Math.round(performance.now() - startedAt);
  } catch (e) {
    error = e;
  }

  const status = classifyDbHealth({ latencyMs, error });
  const responseTimeMs = Math.round(performance.now() - startedAt);
  const db = { reachable: error === null, latencyMs };

  const details = {
    db,
    ...(error !== null
      ? { error: error instanceof Error ? error.message : String(error) }
      : {}),
  };

  await prisma.healthCheck
    .create({ data: { status, responseTimeMs, details } })
    .catch(() => {});

  return NextResponse.json(
    { status, responseTimeMs, checkedAt: checkedAt.toISOString(), db, version: pkg.version },
    { status: status === HealthStatus.DOWN ? 503 : 200 }
  );
}
