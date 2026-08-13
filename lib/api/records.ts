// Client API ProductionRecord (frontend) — pengganti lib/mocks/records.
// Menormalisasi respons GET /api/records ke shape MockProductionRecord supaya
// lib murni (dashboard/summary, production-table/totals, records/form) tetap
// jalan tanpa perubahan.

import type { MockProductionRecord } from "@/lib/mocks/records";
import type { RecordStatus } from "@/app/generated/prisma/enums";

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

export type ApiRecordPage = {
  items: ApiRecordItem[];
  total: number;
  page: number;
  perPage: number;
};

type ApiRecordItem = {
  id: string;
  date: string;
  model: string;
  shift: string | null;
  areaId: string | null;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
  gapUph: number;
  gapHc: number;
  gapOp: number;
  upph: number | null;
  status: RecordStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  area: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
};

// date API = ISO Date string → YYYY-MM-DD (sama format mockProductionRecords).
function normalizeItem(r: ApiRecordItem): MockProductionRecord {
  return {
    id: r.id,
    date: r.date.slice(0, 10),
    model: r.model,
    shift: r.shift,
    area: r.area ? { id: r.area.id, name: r.area.name, lineCode: null } : null,
    uphTarget: r.uphTarget,
    uphResult: r.uphResult,
    hcStandard: r.hcStandard,
    hcActual: r.hcActual,
    plan: r.plan,
    outputProd: r.outputProd,
    totalSetup: r.totalSetup,
    workingHour: r.workingHour,
    totalSetupPacking: r.totalSetupPacking,
    workingHourPacking: r.workingHourPacking,
    gapUph: r.gapUph,
    gapHc: r.gapHc,
    gapOp: r.gapOp,
    upph: r.upph,
    status: r.status,
    version: r.version,
    createdByName: r.createdByUser?.name ?? "—",
  };
}

// GET /api/records — seluruh record (perPage di-klamp server ke 100; fetch
// multi-halaman agar dashboard/tabel dapat semua data).
export async function fetchAllRecords(params: RecordsQueryParams = {}): Promise<MockProductionRecord[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const all: MockProductionRecord[] = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const q = new URLSearchParams(qs);
    q.set("perPage", String(perPage));
    q.set("page", String(page));
    const res = await fetch(`/api/records?${q.toString()}`);
    if (!res.ok) throw new Error(`Gagal memuat record (${res.status}).`);
    const data = (await res.json()) as { items: ApiRecordItem[]; total: number };
    all.push(...data.items.map(normalizeItem));
    if (page * perPage >= data.total || data.items.length === 0) break;
    page += 1;
  }
  return all.sort(
    (a, b) => b.date.localeCompare(a.date) || (a.shift ?? "").localeCompare(b.shift ?? "") || a.model.localeCompare(b.model)
  );
}

// POST /api/records — buat record DRAFT. Body flat: 12 raw input + shift/areaId.
export type CreateRecordPayload = {
  date: string; // YYYY-MM-DD
  model: string;
  shift: string | null;
  areaId?: string | null;
  uphTarget: number;
  uphResult: number;
  hcStandard: number;
  hcActual: number;
  plan: number;
  outputProd: number;
  totalSetup: number;
  workingHour: number;
  totalSetupPacking: number;
  workingHourPacking: number;
};

export async function createRecord(payload: CreateRecordPayload): Promise<{ id: string }> {
  const res = await fetch("/api/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan record.");
  return data.record as { id: string };
}

// PATCH /api/records/[id] — edit DRAFT (managed/editable). fields flat.
export type EditRecordPayload = {
  fields: Record<string, number | string | null>;
  reason?: string;
};

export async function updateRecord(id: string, payload: EditRecordPayload): Promise<void> {
  const res = await fetch(`/api/records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Gagal memperbarui record.");
}

// DELETE /api/records/[id] — hapus DRAFT.
export async function deleteRecord(id: string): Promise<void> {
  const res = await fetch(`/api/records/${id}`, { method: "DELETE" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus record.");
}

// PATCH /api/records/[id]/status — transisi workflow (validasi role backend).
export async function changeRecordStatus(
  id: string,
  status: RecordStatus,
  reason?: string
): Promise<void> {
  const res = await fetch(`/api/records/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, reason }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah status record.");
}
