import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Tipe client DIINFER dari factory (bukan generic eksplisit) — stabil thd
// perubahan bentuk generik hasil prisma generate (7.9: PrismaClient<LogOpts,
// OmitOpts, ExtArgs>). Semua pemakai prisma.* tetap ter-typed penuh.
function createClient() {
  return new PrismaClient({
    adapter,
    // Nilai parameter TIDAK ikut dicetak (prepared statement $n). stdout query
    // dibatasi ke non-produksi; event $on("query") (slow-query log) tetap aktif.
    log: process.env.NODE_ENV === "production" ? [] : ["query"],
  });
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

// Ambang deteksi query lambat (ms): query dengan durasi >= nilai ini dicatat
// ke SlowQueryLog oleh hook di bawah. Cara baca: `query` = SQL (placeholder
// $n), `metadata.paramCount` = jumlah parameter (nilai diredaksi), `metadata.target` = koneksi DB.
// Daftar & ringkasan pola query: GET /api/slow-queries (permission backup.view,
// filter minDurationMs/from/to, order durationMs desc, summary top-10 by max
// duration). Optimasi: index di prisma/schema.prisma sudah menutup query umum
// (records, audit, notification, backup) — untuk query yang muncul berulang,
// periksa EXPLAIN ANALYZE dulu sebelum menambah index baru.
const SLOW_QUERY_THRESHOLD_MS = 1000;

// PostgreSQL aman:
// 1) Query SELALU parameterized (Prisma prepared statement $n) — tidak ada
//    pemakaian raw-query unsafe di repo (dijamin test pentest).
// 2) Kredensial hanya di .env (gitignored); jangan commit DATABASE_URL.
// 3) SSL: produksi HARUS sslmode=require (atau verify-full) di connection
//    string — tanpa itu kredensial dikirim plaintext di jaringan.
//    .env.example sudah memuat ?sslmode=require; cek .env aktual.
if (
  process.env.NODE_ENV === "production" &&
  process.env.DATABASE_URL &&
  !/sslmode=/.test(process.env.DATABASE_URL)
) {
  console.warn(
    "[prisma] DATABASE_URL tanpa sslmode — koneksi PostgreSQL TIDAK terenkripsi. " +
      "Tambahkan ?sslmode=require (atau verify-full) di connection string produksi."
  );
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Helper slow-query: terima client apa pun (struktural, cast internal) supaya
// tidak bergantung pada varian generik $extends Prisma.
function registerSlowQueryLogging(client: unknown): void {
  const c = client as {
    $on(
      event: "query",
      callback: (e: { duration: number; query: string; params: unknown[]; target: unknown }) => void
    ): void;
    slowQueryLog: {
      create(args: { data: { query: string; durationMs: number; metadata: unknown } }): Promise<unknown>;
    };
  };
  c.$on("query", (event) => {
    if (event.duration < SLOW_QUERY_THRESHOLD_MS) return;
    if (event.query.includes("slow_query_logs")) return;
    void c.slowQueryLog
      .create({
        data: {
          query: event.query,
          durationMs: Math.round(event.duration),
          // REDAKSI: simpan JUMLAH parameter, bukan nilai aktual — nilai query
          // (email, id, dst) tidak boleh disimpan di tabel log (kebocoran data
          // lewat /api/slow-queries). Debug nilai: hidupkan log Prisma lokal.
          metadata: { paramCount: event.params.length, target: event.target },
        },
      })
      .catch(() => {});
  });
}

registerSlowQueryLogging(prisma);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
