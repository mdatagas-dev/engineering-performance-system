import { Prisma } from "@/app/generated/prisma/client";

export type AuditQueryParams = {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export type AuditQuery = {
  where: Prisma.AuditLogWhereInput;
  page: number;
  perPage: number;
  skip: number;
  take: number;
};

export function buildAuditQuery(params: AuditQueryParams): AuditQuery {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20) || 20));

  const where: Prisma.AuditLogWhereInput = {};
  if (params.action) where.action = params.action;
  if (params.entityType) where.entityType = params.entityType;
  if (params.entityId) where.entityId = params.entityId;
  if (params.userId) where.userId = params.userId;

  const createdAt: Prisma.DateTimeFilter<"AuditLog"> = {};
  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const search = params.search?.trim() ?? "";
  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  return { where, page, perPage, skip: (page - 1) * perPage, take: perPage };
}
