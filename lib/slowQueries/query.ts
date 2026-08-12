import { Prisma } from "@/app/generated/prisma/client";

export type SlowQueryParams = {
  minDurationMs?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

export type SlowQueryQuery = {
  where: Prisma.SlowQueryLogWhereInput;
  page: number;
  perPage: number;
  skip: number;
  take: number;
};

// Filter & pagination untuk daftar query lambat (GET /api/slow-queries).
// minDurationMs (>= 0) dipasang sebagai gte durationMs; from/to menjadi
// gte/lte createdAt. Nilai tidak valid diabaikan — pola sama dengan
// buildAuditQuery.
export function buildSlowQueryQuery(params: SlowQueryParams): SlowQueryQuery {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20) || 20));

  const where: Prisma.SlowQueryLogWhereInput = {};

  const minMs = params.minDurationMs === undefined ? NaN : Number(params.minDurationMs);
  if (!Number.isNaN(minMs) && minMs >= 0) where.durationMs = { gte: Math.round(minMs) };

  const createdAt: Prisma.DateTimeFilter<"SlowQueryLog"> = {};
  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  return { where, page, perPage, skip: (page - 1) * perPage, take: perPage };
}
