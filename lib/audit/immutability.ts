// Desain append-only / tamper-resistant untuk Audit Trail (phase 5).
//
// LAPISAN PROTEKSI (defense in depth):
//   1. Aplikasi: tidak ada endpoint manapun yang mengubah/menghapus auditLog
//      (panggilan mutasi pada delegate auditLog — update/delete/upsert —
//      kosong di seluruh repo; satu-satunya endpoint /api/audit read-only
//      GET + 405 utk method lain — lihat app/api/audit/route.ts).
//      Riwayat versi produksi (production_record_versions) ditulis HANYA lewat
//      tx.productionRecordVersion.create di lib/records/versioning.ts.
//   2. Database: trigger enforce_history_immutability (migrasi
//      enforce_history_immutability) MENOLAK UPDATE/DELETE baris di
//      audit_logs & production_record_versions — dieksekusi dengan
//      RAISE EXCEPTION saat pg_trigger_depth() <= 1 (operasi langsung
//      aplikasi/psql). Aksi FK sah (depth >= 2) tetap jalan:
//        - DELETE users -> audit_logs.user_id jadi NULL (ON DELETE SET NULL)
//        - DELETE records -> production_record_versions terhapus (CASCADE)
//   3. Integritas: baris yang sudah ditulis tak berubah sejak INSERT
//      (createdAt + snapshot before/after JSONB).
//
// Konsekuensi desain (konsisten dengan trigger):
//   - Update/delete audit HANYA via operasi DB langsung dengan menaikkan
//     depth trigger — sengaja tidak difasilitasi kode aplikasi.
//   - Rotasi/purge audit (bila nanti dibutuhkan) harus operasi terpisaah
//     dengan mekanisme yang sadar trigger, bukan endpoint biasa.

// Daftar tabel yang dijamin append-only oleh trigger DB. Dipakai test
// immutability untuk membandingkan cakupan migrasi vs harapan desain — bila
// ada tabel riwayat baru (mis. snapshot KPI), trigger harus diperluas
// (agen migrasi) dan daftar ini disinkronkan.
export const IMMUTABLE_TABLES = ["audit_logs", "production_record_versions"] as const;

export type ImmutableTable = (typeof IMMUTABLE_TABLES)[number];

export function isImmutableTable(table: string): table is ImmutableTable {
  return (IMMUTABLE_TABLES as readonly string[]).includes(table);
}