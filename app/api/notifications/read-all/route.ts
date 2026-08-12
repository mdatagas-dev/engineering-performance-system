import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

export async function PATCH() {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const { count } = await prisma.notification.updateMany({
    where: { recipientId: session.sub, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  return NextResponse.json({ count, message: "Semua notifikasi ditandai sudah dibaca." }, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan PATCH." },
    { status: 405 }
  );
}
