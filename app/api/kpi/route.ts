import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { validateKpiCreate } from "@/lib/kpi/validation";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

const KPI_SELECT = {
  id: true,
  key: true,
  name: true,
  formula: true,
  unit: true,
  decimals: true,
  target: true,
  higherIsBetter: true,
  warningThreshold: true,
  criticalThreshold: true,
  definition: true,
  sourceData: true,
  isActive: true,
  isDeleted: true,
  deletedAt: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("perPage") ?? 20) || 20)
  );
  const search = url.searchParams.get("search")?.trim() ?? "";

  const where = {
    isDeleted: false,
    ...(search
      ? {
          OR: [
            { key: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.kpiConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: KPI_SELECT,
    }),
    prisma.kpiConfig.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const result = await validateKpiCreate(body, async (key) =>
    Boolean(
      await prisma.kpiConfig.findUnique({ where: { key }, select: { id: true } })
    )
  );
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  const kpi = await prisma.$transaction(async (tx) => {
    const created = await tx.kpiConfig.create({
      data: result.data,
      select: KPI_SELECT,
    });
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "KPI_CREATED",
        entityType: "KPI",
        entityId: created.id,
        after: result.data,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });
    return created;
  });

  return NextResponse.json(
    { kpi, message: "KPI berhasil dibuat." },
    { status: 201 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau POST." },
    { status: 405 }
  );
}
