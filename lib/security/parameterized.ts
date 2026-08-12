// Parameterized query & pencegahan SQL injection — fase 5 "Keamanan Lapis
// Baja". Ini bukan kode rahasia: constant dokumentasi + helper deteksi yang
// dipakai test untuk MENGUNCI (regression guard) bahwa tidak ada raw query
// yang lolos ke repo.
//
// GARANSI (Prisma 7):
// 1) SELURUH akses DB memakai Prisma Client (lib/prisma.ts, driver adapter
//    @prisma/adapter-pg, tipikal PrismaClient di app/api/**). Prisma
//    mengkompilasi setiap query ke prepared statement: SQL dikirim terpisah
//    dari nilai parameter (placeholder $n) di wire protocol PostgreSQL —
//    input user tidak pernah digabung ke teks SQL, sehingga SQL injection
//    menjadi mustahil pada lapisan ini. Query lambat yang tercatat hook
//    lib/prisma.ts menampilkan `query` dengan placeholder $n; nilai parameter DIREDAKSI (paramCount saja)
//    (nilai terpisah) — bukti parameterisasi pada jalur produksi.
// 2) API escape-hatch literal yang TIDAK parameterized (`$queryRawUnsafe(`
//    / `$executeRawUnsafe(`) DILARANG: tidak pernah dipakai, dan
//    parameterized.test.ts (scan repo atas literal tersebut di lib/ + app/api/)
//    menegakkan larangan ini — test gagal bila ada yang muncul. Kalau suatu
//    saat benar-benar butuh raw SQL, gunakan `$queryRaw`/`$executeRaw`
//    (template tag yang TETAP parameterized) dengan nilai lewat placeholder.
// 3) Validasi input lapisan kedua tetap berlaku di layer aplikasi (trim,
//    type check, enum/whitelist di route) — parameterisasi mencegah injeksi,
//    bukan menggantikan validasi semantik.

export const PARAMETERIZED_GUARANTEES = {
  engine: "Prisma 7 Client (adapter @prisma/adapter-pg) — prepared statements",
  evidence:
    "slowQueryLog metadata.paramCount (nilai parameter diredaksi) + query memakai placeholder $n",
  forbiddenMarkers: ["$queryRawUnsafe", "$executeRawUnsafe"],
  allowedRawApi: ["$queryRaw", "$executeRaw"],
} as const;

// Pure helper: kembalikan daftar marker raw-SQL yang muncul dalam teks kode.
// Dipakai parameterized.test.ts untuk scan file secara deklaratif.
export function findRawSqlUsages(code: string): string[] {
  const found: string[] = [];
  for (const marker of PARAMETERIZED_GUARANTEES.forbiddenMarkers) {
    if (code.includes(marker)) found.push(marker);
  }
  return found;
}