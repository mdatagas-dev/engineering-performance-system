// Format angka Tabel Produksi Harian — murni & testable (format Excel/PRD):
// desimal pakai koma (locale id-ID), UPPH & GAP selalu 2 desimal, kolom lain
// 0–2 desimal tanpa pembulatan ulang nilai yang sudah dihitung calculate.ts
// (nilai yang masuk sudah round2 dari lib/records/calculate.ts). null → "—".

const ID_ID_LOCALE = "id-ID";

const EXACT = new Intl.NumberFormat(ID_ID_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const AUTO = new Intl.NumberFormat(ID_ID_LOCALE, {
  maximumFractionDigits: 2,
});

// 2 desimal tetap — GAP (UPH/HC/OP) & UPPH. null → "—".
export function formatDecimal(value: number | null): string {
  if (value === null) return "—";
  return EXACT.format(value);
}

// 0–2 desimal — UPH, HC, Plan, Output, Setup, Working Hour. null → "—".
export function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return AUTO.format(value);
}

function parseDate(date: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// "2026-08-12" → "12 Agustus 2026" (id-ID, tanpa hari).
export function formatDateShort(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat(ID_ID_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

// "2026-08-12" → "Rabu, 12 Agustus 2026" (id-ID, dengan hari untuk header grup).
export function formatDateLong(date: string): string {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return new Intl.DateTimeFormat(ID_ID_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}