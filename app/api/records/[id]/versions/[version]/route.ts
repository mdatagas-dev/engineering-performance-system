import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { diffSnapshots } from "@/lib/records/diff";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; version: string }> };

const VERSION_SELECT = {
  id: true,
  version: true,
  action: true,
  changeReason: true,
  snapshot: true,
  createdAt: true,
  changedByUser: { select: { id: true, name: true } },
} as const;

const PREV_SELECT = {
  id: true,
  version: true,
  action: true,
  changeReason: true,
  snapshot: true,
  createdAt: true,
  changedByUser: { select: { id: true, name: true } },
} as const;

export async function GET(req: Request, { params }: Params) {
  const { id, version: versionParam } = await params;
  const version = Number(versionParam);
  if (!Number.isInteger(version) || version < 1) {
    return NextResponse.json({ message: "Versi tidak ditemukan." }, { status: 404 });
  }

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

  const versionRow = await prisma.productionRecordVersion.findUnique({
    where: { recordId_version: { recordId: id, version } },
    select: VERSION_SELECT,
  });
  if (!versionRow) {
    return NextResponse.json({ message: "Versi tidak ditemukan." }, { status: 404 });
  }

  const prev = await prisma.productionRecordVersion.findFirst({
    where: { recordId: id, version: { lt: version } },
    orderBy: { version: "desc" },
    select: PREV_SELECT,
  });

  let versiSebelumnya = null;
  let changes: ReturnType<typeof diffSnapshots> = [];
  if (prev) {
    const { snapshot: prevSnapshot, ...prevMeta } = prev;
    versiSebelumnya = prevMeta;
    changes = diffSnapshots(
      prevSnapshot as Record<string, unknown>,
      versionRow.snapshot as Record<string, unknown>
    );
  }

  return NextResponse.json({
    version: versionRow,
    diff: { versiSebelumnya, changes },
  });
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET." },
    { status: 405 }
  );
}
