import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { buildNotificationQuery } from "@/lib/notifications/query";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  severity: true,
  title: true,
  message: true,
  link: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} as const;

export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const url = new URL(req.url);
  const { where, page, perPage, skip, take } = buildNotificationQuery({
    recipientId: session.sub,
    isRead: url.searchParams.get("isRead") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    archived: url.searchParams.get("archived") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    perPage: url.searchParams.get("perPage") ? Number(url.searchParams.get("perPage")) : undefined,
  });

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: NOTIFICATION_SELECT,
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
