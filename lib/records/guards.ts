// Guard status & permission untuk edit/hapus ProductionRecord — reusable untuk
// semua jalur mutasi data (PATCH/DELETE sekarang, POST create nanti). Aturan
// PRD: hanya DRAFT yang bisa diedit/dihapus; APPROVED/LOCKED harus lewat
// Correction Workflow (lib/records/correction.ts).

import { RecordStatus, RoleName } from "@/app/generated/prisma/enums";

export type RecordGuardActor = { sub: string; role: string; permissions: string[] };

export type RecordGuardDecision =
  | { ok: true }
  | { ok: false; status: 403 | 409; message: string };

export function assertEditable(status: RecordStatus): RecordGuardDecision {
  if (status !== RecordStatus.DRAFT) {
    return {
      ok: false,
      status: 409,
      message: `Record berstatus ${status} tidak dapat diedit. Hanya DRAFT yang dapat diedit; untuk record APPROVED/LOCKED gunakan prosedur koreksi.`,
    };
  }
  return { ok: true };
}

export function assertDeletable(status: RecordStatus): RecordGuardDecision {
  if (status !== RecordStatus.DRAFT) {
    return {
      ok: false,
      status: 409,
      message: `Record berstatus ${status} tidak dapat dihapus. Hanya record DRAFT yang dapat dihapus.`,
    };
  }
  return { ok: true };
}

// Pemilik (createdBy) ATAU pemegang record.create; SUPER_ADMIN bypass.
export function canManageRecord(actor: RecordGuardActor, creatorId: string): boolean {
  if (actor.role === RoleName.SUPER_ADMIN) return true;
  if (actor.permissions.includes("record.create")) return true;
  return actor.sub === creatorId;
}

export function assertManageable(actor: RecordGuardActor, creatorId: string): RecordGuardDecision {
  if (canManageRecord(actor, creatorId)) return { ok: true };
  return {
    ok: false,
    status: 403,
    message: "Anda tidak memiliki izin untuk mengubah atau menghapus record ini.",
  };
}
