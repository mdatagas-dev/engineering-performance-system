// Shape meniru respons backend yang akan datang: GET /api/auth/sessions
// (frontend-first; backend belum punya tabel Session, jadi logout all belum bisa sungguhan).
export type MockActiveSession = {
  id: string;
  device: string; // "Laptop" | "Smartphone" | "Tablet"
  browser: string;
  os: string;
  ip: string;
  location?: string;
  createdAt: string; // ISO
  lastActiveAt: string; // ISO
  isCurrent: boolean;
};

export const SESSIONS_KEY = "eps_mock_sessions";

const now = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString();

export function currentMockSession(): MockActiveSession {
  return {
    id: "sess_current_001",
    device: "Laptop",
    browser: "Chrome",
    os: "Linux",
    ip: "103.104.5.12",
    location: "Jakarta, ID",
    createdAt: new Date().toISOString(),
    lastActiveAt: now(0),
    isCurrent: true,
  };
}

// 1-2 sesi tiruan: sesi perangkat ini (Chrome on Linux) + 1 "dari perangkat lain".
export function defaultMockSessions(): MockActiveSession[] {
  return [
    currentMockSession(),
    {
      id: "sess_mobile_042",
      device: "Smartphone",
      browser: "Firefox",
      os: "Android",
      ip: "114.10.88.201",
      location: "Surabaya, ID",
      createdAt: now(0),
      lastActiveAt: now(27),
      isCurrent: false,
    },
  ];
}

export function loadMockSessions(): MockActiveSession[] {
  if (typeof window === "undefined") return defaultMockSessions();
  const raw = window.localStorage.getItem(SESSIONS_KEY);
  if (!raw) return defaultMockSessions();
  try {
    const parsed = JSON.parse(raw) as MockActiveSession[];
    return Array.isArray(parsed) ? parsed : defaultMockSessions();
  } catch {
    return defaultMockSessions();
  }
}

export function saveMockSessions(list: MockActiveSession[]): void {
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
}

export function clearMockSessions(): void {
  window.localStorage.removeItem(SESSIONS_KEY);
}

// Setelah sesi saat ini di-logout, pastikan ada lagi entry isCurrent saat user masuk ulang.
export function ensureMockSessions(list: MockActiveSession[]): MockActiveSession[] {
  if (list.some((s) => s.isCurrent)) return list;
  return [currentMockSession(), ...list];
}
