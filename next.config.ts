import type { NextConfig } from "next";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Security headers — fase 5 "Keamanan Lapis Baja" (XSS + hardening respons).
// Diterapkan global di semua rute (halaman + API) via headers() Next.js.
//
// CSP — keputusan: default-src 'self' + script-src dengan 'unsafe-inline'
// dan 'unsafe-eval', style-src 'unsafe-inline'. ALASAN:
// 1) app/layout.tsx memuat script theme-init via dangerouslySetInnerHTML
//    (inline <script>) — tanpa 'unsafe-inline' halaman mati (blank/dark-mode
//    broken). File ini di app/** (domain frontend), bukan untuk diubah di sini.
// 2) Next dev (HMR jalan di port 3050) menginjeksi inline script + eval untuk
//    hot-reload & source map.
// 3) Next.js production menderetkan beberapa inline script (hydration payload
//    streaming) — menghapus unsafe-inline butuh mekanisme nonce penuh.
// CSP nonce (pendekatan "benar") sengaja TIDAK dipasang: nonce butuh middleware/
// rewrite infra + sinkronisasi dengan inline <script> statis layout.tsx yang
// tidak melewati nonce — kompleksitas tinggi, benefit marjinal untuk app
// internal single-origin ini. Migrasi bertahap: hapus unsafe-eval saat sudah
// menjalankan prod-only dan verifikasi; unsafe-inline script perlu refactor
// layout.tsx ke strategi nonce oleh pemilik frontend.
//
// HSTS: hanya di production (NODE_ENV=production) — di dev (http://localhost:
// 3030) header HSTS justru berbahaya (browser menolak/memaksa https ke local).
// https://localhost + HSTS tanpa sertifikat = halaman tidak bisa diakses.

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
    ].join("; "),
  },
];

const HSTS_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Deploy Docker memakai build standalone (lihat Dockerfile): next build
  // menghasilkan .next/standalone/server.js yang jalan dgn `node server.js`
  // tanpa butuh node_modules lengkap. Mode ini juga memperkecil image.
  output: "standalone",
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...(IS_PRODUCTION ? [{ source: "/:path*", headers: HSTS_HEADERS }] : []),
    ];
  },
};

export default nextConfig;