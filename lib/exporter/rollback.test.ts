import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RecordStatus } from "@/app/generated/prisma/enums";
import {
  hasNonDraft,
  buildRollbackAudit,
  NON_DRAFT_MESSAGE,
  type ImportSnapshot,
} from "./rollback";

const SNAPSHOT: ImportSnapshot = {
  fileName: "produksi-2026-08.csv",
  rowsTotal: 10,
  rowsValid: 9,
  rowsSkipped: 1,
  status: "PARTIAL",
  recordCount: 9,
};

describe("hasNonDraft — keputusan rollback hard-stop 409", () => {
  it("semua DRAFT → false (rollback diteruskan)", () => {
    assert.equal(hasNonDraft([{ status: RecordStatus.DRAFT }, { status: RecordStatus.DRAFT }]), false);
  });

  it("ada satu non-DRAFT (SUBMITTED) → true → 409", () => {
    assert.equal(
      hasNonDraft([{ status: RecordStatus.DRAFT }, { status: RecordStatus.SUBMITTED }]),
      true
    );
  });

  it("REVIEWED/APPROVED/LOCKED juga non-DRAFT", () => {
    for (const s of [RecordStatus.REVIEWED, RecordStatus.APPROVED, RecordStatus.LOCKED]) {
      assert.equal(hasNonDraft([{ status: s }]), true, s);
    }
  });

  it("daftar kosong → false (rollback idempoten)", () => {
    assert.equal(hasNonDraft([]), false);
  });
});

describe("buildRollbackAudit — AuditLog IMPORT_ROLLED_BACK", () => {
  it("before = snapshot counter, after = deletedCount + remaining", () => {
    const audit = buildRollbackAudit(SNAPSHOT, 9, 0);
    assert.deepEqual(audit.before, {
      fileName: "produksi-2026-08.csv",
      rowsTotal: 10,
      rowsValid: 9,
      rowsSkipped: 1,
      status: "PARTIAL",
      recordCount: 9,
    });
    assert.deepEqual(audit.after, { deletedCount: 9, remaining: 0 });
  });

  it("rollback ulang (sudah kosong) → deletedCount 0, remaining 0", () => {
    const audit = buildRollbackAudit(SNAPSHOT, 0, 0);
    assert.deepEqual(audit.after, { deletedCount: 0, remaining: 0 });
  });

  it("pesan non-DRAFT jelas & action-friendly", () => {
    assert.match(NON_DRAFT_MESSAGE, /non-DRAFT/);
  });
});