import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import { Prisma } from "@/app/generated/prisma/client";
import { RecordStatus } from "@/app/generated/prisma/enums";
import { validateQualityCheckCreate } from "@/lib/quality/validation";
import { isDuplicateKeyError, isForeignKeyError } from "@/lib/records/create";
import {
  badRequest,
  conflict,
  forbidden,
  internal,
  unauthorized,
} from "@/lib/http/api-error";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = new Set<string>(Object.values(RecordStatus));
const NOTE_MAX = 1000;
export const QUALITY_DUPLICATE_MESSAGE =
  "Quality check duplikat untuk tanggal, model, shift, dan area yang sama sudah ada. Muat ulang data atau gunakan quality check yang ada.";

const QUALITY_SELECT = {
  id: true,
  date: true,
  model: true,
  shift: true,
  areaId: true,
  inspectedQty: true,
  passedQty: true,
  failedQty: true,
  defectCount: true,
  note: true,
  status: true,
  version: true,
  createdById: true,
  reviewedById: true,
  approvedById: true,
  createdAt: true,
  updatedAt: true,
  area: { select: { id: true, name: true, lineCode: true } },
  createdBy: { select: { id: true, name: true } },
  defects: {
    select: { id: true, defectCode: true, defectName: true, quantity: true },
  },
} as const;

type QualityDefectInput = {
  defectCode: string;
  defectName: string;
  quantity: number;
};

export function cleanNote(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim().slice(0, NOTE_MAX);
}

export function cleanShift(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const shift = value.trim();
  return shift === "" ? null : shift;
}

// Filter bersama GET /api/quality, /api/quality/defects, dan
// /api/quality/summary. Parameter invalid (format tanggal salah, status tak
// dikenal) DIABAIKAN, bukan error — sama dengan buildRecordsQuery.
export function buildQualityWhere(url: URL): Prisma.QualityCheckWhereInput {
  const where: Prisma.QualityCheckWhereInput = {};

  const status = url.searchParams.get("status") ?? "";
  if (VALID_STATUSES.has(status)) where.status = status as RecordStatus;

  const areaId = url.searchParams.get("areaId") ?? "";
  if (areaId) where.areaId = areaId;

  const area = (url.searchParams.get("area") ?? "").trim();
  if (area) where.area = { name: { contains: area, mode: "insensitive" } };

  const model = (url.searchParams.get("model") ?? "").trim();
  if (model) where.model = { contains: model, mode: "insensitive" };

  const dateFilter: Prisma.StringFilter<"QualityCheck"> = {};
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (from && DATE_RE.test(from)) dateFilter.gte = from;
  if (to && DATE_RE.test(to)) dateFilter.lte = to;
  if (dateFilter.gte || dateFilter.lte) where.date = dateFilter;

  return where;
}

export async function GET(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "quality.view")) return forbidden();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("perPage") ?? 20) || 20)
  );
  const where = buildQualityWhere(url);

  const [items, total] = await Promise.all([
    prisma.qualityCheck.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: QUALITY_SELECT,
    }),
    prisma.qualityCheck.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, perPage });
}

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();
  if (!requirePermission(session, "quality.record")) return forbidden();

  const body = await req.json().catch(() => null);
  const error = validateQualityCheckCreate(body);
  if (error) return badRequest(error);

  const payload = body as {
    date: string;
    model: string;
    shift?: unknown;
    areaId?: unknown;
    inspectedQty: number;
    passedQty: number;
    failedQty: number;
    defectCount: number;
    note?: unknown;
    defects?: QualityDefectInput[];
  };

  const shift = cleanShift(payload.shift);
  const areaId = typeof payload.areaId === "string" ? payload.areaId : null;
  const note = cleanNote(payload.note);

  // Pre-check duplikat 1:1 dengan @@unique([date, model, shift, areaId]) —
  // Postgres memperlakukan NULL sebagai distinct, jadi konflik unik hanya
  // mungkin saat shift DAN areaId keduanya terisi.
  if (shift !== null && areaId !== null) {
    const existing = await prisma.qualityCheck.findFirst({
      where: { date: payload.date, model: payload.model, shift, areaId },
      select: { id: true },
    });
    if (existing) return conflict(QUALITY_DUPLICATE_MESSAGE);
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const check = await tx.qualityCheck.create({
        data: {
          date: payload.date,
          model: payload.model,
          shift,
          areaId,
          inspectedQty: payload.inspectedQty,
          passedQty: payload.passedQty,
          failedQty: payload.failedQty,
          defectCount: payload.defectCount,
          note,
          status: RecordStatus.DRAFT,
          version: 1,
          createdById: session.sub,
        },
        select: { id: true, createdAt: true },
      });

      const defects = payload.defects ?? [];
      if (defects.length > 0) {
        await tx.qualityDefect.createMany({
          data: defects.map((d) => ({
            checkId: check.id,
            defectCode: d.defectCode.trim(),
            defectName: d.defectName.trim(),
            quantity: d.quantity,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "QUALITY_CHECK_CREATED",
          entityType: "QUALITY_CHECK",
          entityId: check.id,
          before: Prisma.JsonNull,
          after: {
            id: check.id,
            date: payload.date,
            model: payload.model,
            shift,
            areaId,
            inspectedQty: payload.inspectedQty,
            passedQty: payload.passedQty,
            failedQty: payload.failedQty,
            defectCount: payload.defectCount,
            note,
            status: RecordStatus.DRAFT,
            version: 1,
            defectsAdded: defects.length,
          } as Prisma.InputJsonValue,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });

      return check;
    });

    const check = await prisma.qualityCheck.findUnique({
      where: { id: created.id },
      select: QUALITY_SELECT,
    });

    return NextResponse.json(
      { check, message: "Quality check berhasil dibuat." },
      { status: 201 }
    );
  } catch (err) {
    // backstop race duplicate: pre-check + constrain unique DB (P2002)
    if (isDuplicateKeyError(err)) return conflict(QUALITY_DUPLICATE_MESSAGE);
    if (isForeignKeyError(err)) return badRequest("areaId tidak valid.");
    return internal("Gagal menyimpan quality check.", err);
  }
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau POST." },
    { status: 405 }
  );
}
