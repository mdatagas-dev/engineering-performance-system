import { Prisma } from "@/app/generated/prisma/client";
import { NotificationType } from "@/app/generated/prisma/enums";

export type NotificationQueryParams = {
  recipientId: string;
  isRead?: string;
  type?: string;
  archived?: string;
  page?: number;
  perPage?: number;
};

export type NotificationQuery = {
  where: Prisma.NotificationWhereInput;
  page: number;
  perPage: number;
  skip: number;
  take: number;
};

const VALID_TYPES = new Set<string>(Object.values(NotificationType));

export function buildNotificationQuery(
  params: NotificationQueryParams
): NotificationQuery {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20) || 20));

  const where: Prisma.NotificationWhereInput = { recipientId: params.recipientId };
  where.isArchived = params.archived === "true";
  if (params.isRead === "true" || params.isRead === "false") {
    where.isRead = params.isRead === "true";
  }
  if (params.type && VALID_TYPES.has(params.type)) {
    where.type = params.type as NotificationType;
  }

  return { where, page, perPage, skip: (page - 1) * perPage, take: perPage };
}
