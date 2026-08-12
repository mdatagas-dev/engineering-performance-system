import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { buildRecordsQuery } from "@/lib/records/query";
import { buildRecordTotals, RECORD_TOTAL_SUM } from "@/lib/records/totals";
import { Prisma } from "@/app/generated/prisma/client";
import {
  parseCreateBody,
  buildCreateData,
  buildCreateSnapshot,
  findDuplicateKey,
  isDuplicateKeyError,
  isForeignKeyError,
  DUPLICATE_MESSAGE,
} from "@/lib/records/create";
import { createVersionSnapshot } from "@/lib/records/versioning";
import {
  badRequest,
  conflict,
  internal,
  unauthorized,
} from "@/lib/http/api-error";

export const dynamic = "force-dynamic";

const RECORD_SELECT = {
  id: true,
  date: true,
  model: true,
  shift: true,
  areaId: true,
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
  status: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  area: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, name: true } },
} as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { where, page, perPage, skip, take, orderBy } = buildRecordsQuery({
    status: url.searchParams.get("status") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    model: url.searchParams.get("model") ?? undefined,
    models: url.searchParams.get("models") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    areaId: url.searchParams.get("areaId") ?? undefined,
    shift: url.searchParams.get("shift") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
    perPage: url.searchParams.get("perPage") ? Number(url.searchParams.get("perPage")) : undefined,
  });

  const withTotals = url.searchParams.get("totals") === "true";

  const [items, total, totalRows] = await Promise.all([
    prisma.productionRecord.findMany({
      where,
      orderBy,
      skip,
      take,
      select: RECORD_SELECT,
    }),
    prisma.productionRecord.count({ where }),
    withTotals
      ? prisma.productionRecord.groupBy({
          where,
          by: ["date", "shift"],
          _sum: RECORD_TOTAL_SUM,
          orderBy: { date: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const response: Record<string, unknown> = { items, total, page, perPage };
  if (totalRows) {
    response.totals = buildRecordTotals(
      totalRows.map((r) => ({
        date: r.date,
        shift: r.shift,
        sums: r._sum ?? {},
      }))
    );
  }

  return NextResponse.json(response);
}

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = parseCreateBody(body);
  if (!parsed.ok) return badRequest(parsed.message);
  const payload = parsed.data;

  const dupWhere = findDuplicateKey(payload.date, payload.model, payload.shift, payload.areaId);
  if (dupWhere) {
    const existing = await prisma.productionRecord.findFirst({
      where: dupWhere,
      select: { id: true },
    });
    if (existing) return conflict(DUPLICATE_MESSAGE);
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.productionRecord.create({
        data: buildCreateData(payload, session.sub),
        select: { id: true, createdAt: true },
      });

      const snapshot = buildCreateSnapshot(payload);
      const auditAfter: Record<string, unknown> = {
        ...(snapshot as Record<string, unknown>),
        id: created.id,
        createdAt: created.createdAt.toISOString(),
      };
      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "RECORD_CREATED",
          entityType: "PRODUCTION_RECORD",
          entityId: created.id,
          before: Prisma.JsonNull,
          after: auditAfter as Prisma.InputJsonValue,
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: req.headers.get("user-agent"),
        },
      });

      await createVersionSnapshot(tx, {
        recordId: created.id,
        version: 1,
        snapshot,
        changedBy: session.sub,
        action: "CREATED",
      });
      return created;
    });

    return NextResponse.json(
      { record, message: "Record berhasil dibuat." },
      { status: 201 }
    );
  } catch (err) {
    // backstop race duplicate: pre-check + constrain unique DB (P2002)
    if (isDuplicateKeyError(err)) return conflict(DUPLICATE_MESSAGE);
    if (isForeignKeyError(err)) return badRequest("areaId tidak valid.");
    return internal("Gagal menyimpan record.", err);
  }
}
