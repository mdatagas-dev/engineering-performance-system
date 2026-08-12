import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSlowQueryQuery } from "@/lib/slowQueries/query";

export const dynamic = "force-dynamic";

// GET /api/slow-queries — lihat & analisis query lambat (feature "Monitoring &
// Backup", mekanisme optimasi: data dulu, keputusan oleh manusia).
// Auth: permission backup.view (mapping di proxy.ts) — domain ops/monitoring,
// tier sama dengan backup (SUPER_ADMIN/ADMIN/ENGINEERING_MANAGER, lihat seed);
// bukan dashboard.view karena query text bisa berisi data sensitif. Filter
// minDurationMs & from/to (nilai invalid diabaikan), order durationMs desc.
// summary = top 10 pola query lambat (group by query text — params terpisah di
// metadata) by max duration + avg + count: dasar menentukan query mana yang
// dioptimasi duluan. Retensi log di luar scope fase ini.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { where, page, perPage, skip, take } = buildSlowQueryQuery({
    minDurationMs: url.searchParams.get("minDurationMs") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    perPage: url.searchParams.get("perPage") ? Number(url.searchParams.get("perPage")) : undefined,
  });

  const [items, total, grouped] = await Promise.all([
    prisma.slowQueryLog.findMany({
      where,
      orderBy: { durationMs: "desc" },
      skip,
      take,
    }),
    prisma.slowQueryLog.count({ where }),
    prisma.slowQueryLog.groupBy({
      by: ["query"],
      where,
      _count: { _all: true },
      _avg: { durationMs: true },
      _max: { durationMs: true },
      orderBy: { _max: { durationMs: "desc" } },
      take: 10,
    }),
  ]);

  const summary = grouped.map((g) => ({
    query: g.query,
    count: g._count._all,
    avgDurationMs: g._avg.durationMs,
    maxDurationMs: g._max.durationMs,
  }));

  return NextResponse.json({ items, total, page, perPage, summary });
}

export async function POST() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
