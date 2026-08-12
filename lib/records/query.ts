import { Prisma } from "@/app/generated/prisma/client";
import { RecordStatus } from "@/app/generated/prisma/enums";

export type RecordsQueryParams = {
  status?: string;
  from?: string;
  to?: string;
  model?: string;
  models?: string;
  areaId?: string;
  area?: string;
  shift?: string;
  sort?: string;
  order?: string;
  page?: number;
  perPage?: number;
};

export type RecordsQuery = {
  where: Prisma.ProductionRecordWhereInput;
  orderBy: Prisma.ProductionRecordOrderByWithRelationInput[];
  page: number;
  perPage: number;
  skip: number;
  take: number;
};

type SortDir = Prisma.SortOrder;
type SortColumn = "date" | "model" | "shift" | "outputProd" | "upph" | "plan";

const VALID_STATUSES = new Set<string>(Object.values(RecordStatus));

const SORT_COLUMNS: Record<string, SortColumn> = {
  date: "date",
  model: "model",
  shift: "shift",
  outputprod: "outputProd",
  upph: "upph",
  plan: "plan",
};

const DEFAULT_ORDER_BY: Prisma.ProductionRecordOrderByWithRelationInput[] = [
  { date: "desc" },
  { createdAt: "desc" },
];

/**
 * NORMALISASI/NAN-GUARD: semua input raw di-coerce. Nilai invalid TIDAK
 * melempar exception — diabaikan/di-default, selaras pola buildAuditQuery.
 *
 * PARAM CONTRACT (semua optional):
 * - `status`   — RecordStatus valid (invalid diabaikan).
 * - `from`/`to`— ISO date (YYYY-MM-DD); local: from = 00:00:00, to = 23:59:59
 *   inklusif. Tidak valid diabaikan. (KEPUTUSAN: alias `dateFrom`/`dateTo`
 *   TIDAK ditambahkan — frontend dashboard (lib/dashboard/filters.ts) sudah
 *   mengirim `from`/`to`; alias ganda menciptakan dua source-of-truth.)
 * - `model`    — partial match `contains` case-insensitive (ILIKE %..%).
 * - `models`   — daftar exact, comma-separated ("LV-3000,LV-5000") → `in: []`.
 *   MENGOVERRIDE `model` bila keduanya dikirim.
 * - `areaId`   — equality.
 * - `area`     — nama area, `contains` case-insensitive via relasi
 *   (where.area.name, mode insensitive — ILIKE).
 * - `shift`    — equality (kolom nullable).
 * - `sort`     — whitelist kolom: date | model | shift | outputProd | upph |
 *   plan. Di luar whitelist (atau kosong) → DEFAULT_ORDER_BY.
 * - `order`    — asc | desc (bukan asc = desc).
 * - `page`/`perPage` — Number() NaN-guard; page minimal 1, perPage diklem
 *   [1, 100], default 20.
 *
 * ORDER BY default: [{date desc},{createdAt desc}]. Sort custom selalu diberi
 * tie-break `createdAt` (arah sama) agar pagination deterministik.
 *
 * ANALISIS INDEKS (filter vs prisma/schema.prisma ProductionRecord):
 * - (from,to) date-range           → leading `date` @index([date, model, status]) ✓
 * - (from,to,model)                → date-range narrowing via indeks di atas ✓
 *   (`model` contains = ILIKE %x%: bukan btree-able — ok di skala dashboard;
 *   utk dataset besar pertimbangkan pg_trgm GIN atau pakai `models` exact)
 * - (areaId,date)                  → @index([areaId, date]) ✓ persis
 * - (model) exact / `models` in[]  → @index([model]) ✓
 * - (status) + orderBy createdAt   → @index([status, createdAt]) ✓ persis
 * - (shift) dengan date range      → trailing kolom @@unique([date, model,
 *   shift, areaId]) ✓ (equality trailing didukung selama leading tercakup)
 * - (status, areaId) TANPA date    → TIDAK ada indeks persis; equality ganda
 *   tetap terlayani via salah satu indeks leading (status/areaId), tapi untuk
 *   pola dashboard umum ini REKOMENDASI: @index([status, areaId, date]).
 * - groupBy by [date, shift] (route totals) → leading `date` ✓ cukup.
 * - orderBy [{date desc},{createdAt desc}]  → reverse-scan (date,...) ✓;
 *   tie-break createdAt in-memory; bila kelak perlu deep-offset pagination,
 *   pertimbangkan keyset pagination atau @index([date, createdAt]).
 * - `area` (nama) → resolusi via Area.name (@unique, terindeks) lalu areaId
 *   → @index([areaId, date]) ✓.
 */
export function buildRecordsQuery(params: RecordsQueryParams): RecordsQuery {
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20) || 20));

  const where: Prisma.ProductionRecordWhereInput = {};
  if (params.status && VALID_STATUSES.has(params.status)) {
    where.status = params.status as RecordStatus;
  }
  if (params.areaId) where.areaId = params.areaId;

  const area = params.area?.trim() ?? "";
  if (area) {
    where.area = { name: { contains: area, mode: "insensitive" } };
  }

  if (params.shift) where.shift = params.shift;

  const date: Prisma.DateTimeFilter<"ProductionRecord"> = {};
  if (params.from) {
    const d = new Date(params.from);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      date.gte = d;
    }
  }
  if (params.to) {
    const d = new Date(params.to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      date.lte = d;
    }
  }
  if (date.gte || date.lte) where.date = date;

  const modelFilter = buildModelFilter(params.model, params.models);
  if (modelFilter) where.model = modelFilter;

  return {
    where,
    orderBy: buildOrderBy(params.sort, params.order),
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage,
  };
}

function buildModelFilter(
  model?: string,
  models?: string
): NonNullable<Prisma.ProductionRecordWhereInput["model"]> | undefined {
  const list = (models ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (list.length > 0) return { in: list };
  const single = model?.trim() ?? "";
  if (single) return { contains: single, mode: "insensitive" };
  return undefined;
}

function buildOrderBy(sort?: string, order?: string): Prisma.ProductionRecordOrderByWithRelationInput[] {
  const key = sort?.trim().toLowerCase() ?? "";
  const column = SORT_COLUMNS[key];
  if (!column) return DEFAULT_ORDER_BY;
  const dir: SortDir = order?.trim().toLowerCase() === "asc" ? "asc" : "desc";
  return [{ [column]: dir } as Prisma.ProductionRecordOrderByWithRelationInput, { createdAt: dir }];
}