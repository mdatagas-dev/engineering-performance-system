import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { buildQualitySummary } from "@/lib/quality/summary";
import { forbidden, unauthorized } from "@/lib/http/api-error";
import { buildQualityWhere } from "../route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "quality.view")) return forbidden();

  const url = new URL(req.url);
  const where = buildQualityWhere(url);

  const [checks, defects] = await Promise.all([
    prisma.qualityCheck.findMany({
      where,
      select: {
        date: true,
        model: true,
        shift: true,
        inspectedQty: true,
        passedQty: true,
        failedQty: true,
        defectCount: true,
      },
    }),
    prisma.qualityDefect.findMany({
      where: { check: where },
      select: { defectCode: true, defectName: true, quantity: true },
    }),
  ]);

  const summary = buildQualitySummary(
    checks.map((c) => ({ ...c, shift: c.shift ?? undefined })),
    defects
  );

  return NextResponse.json({ summary });
}
