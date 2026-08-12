import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const META_SELECT = {
  key: true,
  name: true,
  formula: true,
  unit: true,
  definition: true,
  sourceData: true,
  decimals: true,
  target: true,
  higherIsBetter: true,
  warningThreshold: true,
  criticalThreshold: true,
  updatedAt: true,
  updatedByUser: { select: { name: true } },
} as const;

export async function GET() {
  const rows = await prisma.kpiConfig.findMany({
    where: { isDeleted: false, isActive: true },
    orderBy: { name: "asc" },
    select: META_SELECT,
  });

  const items = rows.map(({ updatedByUser, ...kpi }) => ({
    ...kpi,
    updatedBy: updatedByUser?.name ?? null,
  }));

  return NextResponse.json({ items, total: items.length });
}
