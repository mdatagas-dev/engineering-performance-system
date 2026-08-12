// Util tanggal murni untuk dashboard — semua bekerja pada string YYYY-MM-DD
// (format sama dengan kolom date mock/backend) supaya bebas timezone & mudah
// di-test. Tidak ada dependency window/document.

const DAY_MS = 86_400_000;

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ISO hari ini; param clock (Date) membolehkan test memakai tanggal tetap.
export function todayIso(now?: Date): string {
  return toIsoDate(now ?? new Date());
}

// Geser tanggal ISO sejumlah hari; delta negatif = mundur (untuk varian tren).
export function addDays(iso: string, delta: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + delta * DAY_MS));
}