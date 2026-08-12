import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const HISTORY_SELECT = {
  id: true,
  action: true,
  entityId: true,
  before: true,
  after: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
} as const;

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  if (!getSession(token)) {
    return NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const record = await prisma.productionRecord.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!record) {
    return NextResponse.json({ message: "Record tidak ditemukan." }, { status: 404 });
  }

  const items = await prisma.auditLog.findMany({
    where: {
      entityType: "PRODUCTION_RECORD",
      entityId: id,
      action: { in: ["RECORD_STATUS_CHANGED", "RECORD_CORRECTED", "RECORD_UPDATED", "RECORD_DELETED"] },
    },
    orderBy: { createdAt: "asc" },
    select: HISTORY_SELECT,
  });

  return NextResponse.json({ items, count: items.length });
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
