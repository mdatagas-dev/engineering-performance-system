import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ message: "ID notifikasi tidak valid." }, { status: 400 });
  }

  const { count } = await prisma.notification.updateMany({
    where: { id, recipientId: session.sub },
    data: { isArchived: true, archivedAt: new Date() },
  });

  if (count === 0) {
    return NextResponse.json({ message: "Notifikasi tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ message: "Notifikasi diarsipkan." }, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan DELETE." },
    { status: 405 }
  );
}
