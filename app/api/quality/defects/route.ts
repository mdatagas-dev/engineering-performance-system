import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
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

  const items = await prisma.qualityDefect.findMany({
    where: { check: where },
    orderBy: [{ check: { date: "desc" } }, { quantity: "desc" }],
    select: {
      id: true,
      checkId: true,
      defectCode: true,
      defectName: true,
      quantity: true,
      check: {
        select: {
          date: true,
          model: true,
          shift: true,
          area: { select: { id: true, name: true, lineCode: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      checkId: d.checkId,
      date: d.check.date,
      model: d.check.model,
      shift: d.check.shift,
      area: d.check.area,
      defectCode: d.defectCode,
      defectName: d.defectName,
      quantity: d.quantity,
    })),
    total: items.length,
  });
}
