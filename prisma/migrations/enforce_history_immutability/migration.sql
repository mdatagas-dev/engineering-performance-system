-- Immutability riwayat (PRD "Audit Trail Immutable" / "Riwayat revisi data").
-- audit_logs & production_record_versions harus append-only. Proteksi lapis DB
-- (defense in depth): route sudah read-only, kode aplikasi hanya menulis (create),
-- trigger ini menutup celah dengan MENOLAK UPDATE/DELETE langsung pada kedua tabel.
--
-- Pengecualian: aksi FK yang sah tetap berjalan (pg_trigger_depth() >= 2):
--   - DELETE users   -> audit_logs.user_id menjadi NULL (ON DELETE SET NULL)
--   - DELETE records -> production_record_versions terhapus (ON DELETE CASCADE)
-- Operasi langsung aplikasi/psql berada di depth 1 -> ditolak dengan exception.

CREATE FUNCTION enforce_history_immutability() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() <= 1 THEN
    RAISE EXCEPTION 'Riwayat immutable: % pada tabel % tidak diizinkan.',
      TG_OP, TG_TABLE_NAME;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_logs_immutability
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION enforce_history_immutability();

CREATE TRIGGER production_record_versions_immutability
BEFORE UPDATE OR DELETE ON production_record_versions
FOR EACH ROW EXECUTE FUNCTION enforce_history_immutability();
