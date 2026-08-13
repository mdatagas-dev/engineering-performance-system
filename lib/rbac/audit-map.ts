// Peta referensi action audit trail → route backend (phase 5, task
// "layanan-pencatatan-audit-trail"). Fungsi: konstanta referensi routing —
// route mana menulis action apa ke audit log.
//
// Daftar action VALID dipegang lib/audit/record.ts (AUDIT_ACTIONS — registry
// bersama, dikerjakan agen lain; file ini HANYA membaca, tidak mengubah).
// AUDIT_ACTIONS di bawah = alias nilai registry, plus ekspresi peta route.
//
// UNREGISTERED_ACTIONS: action yang SUDAH dipakai route tapi BELUM didaftarkan
// ke registry lib/audit/record.ts — kosong saat ini (semua action sudah terdaftar
// di registry bersama). Daftarkan dulu ke registry sebelum dipakai route baru.
//
// Catatan kontrak vs mock frontend (lib/mocks/audit.ts): BACKUP_RESTORED ditulis
// oleh lib/backup/restoreService.ts (di dalam $transaction route restore), bukan
// inline di route — route file tak memuat auditLog.create sehingga tidak masuk
// skan peta. UNLOCKED kini ditulis endpoint baru /api/users/[id]/unlock.
import { AUDIT_ACTIONS as CANON_AUDIT_ACTIONS } from "@/lib/audit/record";

export const AUDIT_ACTIONS = Object.values(CANON_AUDIT_ACTIONS);

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// Action terpakai di route yang belum masuk registry lib/audit/record.ts.
export const UNREGISTERED_ACTIONS = [] as const;

export type AuditRouteMap = Record<string, readonly AuditAction[]>;

// Route (relatif root repo) → action yang ditulis route tersebut.
// app/api/auth/login juga memakai result.auditAction dinamis = LOGIN_FAILED |
// ACCOUNT_LOCKED (variabel hasil login.ts) — sudah termasuk di barisnya.
export const AUDIT_ROUTE_MAP: AuditRouteMap = {
  "app/api/auth/login/route.ts": ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_RATE_LIMITED", "ACCOUNT_LOCKED"],
  "app/api/auth/logout/route.ts": ["LOGOUT"],
  "app/api/auth/logout-all/route.ts": ["LOGOUT_ALL"],
  "app/api/auth/sessions/[id]/route.ts": ["LOGOUT"],
  "app/api/users/route.ts": ["USER_CREATED"],
  "app/api/users/[id]/route.ts": ["USER_UPDATED", "USER_ROLE_CHANGED"],
  "app/api/users/[id]/role/route.ts": ["USER_ROLE_CHANGED"],
  "app/api/users/[id]/unlock/route.ts": ["UNLOCKED"],
  "app/api/records/route.ts": ["RECORD_CREATED"],
  "app/api/records/[id]/route.ts": ["RECORD_UPDATED", "RECORD_DELETED"],
  "app/api/records/[id]/status/route.ts": ["RECORD_STATUS_CHANGED"],
  "app/api/records/[id]/correct/route.ts": ["RECORD_CORRECTED"],
  "app/api/import/route.ts": ["IMPORT_COMPLETED"],
  "app/api/imports/[id]/route.ts": ["IMPORT_ROLLED_BACK"],
  "app/api/export/route.ts": ["EXPORTED"],
  "app/api/kpi/route.ts": ["KPI_CREATED"],
  "app/api/kpi/[key]/route.ts": ["KPI_UPDATED", "KPI_DELETED"],
  "app/api/security-config/route.ts": ["SECURITY_CONFIG_UPDATED"],
  "app/api/backups/route.ts": ["BACKUP_RUN"],
  "app/api/dashboard/layout/route.ts": ["DASHBOARD_LAYOUT_UPDATED"],
};
