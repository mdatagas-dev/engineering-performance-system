// Pure parser user-agent (Manajemen Sesi, phase 5 backend). Regex sederhana
// tanpa library; device/browser/os diparse di layer API, bukan kolom DB
// (keputusan task tabel sesi). Dipakai GET /api/auth/sessions.
export type ParsedUserAgent = {
  device: "Smartphone" | "Tablet" | "Laptop";
  browser: string;
  os: string;
};

// Urutan penting: Edge/Opera/Samsung sebelum Chrome (UA-nya memuat "Chrome"),
// Safari paling akhir (UA Chrome memuat "Safari").
const BROWSERS: [RegExp, string][] = [
  [/edg(?:e|a|ios)?\//i, "Edge"],
  [/opr\//i, "Opera"],
  [/opera\//i, "Opera"],
  [/samsungbrowser\//i, "Samsung Internet"],
  [/chrome\//i, "Chrome"],
  [/firefox\//i, "Firefox"],
  [/safari\//i, "Safari"],
];

const OSES: [RegExp, string][] = [
  [/windows phone/i, "Windows Phone"],
  [/windows nt/i, "Windows"],
  [/iphone|ipod/i, "iOS"],
  [/ipad/i, "iOS"],
  [/android/i, "Android"],
  // iPhone/iPad UA memuat "like Mac OS X" — cek iOS dulu, mac belakangan.
  [/mac os x|macintosh/i, "macOS"],
  [/crOS/i, "ChromeOS"],
  [/linux/i, "Linux"],
];

export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const raw = ua?.trim();
  if (!raw) return { device: "Laptop", browser: "Unknown", os: "Unknown" };

  const device =
    /iphone|ipod/i.test(raw) || (/android/i.test(raw) && /mobile/i.test(raw))
      ? "Smartphone"
      : /ipad|android|tablet/i.test(raw)
        ? "Tablet"
        : "Laptop";

  const browser = BROWSERS.find(([re]) => re.test(raw))?.[1] ?? "Unknown";
  const os = OSES.find(([re]) => re.test(raw))?.[1] ?? "Unknown";
  return { device, browser, os };
}
