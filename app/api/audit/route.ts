import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAuditQuery } from "@/lib/audit/query";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { where, page, perPage, skip, take } = buildAuditQuery({
    action: url.searchParams.get("action") ?? undefined,
    entityType: url.searchParams.get("entityType") ?? undefined,
    entityId: url.searchParams.get("entityId") ?? undefined,
    userId: url.searchParams.get("userId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    perPage: url.searchParams.get("perPage") ? Number(url.searchParams.get("perPage")) : undefined,
  });

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
