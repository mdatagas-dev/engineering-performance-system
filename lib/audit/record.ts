// Layanan bersama penulisan audit (phase 5 "Audit Trail").
//
// Sebelum helper ini ada, tiap route menulis prisma.auditLog.create inline dengan
// shape serupa tapi action string hardcoded (rentan typo & tak konsisten). Set
// aksi di bawah adalah SATU-SATUNYA sumber kebenaran action const yang dipakai
// route (janji kontrak). Tambahkan aksi baru ke sini, jangan hardcode di route.
//
// Rute yang SUDAH beralih ke helper ini:
//   - app/api/auth/logout/route.ts         (LOGOUT)
//   - app/api/auth/logout-all/route.ts     (LOGOUT_ALL)
// Rute lain masih inline (lihat laporan akhir task "buat-middleware-...").
// Catatan: audit TIDAK ditulis di proxy.ts (lapis middleware) demi performa —
// setiap request tidak boleh kena tulis DB; pencatatan terjadi di lapis layanan.

import { Prisma } from "@/app/generated/prisma/client";

// --- Kontrak action (janji konsistensi backend + mock frontend) ------------
// Superset dari lib/mocks/audit.ts (MockAuditAction) + aksi backend aktual
// yang belum ada di mock: LOGOUT, LOGOUT_ALL, RECORD_CREATED, RECORD_UPDATED,
// RECORD_DELETED, IMPORT_COMPLETED, IMPORT_ROLLED_BACK, EXPORTED, BACKUP_RUN,
// DASHBOARD_LAYOUT_UPDATED. UNLOCKED ditulis endpoint POST
// /api/users/[id]/unlock (perluasan dari kontrak mock).
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGIN_RATE_LIMITED: "LOGIN_RATE_LIMITED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  UNLOCKED: "UNLOCKED",
  LOGOUT: "LOGOUT",
  LOGOUT_ALL: "LOGOUT_ALL",
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_ROLE_CHANGED: "USER_ROLE_CHANGED",
  RECORD_CREATED: "RECORD_CREATED",
  RECORD_UPDATED: "RECORD_UPDATED",
  RECORD_STATUS_CHANGED: "RECORD_STATUS_CHANGED",
  RECORD_CORRECTED: "RECORD_CORRECTED",
  RECORD_DELETED: "RECORD_DELETED",
  KPI_CREATED: "KPI_CREATED",
  KPI_UPDATED: "KPI_UPDATED",
  KPI_DELETED: "KPI_DELETED",
  IMPORT_COMPLETED: "IMPORT_COMPLETED",
  IMPORT_ROLLED_BACK: "IMPORT_ROLLED_BACK",
  EXPORTED: "EXPORTED",
  BACKUP_RESTORED: "BACKUP_RESTORED",
  BACKUP_RUN: "BACKUP_RUN",
  DASHBOARD_LAYOUT_UPDATED: "DASHBOARD_LAYOUT_UPDATED",
  SECURITY_CONFIG_UPDATED: "SECURITY_CONFIG_UPDATED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// entityType dipakai konsisten lintas route; sesuaikan pola string tabel di
// filter /api/audit (entityType=...).
export const AUDIT_ENTITY_TYPES = {
  USER: "USER",
  PRODUCTION_RECORD: "PRODUCTION_RECORD",
  IMPORT_HISTORY: "IMPORT_HISTORY",
  KPI: "KPI",
} as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[keyof typeof AUDIT_ENTITY_TYPES];

// Klien minimal yang punya delegate auditLog — terima PrismaClient dan
// Prisma.TransactionClient (tx). Bivariance method membuat kedua-duanya
// lolos tanpa konversi.
export type AuditLogClient = {
  auditLog: {
    create: (args: Prisma.AuditLogCreateArgs) => Promise<unknown>;
  };
};

export type WriteAuditParams = {
  client: AuditLogClient;
  /** null/undefined untuk aksi anonim (mis. LOGIN_FAILED email tak dikenal). */
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

// Snapshot JSON dibuat oleh PEMANGGIL: serialisasi Date → ISO string dsb.
// Di sini objek diteruskan apa adanya; Prisma menolak undefined untuk kolom
// nullable jadi undefined dinormalisasi jadi null (hasil: SET NULL, bukan
// kolom tak disentuh — lebih eksplisit untuk riwayat).
export async function writeAudit(params: WriteAuditParams): Promise<unknown> {
  const { client, userId, action, entityType, entityId, before, after, ip, userAgent } = params;
  return client.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      // Prisma 7: JSON nullable hanya menerima undefined/JsonNull — null dari
      // pemanggil dinormalisasi jadi Prisma.JsonNull (set kolom jadi SQL NULL).
      before: before === null || before === undefined ? Prisma.JsonNull : before,
      after: after === null || after === undefined ? Prisma.JsonNull : after,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });
}

// Ekstrak identitas request (sama dengan requestMeta di lib/auth/logout.ts —
// duplikat sengaja agar lapis audit mandiri; dedupe ke satu helper bila lapis
// auth & audit disatukan). x-forwarded-for bisa "ip1, ip2" → ambil paling awal
// (hop asli klien), fallback x-real-ip.
export function metaFromRequest(req: Request): { ip: string | null; userAgent: string | null } {
  return {
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}