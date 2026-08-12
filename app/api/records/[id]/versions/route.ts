import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const VERSION_SELECT = {
  id: true,
  version: true,
  action: true,
  changeReason: true,
  snapshot: true,
  createdAt: true,
  changedBy: true,
  changedByUser: { select: { id: true, name: true } },
} as const;

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("perPage") ?? 20) || 20)
  );

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

  const [items, total] = await Promise.all([
    prisma.productionRecordVersion.findMany({
      where: { recordId: id },
      orderBy: { version: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: VERSION_SELECT,
    }),
    prisma.productionRecordVersion.count({ where: { recordId: id } }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
