import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus } from "@/app/generated/prisma/enums";
import { applyMockTransition } from "./workflow";
import { seedMockKpi, validateKpiInput } from "./kpi";

const storage = {
  _m: new Map<string, string>(),
  getItem(k: string) {
    return this._m.get(k) ?? null;
  },
  setItem(k: string, v: string) {
    this._m.set(k, v);
  },
};

const STAFF = { sub: "staff-1", role: "ENGINEERING_STAFF", permissions: ["record.create"], name: "Staff" };
const MANAGER = { sub: "mgr-1", role: "ENGINEERING_MANAGER", permissions: ["record.approve", "record.lock"], name: "Manager" };

describe("applyMockTransition (approvals/locks)", () => {
  it("SUBMITTED → REVIEWED butuh record.approve", () => {
    const records = [
      {
        id: "r1",
        date: "2026-08-13",
        model: "LV-3000",
        shift: "1",
        area: null,
        uphTarget: 90, uphResult: 95, hcStandard: 30, hcActual: 31,
        plan: 960, outputProd: 1005, totalSetup: 12, workingHour: 8,
        totalSetupPacking: 6, workingHourPacking: 2,
        gapUph: 5, gapHc: 1, gapOp: 45, upph: 3.06,
        status: RecordStatus.SUBMITTED, version: 1, createdByName: "Staff",
      },
    ];
    storage._m.clear();
    const denied = applyMockTransition(storage, records, "r1", RecordStatus.REVIEWED, STAFF);
    assert.equal(denied.ok, false);
    assert.equal(denied.ok ? null : denied.status, 403);
    const ok = applyMockTransition(storage, records, "r1", RecordStatus.REVIEWED, MANAGER);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.record.status, RecordStatus.REVIEWED);
  });

  it("lompatan transisi ditolak (SUBMITTED → LOCKED)", () => {
    const records = [{
      id: "r1",
      date: "2026-08-13",
      model: "LV-3000",
      shift: "1",
      area: null,
      uphTarget: 90, uphResult: 95, hcStandard: 30, hcActual: 31,
      plan: 960, outputProd: 1005, totalSetup: 12, workingHour: 8,
      totalSetupPacking: 6, workingHourPacking: 2,
      gapUph: 5, gapHc: 1, gapOp: 45, upph: 3.06,
      status: RecordStatus.SUBMITTED, version: 1, createdByName: "Staff",
    }];
    const r = applyMockTransition(storage, records, "r1", RecordStatus.LOCKED, MANAGER);
    assert.equal(r.ok, false);
    assert.equal(r.ok ? null : r.status, 400);
  });

  it("APPROVED → LOCKED butuh record.lock; LOCKED terminal", () => {
    const records = [{
      id: "r2",
      date: "2026-08-11",
      model: "LV-8000",
      shift: "1",
      area: null,
      uphTarget: 75, uphResult: 80, hcStandard: 28, hcActual: 30,
      plan: 600, outputProd: 640, totalSetup: 15, workingHour: 8,
      totalSetupPacking: 7, workingHourPacking: 2,
      gapUph: 5, gapHc: 2, gapOp: 40, upph: 2.67,
      status: RecordStatus.APPROVED, version: 1, createdByName: "Staff",
    }];
    storage._m.clear();
    const denied = applyMockTransition(storage, records, "r2", RecordStatus.LOCKED, STAFF);
    assert.equal(denied.ok, false);
    const ok = applyMockTransition(storage, records, "r2", RecordStatus.LOCKED, MANAGER);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.record.status, RecordStatus.LOCKED);
  });

  it("record tak ditemukan → 400", () => {
    const r = applyMockTransition(storage, [], "nope", RecordStatus.REVIEWED, MANAGER);
    assert.equal(r.ok, false);
    assert.equal(r.ok ? null : r.status, 400);
  });
});

describe("validateKpiInput", () => {
  const base = seedMockKpi();

  it("key duplikat ditolak", () => {
    const err = validateKpiInput({ id: "new", key: "uph", name: "X", target: 5 }, base);
    assert.ok(err);
  });

  it("threshold di atas target (higherIsBetter) ditolak", () => {
    const err = validateKpiInput(
      { id: "new", key: "defect", name: "Defect", target: 5, warningThreshold: 8, higherIsBetter: true },
      base
    );
    assert.ok(err);
  });

  it("payload valid diterima", () => {
    const err = validateKpiInput(
      { id: "new", key: "defect_rate", name: "Defect Rate", target: 5, warningThreshold: 3, criticalThreshold: 2 },
      base
    );
    assert.equal(err, null);
  });
});
