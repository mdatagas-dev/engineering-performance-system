import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { validateKpiUpdate, buildSoftDelete } from "@/lib/kpi/validation";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";

const KPI_SELECT = {
  id: true,
  key: true,
  name: true,
  formula: true,
  unit: true,
  decimals: true,
  target: true,
  higherIsBetter: true,
  warningThreshold: true,
  criticalThreshold: true,
  definition: true,
  sourceData: true,
  isActive: true,
  isDeleted: true,
  deletedAt: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
};

type KpiAuditFields = {
  key: string;
  name: string;
  formula: string;
  unit: string;
  decimals: number;
  target: number;
  higherIsBetter: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  definition: string | null;
  sourceData: string | null;
  isActive: boolean;
};

function auditFields(k: KpiAuditFields): KpiAuditFields {
  return {
    key: k.key,
    name: k.name,
    formula: k.formula,
    unit: k.unit,
    decimals: k.decimals,
    target: k.target,
    higherIsBetter: k.higherIsBetter,
    warningThreshold: k.warningThreshold,
    criticalThreshold: k.criticalThreshold,
    definition: k.definition,
    sourceData: k.sourceData,
    isActive: k.isActive,
  };
}

type Params = { params: Promise<{ key: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { key } = await params;

  const kpi = await prisma.kpiConfig.findUnique({ where: { key }, select: KPI_SELECT });
  if (!kpi || kpi.isDeleted) {
    return NextResponse.json({ message: "KPI tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ kpi });
}

export async function PATCH(req: Request, { params }: Params) {
  const { key } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const existing = await prisma.kpiConfig.findUnique({ where: { key }, select: KPI_SELECT });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ message: "KPI tidak ditemukan." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const result = await validateKpiUpdate(body, {
    target: existing.target,
    higherIsBetter: existing.higherIsBetter,
    warningThreshold: existing.warningThreshold,
    criticalThreshold: existing.criticalThreshold,
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }
  if (Object.keys(result.data).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada field yang dapat diubah." },
      { status: 400 }
    );
  }

  const data = { ...result.data, updatedBy: session.sub };
  const before = auditFields(existing);
  const after = { ...before, ...result.data };

  const kpi = await prisma.$transaction(async (tx) => {
    const updated = await tx.kpiConfig.update({
      where: { key },
      data,
      select: KPI_SELECT,
    });
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "KPI_UPDATED",
        entityType: "KPI",
        entityId: updated.id,
        before,
        after,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return updated;
  });

  return NextResponse.json(
    { kpi, message: "KPI berhasil diperbarui." },
    { status: 200 }
  );
}

export async function DELETE(req: Request, { params }: Params) {
  const { key } = await params;

  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ message: INVALID_MESSAGE }, { status: 401 });
  }

  const existing = await prisma.kpiConfig.findUnique({ where: { key }, select: KPI_SELECT });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ message: "KPI tidak ditemukan." }, { status: 404 });
  }

  const kpi = await prisma.$transaction(async (tx) => {
    const soft = await tx.kpiConfig.update({
      where: { key },
      data: buildSoftDelete(session.sub),
      select: KPI_SELECT,
    });
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "KPI_DELETED",
        entityType: "KPI",
        entityId: soft.id,
        before: auditFields(existing),
        after: {
          ...auditFields(existing),
          isDeleted: true,
          deletedAt: soft.deletedAt,
          deletedBy: session.sub,
        },
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return soft;
  });

  return NextResponse.json(
    { kpi, message: "KPI berhasil dihapus." },
    { status: 200 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET, PATCH, atau DELETE." },
    { status: 405 }
  );
}
