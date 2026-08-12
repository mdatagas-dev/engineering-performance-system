// Mock workflow persetujuan & lock record — frontend-first (backend belum API
// utk halaman approvals/locks). Meniru keputusan lib/records/workflow.ts
// (decideTransition) + persist ke eps_mock_records + audit eps_mock_audit.
// Urutan: DRAFT → SUBMITTED → REVIEWED → APPROVED → LOCKED (hanya langkah
// berikutnya; LOCKED terminal).

import { RecordStatus } from "@/app/generated/prisma/enums";
import { decideTransition, type RecordActor } from "@/lib/records/workflow";
import {
  loadSavedRecords,
  mockProductionRecords,
  saveSavedRecords,
  type MockProductionRecord,
} from "@/lib/mocks/records";
import { appendMockAudit, clientMeta } from "@/lib/mocks/audit";

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

// Seed LOKAL halaman approvals/locks (SUBMITTED/REVIEWED/APPROVED) — sengaja
// terpisah dari mockProductionRecords (seed bersama) supaya test agregasi
// (buildSeries/summary/filters) yang mengunci nilai seed 4 record tidak
// berubah. build() meniru pola lib/mocks/records.ts; calculated via
// calculateCalculated.
import { calculateCalculated } from "@/lib/records/calculate";

const WF_AREA = { id: "area_machining", name: "Machining Line 1", lineCode: "L1" };

function build(
  id: string,
  raw: {
    date: string;
    model: string;
    shift: string | null;
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
  },
  status: RecordStatus
): MockProductionRecord {
  const { uphTarget, uphResult, hcStandard, hcActual, plan, outputProd, ...rest } = raw;
  return {
    id,
    ...rest,
    uphTarget,
    uphResult,
    hcStandard,
    hcActual,
    plan,
    outputProd,
    ...calculateCalculated({ uphTarget, uphResult, hcStandard, hcActual, plan, outputProd }),
    area: WF_AREA,
    status,
    version: 1,
    createdByName: "Engineering Staff",
  };
}

export const workflowSeedRecords: MockProductionRecord[] = [
  build(
    "rec_wf_1",
    {
      date: "2026-08-13",
      model: "LV-3000",
      shift: "1",
      uphTarget: 90,
      uphResult: 95,
      hcStandard: 30,
      hcActual: 31,
      plan: 960,
      outputProd: 1005,
      totalSetup: 12,
      workingHour: 8,
      totalSetupPacking: 6,
      workingHourPacking: 2,
    },
    RecordStatus.SUBMITTED
  ),
  build(
    "rec_wf_2",
    {
      date: "2026-08-13",
      model: "LV-5000",
      shift: "1",
      uphTarget: 100,
      uphResult: 98,
      hcStandard: 25,
      hcActual: 26,
      plan: 800,
      outputProd: 780,
      totalSetup: 8,
      workingHour: 8,
      totalSetupPacking: 4,
      workingHourPacking: 2,
    },
    RecordStatus.REVIEWED
  ),
  build(
    "rec_wf_3",
    {
      date: "2026-08-12",
      model: "LV-7000",
      shift: "2",
      uphTarget: 85,
      uphResult: 88,
      hcStandard: 28,
      hcActual: 29,
      plan: 640,
      outputProd: 660,
      totalSetup: 9,
      workingHour: 8,
      totalSetupPacking: 5,
      workingHourPacking: 2,
    },
    RecordStatus.APPROVED
  ),
];

// Semua record tampil (seed bersama + seed workflow + tersimpan user), terbaru dulu.
export function mockAllRecords(storage: StorageLike | null | undefined): MockProductionRecord[] {
  const saved = loadSavedRecords(storage);
  return [...workflowSeedRecords, ...mockProductionRecords, ...saved];
}

export type MockTransitionResult =
  | { ok: true; record: MockProductionRecord }
  | { ok: false; status: 400 | 403; message: string };

// Transisi status record mock: validasi alur+izin via decideTransition (sama
// dengan backend), update status, persist, catat audit.
export function applyMockTransition(
  storage: StorageLike,
  records: MockProductionRecord[],
  id: string,
  to: RecordStatus,
  actor: RecordActor & { name?: string; email?: string }
): MockTransitionResult {
  const record = records.find((r) => r.id === id);
  if (!record) return { ok: false, status: 400, message: "Record tidak ditemukan." };

  const decision = decideTransition({
    from: record.status,
    to,
    actor,
    creatorId: "",
  });
  if (!decision.ok) return decision;

  const next = { ...record, status: to };
  saveSavedRecords(storage, records.map((r) => (r.id === id ? next : r)));
  appendMockAudit({
    action: "RECORD_STATUS_CHANGED",
    entityType: "PRODUCTION_RECORD",
    entityId: id,
    before: { status: record.status },
    after: { status: to },
    ip: clientMeta().ip,
    userAgent: clientMeta().userAgent,
    user: {
      id: actor.sub,
      name: actor.name ?? "Mock User",
      email: actor.email ?? `${actor.sub}@eps.local`,
    },
  });
  return { ok: true, record: next };
}
