// Rollback impor (DELETE /api/imports/[id]) — helper murni.
// KEPUTUSAN: hard-stop 409 bila ada record non-DRAFT (bukan partial) — status
// workflow record yang sudah disubmit/reviewed/approved/locked TIDAK boleh
// hilang oleh rollback; hapus sebagian diam-diam berisiko data tak konsisten
// (laporan/basis sudah memakai record tersebut). Rollback berulang idempoten:
// records tinggal 0 → deleteMany 0 → 200 { deletedCount: 0, remaining: 0 }.

import { RecordStatus } from "@/app/generated/prisma/enums";

export const NON_DRAFT_MESSAGE =
  "Ada record non-DRAFT dari impor ini. Rollback ditolak untuk menjaga integritas data.";

export const ROLLBACK_DONE_MESSAGE = "Impor berhasil di-rollback.";

export type RollbackRecordStatus = { status: string };

// true bila ada record dengan status selain DRAFT (hard-stop 409).
export function hasNonDraft(
  records: readonly RollbackRecordStatus[]
): boolean {
  return records.some((r) => r.status !== RecordStatus.DRAFT);
}

// Snapshot sebelum rollback utk AuditLog: counter ImportHistory + jumlah
// record terlihat saat ini (dipakai juga sebagai before buildRollbackAudit).
export type ImportSnapshot = {
  fileName: string;
  rowsTotal: number;
  rowsValid: number;
  rowsSkipped: number;
  status: string;
  recordCount: number;
};

// Data AuditLog IMPORT_ROLLED_BACK: before = counter snapshot, after =
// jumlah record yang benar-benar terhapus + sisa record impor setelahnya.
// Ramah JSON (tanpa Prisma Json — route cast ke InputJsonValue).
export function buildRollbackAudit(
  before: ImportSnapshot,
  deletedCount: number,
  remaining: number
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  return {
    before: {
      fileName: before.fileName,
      rowsTotal: before.rowsTotal,
      rowsValid: before.rowsValid,
      rowsSkipped: before.rowsSkipped,
      status: before.status,
      recordCount: before.recordCount,
    },
    after: { deletedCount, remaining },
  };
}