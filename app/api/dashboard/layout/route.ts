import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { LayoutType } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { validateLayoutSave } from "@/lib/dashboard/validation";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

const LAYOUT_SELECT = {
  id: true,
  name: true,
  layout: true,
  theme: true,
  layoutType: true,
  isActive: true,
  updatedAt: true,
} as const;

export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const url = new URL(req.url);
  const layoutTypeParam = url.searchParams.get("layoutType")?.toUpperCase();
  if (layoutTypeParam && !Object.values(LayoutType).includes(layoutTypeParam as LayoutType)) {
    return NextResponse.json(
      { message: "Parameter layoutType tidak valid. Gunakan DASHBOARD atau TV." },
      { status: 400 }
    );
  }

  const layout = await prisma.dashboardLayout.findFirst({
    where: {
      userId: session.sub,
      ...(layoutTypeParam ? { layoutType: layoutTypeParam as LayoutType } : {}),
    },
    select: LAYOUT_SELECT,
  });

  return NextResponse.json({ layout });
}

export async function PUT(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  if (!requirePermission(session, "dashboard.view")) {
    return NextResponse.json(
      { message: "Anda tidak memiliki izin untuk mengakses resource ini." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const result = validateLayoutSave(body);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  const { layout, theme, layoutType, name } = result.data;
  const existing = await prisma.dashboardLayout.findUnique({
    where: { userId: session.sub },
    select: { id: true, layoutType: true },
  });

  const saved = await prisma.$transaction(async (tx) => {
    const layoutRow = await tx.dashboardLayout.upsert({
      where: { userId: session.sub },
      update: { layout, theme: theme ?? Prisma.DbNull, layoutType, name },
      create: { userId: session.sub, layout, theme: theme ?? Prisma.DbNull, layoutType, name },
      select: LAYOUT_SELECT,
    });
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "DASHBOARD_LAYOUT_UPDATED",
        entityType: "DASHBOARD_LAYOUT",
        entityId: existing?.id ?? layoutRow.id,
        before: existing ? { layoutType: existing.layoutType } : Prisma.JsonNull,
        after: { layoutType, name } as Prisma.InputJsonValue,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return layoutRow;
  });

  return NextResponse.json(
    { layout: saved, message: "Tata letak berhasil disimpan." },
    { status: existing ? 200 : 201 }
  );
}
