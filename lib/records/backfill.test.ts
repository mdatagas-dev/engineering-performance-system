import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus } from "@/app/generated/prisma/enums";
import type { ProductionRecord } from "@/app/generated/prisma/client";
import { BACKFILL_ACTION, BACKFILL_REASON, buildBackfillSnapshot } from "./backfill";

function makeRecord(): ProductionRecord {
  return {
    id: "record-1",
    date: new Date("2026-08-12T00:00:00.000Z"),
    model: "M-100",
    shift: "SHIFT_A",
    areaId: null,
    importHistoryId: null,
    uphTarget: 100,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 900,
    outputProd: 950,
    totalSetup: 60,
    workingHour: 480,
    totalSetupPacking: 45,
    workingHourPacking: 60,
    gapUph: -10,
    gapHc: 2,
    gapOp: 50,
    upph: 2.81,
    status: RecordStatus.APPROVED,
    createdBy: "user-1",
    approvedBy: "user-2",
    reviewedBy: null,
    lockedBy: null,
    approvedAt: new Date("2026-08-13T01:00:00.000Z"),
    reviewedAt: null,
    lockedAt: null,
    version: 1,
    createdAt: new Date("2026-08-12T02:00:00.000Z"),
    updatedAt: new Date("2026-08-12T02:00:00.000Z"),
  };
}

describe("backfill", () => {
  it("action & reason jujur: BACKFILL, bukan CREATED", () => {
    assert.equal(BACKFILL_ACTION, "BACKFILL");
    assert.equal(BACKFILL_REASON, "Backfill versi awal (sebelum fitur versioning)");
  });

  it("snapshot memuat raw + calculated + status + version", () => {
    const snap = buildBackfillSnapshot(makeRecord()) as Record<string, unknown>;
    assert.equal(snap.model, "M-100");
    assert.equal(snap.upph, 2.81);
    assert.equal(snap.status, RecordStatus.APPROVED);
    assert.equal(snap.version, 1);
    assert.equal(snap.date, "2026-08-12T00:00:00.000Z");
    assert.equal(Object.keys(snap).length, 20);
  });

  it("snapshot mengecualikan id, kolom actor, dan timestamp", () => {
    const snap = buildBackfillSnapshot(makeRecord()) as Record<string, unknown>;
    for (const key of ["id", "createdBy", "approvedBy", "reviewedBy", "lockedBy", "approvedAt", "createdAt", "updatedAt"]) {
      assert.equal(key in snap, false, `tidak boleh memuat ${key}`);
    }
  });

  it("version diambil dari kolom version record", () => {
    const r = makeRecord();
    r.version = 3;
    const snap = buildBackfillSnapshot(r) as Record<string, unknown>;
    assert.equal(snap.version, 3);
  });
});
