// UUID v4 aman di semua origin. crypto.randomUUID hanya tersedia di secure
// context (HTTPS/localhost) — di HTTP LAN non-localhost ia undefined dan
// mematikan halaman. Fallback Math.random cukup untuk id mock frontend.
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
