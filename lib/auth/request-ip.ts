// IP klien dari request — aman dari spoofing X-Forwarded-For.
//
// Header x-forwarded-for/x-real-ip TIDAK bisa dipercaya dari klien langsung:
// attacker bisa set header palsu untuk bypass rate limit per-IP / audit trail.
// Hanya percaya header bila aplikasi berada DI BELAKANG proxy terpercaya yang
// menimpa header tersebut. Konfigurasi: env TRUSTED_PROXIES (comma-separated
// IP proxy, mis. "127.0.0.1" untuk nginx lokal). Tanpa konfigurasi → null
// (rate limit per-IP nonaktif & audit ip kosong — lebih aman daripada IP palsu).
export function getClientIp(req: Request): string | null {
  const trusted = (process.env.TRUSTED_PROXIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (trusted.length === 0) return null;
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    null
  );
}
