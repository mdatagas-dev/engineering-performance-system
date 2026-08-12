// Proteksi CSRF (Cross-Site Request Forgery) — lapisan tambahan di proxy.ts.
//
// STRATEGI (fase 5 "Keamanan Lapis Baja"):
// 1) Pertahanan utama: cookie sesi SameSite=Lax (lib/auth/config.ts) — browser
//    tidak mengirim cookie pada permintaan lintas-situs untuk method mutasi.
// 2) Lapisan kedua (di sini): validasi Origin/Referer terhadap Host di proxy.ts
//    untuk method unsafe (POST/PUT/PATCH/DELETE). Menutup celah skenario di
//    mana SameSite=Lax tidak memadai: request lintas-situs yang TIDAK memakai
//    cookie sesi (login CSRF), subdomain lain yang sudah punya sesi (SOP
//    santai), plugin/ekstensi, dan klien lama yang mengabaikan SameSite.
// 3) Double-submit cookie TIDAK dipasang (sengaja): semua API mutasi aplikasi
//    menerima JSON via fetch yang dikirim browser dengan Origin absen pada
//    navigasi top-level & sinkron (null Origin) pada beberapa skenario
//    sandbox. Tambahan token hanya menambah luas permukaan (token bocor via
//    log/extension) tanpa manfaat nyata di atas SameSite=Lax + Origin check
//    yang sudah menolak lintas-situs secara pasti. (Keputusan ini sama dengan
//    arah OWASP: SameSite + Origin/Referer validation adalah pertahanan CSRF
//    modern yang disarankan; token dipakai hanya bila API publik lintas-situs
//    diperlukan — tidak terjadi di aplikasi ini.)
//
// ATURAN (sesuai keputusan task): method unsafe + Origin header ADA →
// host(Origin) HARUS sama dengan host request; Origin tak ada (curl / klien
// non-browser) → kalau Referer ada, host(Referer) dicek; keduanya tidak ada
// → izinkan (tooling lokal). Host header tidak bisa diparsing → tolak
// (defensif: tanpa acuan host yang sah, klaim asal tidak bisa diverifikasi).
//
// Normalisasi host:
// - tanpa www-normalization: www.example.com ≠ example.com (subdomain adalah
//   origin berbeda — me-strip www justru membuka CSRF dari www ke root).
// - port: perbandingan "eksplisit-aware" — port yang TERTULIS dibandingkan
//   dengan effective port (default skema http=80/https=443) sisi lain; Host
//   header tanpa port tidak diasumsikan http:80 supaya https://x tidak
//   salah-tolak terhadap Host "x". Lihat isSameHost.
// - hostname lowercase + ignor FQDN trailing dot (example.com. = example.com);
//   IPv6 didukung bracket (host header "[::1]:3030", origin
//   "http://[::1]:3030").
// - skema/userinfo/path/query diabaikan (hanya hostname+port yang dibandingkan).

export const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DEFAULT_PORTS: Record<string, number> = { http: 80, https: 443 };

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

export type ParsedHost = {
  /** hostname lowercase, tanpa bracket IPv6, tanpa trailing dot */
  hostname: string;
  /** skema URL (untuk resolusi default port) */
  scheme: string;
  /** port eksplisit yang tertulis di input; null = tidak ada */
  port: number | null;
};

export function isUnsafeMethod(method: string): boolean {
  return UNSAFE_METHODS.has(method.toUpperCase());
}

// Parse referensi host (URL absolut ber-skema, URL tanpa skema, atau Host
// header) menjadi komponen normal, memakai standard URL (node). Semua wire
// format yang valid dari browser (Origin/Referer/ Host header) ter-cover;
// masukan sampah → null.
export function parseHost(reference: string | null | undefined): ParsedHost | null {
  if (reference == null) return null;
  const trimmed = reference.trim();
  if (!trimmed) return null;
  const withScheme = HAS_SCHEME.test(trimmed) ? trimmed : `http://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!url.hostname) return null;
  // URL (WHATWG) mengembalikan hostname IPv6 DALAM bracket ("[::1]") —
  // normalisasi ke bentuk telanjang supaya perbandingan bebas bracket.
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("[") && hostname.endsWith("]")) hostname = hostname.slice(1, -1);
  if (hostname.endsWith(".")) hostname = hostname.slice(0, -1);
  return {
    hostname,
    scheme: url.protocol.replace(/:$/, ""),
    port: url.port ? Number(url.port) : null,
  };
}

// Bentuk string kanonik host untuk log/tests: "hostname" | "hostname:port",
// IPv6 memakai bracket. Null = tak ter-parse.
export function extractHost(reference: string | null | undefined): string | null {
  const parsed = parseHost(reference);
  if (!parsed) return null;
  const display = parsed.hostname.includes(":") ? `[${parsed.hostname}]` : parsed.hostname;
  return parsed.port === null ? display : `${display}:${parsed.port}`;
}

function effectivePort(parsed: ParsedHost): number | null {
  return parsed.port ?? DEFAULT_PORTS[parsed.scheme] ?? null;
}

// Dua referensi host dianggap SAMA origin bila hostname sama. Port: aturan
// "satu sisi eksplisit" — port tak tertulis TIDAK diasumsikan (Host header
// tanpa port ambigu: bisa http:80 maupun https:443 di belakang proxy), jadi:
// - keduanya eksplisit → harus sama;
// - satu sisi eksplisit → harus sama dengan effective port (default skema)
//   sisi lainnya (contoh: origin https://x cocok dengan Host "x" — keduanya
//   tanpa port → sama; origin http://x:80 cocok dengan Host "x");
// - keduanya non-eksplisit → sama (hostname sudah dibandingkan).
export function isSameHost(a: ParsedHost, b: ParsedHost): boolean {
  if (a.hostname !== b.hostname) return false;
  if (a.port !== null && b.port !== null) return a.port === b.port;
  if (a.port !== null) return a.port === effectivePort(b);
  if (b.port !== null) return b.port === effectivePort(a);
  return true;
}

// Keputusan CSRF method unsafe terhadap satu request.
// - false bila host request tak ter-parse (defensif: tolak).
// - Origin + Referer sama-sama ada → Origin dipakai (more authoritative di
//   spec Fetch; navigasi lintas-situs mengirim Origin pada method unsafe).
// - Origin kosong → Referer; keduanya tidak ada → izinkan (curl/dev tools).
// - Sumber yang tak ter-parse (mis. literal "null") → tolak (tidak bisa
//   diverifikasi, dan "null" justru tanda eksekusi sandbox/redirect).
export function isAllowedOrigin(
  origin: string | null | undefined,
  referer: string | null | undefined,
  hostHeader: string | null | undefined
): boolean {
  const host = parseHost(hostHeader);
  if (!host) return false;

  const sourcePick = (v: string | null | undefined): string | null => {
    const t = v?.trim();
    return t ? t : null;
  };
  const source = sourcePick(origin) ?? sourcePick(referer);
  if (source === null) return true;

  const sourceHost = parseHost(source);
  if (!sourceHost) return false;
  return isSameHost(sourceHost, host);
}