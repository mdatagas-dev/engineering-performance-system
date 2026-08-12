// Version snapshot untuk "Riwayat Versi Data" (PRD Fase 3). Dipanggil dalam
// transaksi yang sama dengan mutasi record. Snapshot = state lengkap record
// (raw + calculated + status) PADA versi baru hasil mutasi — version selalu
// cocok dengan kolom version record, dan karena record menaikkan version di
// tiap mutasi, [recordId, version] unik (lihat skema). Diff before/after
// untuk UI tetap dari AuditLog.before; tabel ini untuk restore per versi.

import type { Prisma } from "@/app/generated/prisma/client";

export type VersionAction = "CREATED" | "UPDATED" | "CORRECTED" | "BACKFILL";

export function createVersionSnapshot(
  tx: Prisma.TransactionClient,
  params: {
    recordId: string;
    version: number;
    snapshot: Prisma.InputJsonValue;
    changedBy: string;
    action: VersionAction;
    changeReason?: string;
  }
) {
  return tx.productionRecordVersion.create({
    data: {
      recordId: params.recordId,
      version: params.version,
      snapshot: params.snapshot,
      changedBy: params.changedBy,
      action: params.action,
      changeReason: params.changeReason ?? null,
    },
  });
}
