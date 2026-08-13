import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { RecordStatus } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";
import { decideCorrection, parseCorrectionBody } from "@/lib/records/correction";
import { recomputeCalculated } from "@/lib/records/calculate";
import { createVersionSnapshot } from "@/lib/records/versioning";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const RECORD_SELECT = {
  id: true,
  status: true,
  version: true,
  date: true,
  model: true,
  shift: true,
  uphTarget: true,
  uphResult: true,
  hcStandard: true,
  hcActual: true,
  plan: true,
  outputProd: true,
  totalSetup: true,
  workingHour: true,
  totalSetupPacking: true,
  workingHourPacking: true,
  gapUph: true,
  gapHc: true,
  gapOp: true,
  upph: true,
  reviewedBy: true,
  approvedBy: true,
  lockedBy: true,
  reviewedAt: true,
  approvedAt: true,
  lockedAt: true,
} as const;

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = parseCorrectionBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const record = await prisma.productionRecord.findUnique({
    where: { id },
    select: RECORD_SELECT,
  });
  if (!record) {
    return NextResponse.json({ message: "Record tidak ditemukan." }, { status: 404 });
  }

  const decision = decideCorrection({ status: record.status, actor: session });
  if (!decision.ok) {
    return NextResponse.json({ message: decision.message }, { status: decision.status });
  }

  const updates: Record<string, unknown> = {
    status: RecordStatus.DRAFT,
    reviewedBy: null,
    reviewedAt: null,
    approvedBy: null,
    approvedAt: null,
    lockedBy: null,
    lockedAt: null,
  };

  if (parsed.data.fields) {
    Object.assign(updates, parsed.data.fields);
    const calculated = recomputeCalculated(
      {
        uphTarget: record.uphTarget,
        uphResult: record.uphResult,
        hcStandard: record.hcStandard,
        hcActual: record.hcActual,
        plan: record.plan,
        outputProd: record.outputProd,
      },
      parsed.data.fields
    );
    if (calculated) {
      // ponytail: PRD mau upph null saat HC Actual = 0, tapi kolom schema NOT
      // NULL. Null disimpan 0 dulu; migrasi nullable saat ada akses DB.
      Object.assign(updates, {
        gapUph: calculated.gapUph,
        gapHc: calculated.gapHc,
        gapOp: calculated.gapOp,
        upph: calculated.upph ?? 0,
      });
    }
  }

  const data: Prisma.ProductionRecordUpdateInput = {
    ...(updates as Prisma.ProductionRecordUpdateInput),
    version: { increment: 1 },
  };

  const after: Record<string, unknown> = {
    ...record,
    ...updates,
    version: record.version + 1,
    reason: parsed.data.reason,
  };

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.productionRecord.updateMany({
      where: { id, status: record.status },
      data,
    });
    if (res.count === 0) return null;

    const u = await tx.productionRecord.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, version: true },
    });

    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "RECORD_CORRECTED",
        entityType: "PRODUCTION_RECORD",
        entityId: u.id,
        before: { ...record } as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });

    const snapshot: Record<string, unknown> = { ...after };
    delete snapshot.reason;
    // version diambil dari nilai hasil update (u.version), bukan perhitungan
    // pra-transaksi, agar isi snapshot selalu cocok dengan kolom version.
    snapshot.version = u.version;
    await createVersionSnapshot(tx, {
      recordId: u.id,
      version: u.version,
      snapshot: snapshot as Prisma.InputJsonValue,
      changedBy: session.sub,
      action: "CORRECTED",
      changeReason: parsed.data.reason,
    });
    return u;
  });

  if (!updated) {
    return NextResponse.json(
      { message: "Status record sudah berubah. Muat ulang data lalu coba lagi." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { record: updated, message: "Record dibuka kembali ke DRAFT untuk koreksi." },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan POST." },
    { status: 405 }
  );
}
