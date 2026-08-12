"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getMenuFor } from "@/lib/auth/menu";
import {
  loginMockAccount,
  loadMockSession,
  saveMockSession,
  mockAccounts,
  getMockLock,
  getMockRateLimitRemaining,
  MOCK_LOGIN_ERROR,
  MOCK_INACTIVE_MESSAGE,
  MOCK_RATE_LIMITED_MESSAGE,
} from "@/lib/mocks/accounts";
import { withExpiry } from "@/lib/mocks/session";
import LockoutNotice from "@/components/lockout-notice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MANUFACTURE_QUOTES: { quote: string; author: string }[] = [
  { quote: "Kualitas bukanlah suatu tindakan, melainkan sebuah kebiasaan.", author: "Aristoteles" },
  { quote: "Kesempurnaan tidak dapat dicapai, tetapi jika kita mengejarnya, kita dapat mencapai keunggulan.", author: "Vince Lombardi" },
  { quote: "Kualitas yang sesungguhnya berarti melakukan yang benar, ketika tidak ada yang mengawasi.", author: "Henry Ford" },
  { quote: "Perbaikan terus-menerus lebih baik daripada kesempurnaan yang tertunda.", author: "Mark Twain" },
  { quote: "Cara terbaik untuk memprediksi masa depan adalah dengan menciptakannya.", author: "Peter Drucker" },
  { quote: "Kesederhanaan adalah kecanggihan tertinggi.", author: "Leonardo da Vinci" },
];

const ROLE_META: Record<string, { label: string; desc: string }> = {
  SUPER_ADMIN: { label: "Super Admin", desc: "Akses penuh seluruh sistem & konfigurasi." },
  ADMIN: { label: "Admin", desc: "Kelola pengguna, audit, dan pengaturan." },
  ENGINEERING_MANAGER: { label: "Engineering Manager", desc: "Persetujuan, lock record, KPI & ekspor." },
  ENGINEERING_STAFF: { label: "Engineering Staff", desc: "Input data produksi harian." },
  VIEWER: { label: "Viewer", desc: "Lihat dashboard & ekspor saja." },
};

const ROLE_ORDER = ["SUPER_ADMIN", "ADMIN", "ENGINEERING_MANAGER", "ENGINEERING_STAFF", "VIEWER"];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>("SUPER_ADMIN");
  // Lockout tiruan: waktu berakhir (epoch ms) saat akun demo terkunci; null = bebas.
  const [lockEnd, setLockEnd] = useState<number | null>(null);
  // Rate limit global tiruan: waktu berakhir (epoch ms) saat semua percobaan diblokir.
  const [rateLimitEnd, setRateLimitEnd] = useState<number | null>(null);

  // ?expired=1 di-set guard sesi saat timeout → tampilkan pesan "sesi berakhir".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpired(new URLSearchParams(window.location.search).has("expired"));
  }, []);

  // Sudah punya sesi lokal (mock) → langsung ke /.
  useEffect(() => {
    if (loadMockSession()) router.replace("/");
  }, [router]);

  // Rotasi kutipan tiap 2 menit.
  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % MANUFACTURE_QUOTES.length);
    }, 2 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  function validate(): boolean {
    const next: { email?: string; password?: string } = {};
    if (!email.trim()) next.email = "Email wajib diisi.";
    else if (!EMAIL_RE.test(email.trim())) next.email = "Format email tidak valid.";
    if (!password) next.password = "Password wajib diisi.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function refreshLock(email: string) {
    const lock = getMockLock(email);
    const until = lock?.lockedUntil ? new Date(lock.lockedUntil).getTime() : 0;
    setLockEnd(until > Date.now() ? until : null);
  }

  function refreshRateLimit() {
    const remaining = getMockRateLimitRemaining();
    setRateLimitEnd(remaining !== null ? Date.now() + remaining : null);
  }

  const locked = lockEnd !== null;
  const rateLimited = rateLimitEnd !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (locked || rateLimited) return;
    if (!validate()) return;
    setLoading(true);

    // 1) Coba API live (backend real sudah ada DB). Kalau gagal → fallback mock.
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe }),
      });

      if (res.ok) {
        const data = await res.json();
        // Simpan sesi lokal agar guard / konsisten (localStorage = carrier sesi frontend).
        const session = withExpiry(
          {
            user: data.user,
            menu: getMenuFor({ role: data.user.role.name, permissions: data.user.permissions }),
          },
          rememberMe
        );
        saveMockSession(session);
        router.replace("/");
        return;
      }

      // 401/403 = keputusan backend sungguhan → jangan fallback.
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? MOCK_LOGIN_ERROR);
        return;
      }
      // Selain itu (500/no DB) → lanjut fallback mock.
    } catch {
      // Network error → fallback mock.
    }

    // 2) Fallback: akun seed tiruan (staff@eps.local / Staff123!, dsb) atau
    // user override buatan via /users (eps_mock_users).
    const result = loginMockAccount(email, password, rememberMe);
    if (!result.ok) {
      if (result.reason === "locked") refreshLock(email);
      else if (result.reason === "rate_limited") refreshRateLimit();
      else if (result.reason === "inactive") setError(MOCK_INACTIVE_MESSAGE);
      else setError(MOCK_LOGIN_ERROR);
      setLoading(false);
      return;
    }
    saveMockSession(result.session);
    router.replace("/");
  }

  // Masuk cepat via tombol role (mode tiruan) — langsung pakai akun demo role tsb.
  function mockLogin(role: string) {
    const account = mockAccounts.find((a) => a.role === role);
    if (!account) return;
    const result = loginMockAccount(account.email, account.password, false);
    if (!result.ok) {
      if (result.reason === "locked") refreshLock(account.email);
      else if (result.reason === "rate_limited") refreshRateLimit();
      else if (result.reason === "inactive") setError(MOCK_INACTIVE_MESSAGE);
      else setError(MOCK_LOGIN_ERROR);
      return;
    }
    saveMockSession(result.session);
    router.replace("/");
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#00b3ac] focus:ring-2 focus:ring-[#00b3ac]/30 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradasi bergerak pelan */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, #0a2f33 0%, #123b49 20%, #1e2a5e 45%, #3b1e4e 70%, #4b2a63 85%, #0a2f33 100%)",
          backgroundSize: "300% 300%",
          animation: "gradient-shift 18s ease-in-out infinite",
        }}
      />
      <div className="absolute inset-0 bg-[#0a0f15]/45" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* ===== KIRI: kata mutiara (lebih besar) ===== */}
        <div className="flex flex-[1.3] flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
          <div className="mb-12 flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-[#00b3ac] to-[#0e7490] font-mono text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
              EPS
            </span>
            <div className="text-left leading-tight">
              <p className="text-3xl font-semibold tracking-tight text-white">EPS</p>
              <p className="text-sm text-white/70">Engineering Production System</p>
            </div>
          </div>

          <blockquote className="max-w-2xl">
            <div key={quoteIdx} className="anim-fade-in">
              <p className="font-sans text-4xl font-medium leading-snug text-white lg:text-5xl xl:text-[3.4rem]">
                &ldquo;{MANUFACTURE_QUOTES[quoteIdx].quote}&rdquo;
              </p>
              <footer className="mt-6 flex items-center gap-3">
                <span className="h-px w-12 bg-white/40" />
                <cite className="text-base text-white/80 not-italic">{MANUFACTURE_QUOTES[quoteIdx].author}</cite>
              </footer>
            </div>
            <div className="mt-8 flex items-center gap-2">
              {MANUFACTURE_QUOTES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuoteIdx(i)}
                  aria-label={`Kutipan ${i + 1}`}
                  className={
                    i === quoteIdx
                      ? "h-2 w-8 rounded-full bg-white transition-all duration-300"
                      : "h-2 w-2 rounded-full bg-white/30 transition-all duration-300 hover:bg-white/50"
                  }
                />
              ))}
              <span className="ml-2 font-mono text-xs text-white/40">
                {String(quoteIdx + 1).padStart(2, "0")}/{MANUFACTURE_QUOTES.length}
              </span>
            </div>
          </blockquote>
        </div>

        {/* ===== KANAN: form login ===== */}
        <div className="flex w-full items-center justify-end px-4 pb-12 lg:w-[500px] lg:pr-16 xl:pr-24">
          <div className="anim-fade-up w-full max-w-md">
            <div className="rounded-2xl bg-white p-8 shadow-2xl sm:p-10">
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-neutral-900">Selamat Datang</h1>
                <p className="mt-1 text-sm text-neutral-500">Masuk ke Engineering Production System.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {expired && (
                  <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                    Sesi Anda telah berakhir. Silakan login kembali.
                  </p>
                )}
                {locked && <LockoutNotice lockedUntil={lockEnd} onCountdownEnd={() => setLockEnd(null)} />}
                {rateLimited && (
                  <LockoutNotice
                    lockedUntil={rateLimitEnd}
                    message={MOCK_RATE_LIMITED_MESSAGE}
                    onCountdownEnd={() => setRateLimitEnd(null)}
                  />
                )}
                {error && !locked && !rateLimited && (
                  <p role="alert" aria-live="assertive" className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    disabled={loading}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={inputClass}
                  />
                  {errors.email && (
                    <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-3.5 w-3.5 rounded accent-[#00b3ac]"
                    />
                    Remember Me
                  </label>
                  <Link href="/forgot-password" className="font-medium text-[#009a94] hover:underline">
                    Forgot Password
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading || locked || rateLimited}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00b3ac] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#009a94] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M2 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    </svg>
                  )}
                  Masuk
                </button>
              </form>

              <p className="mt-8 text-center text-xs font-medium tracking-wide text-black/70">
                Engineering Production System · v1.0.0
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
                  <path d="M15 3h4a1 1 0 0 1 1 1v4" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                <h2 className="text-sm font-semibold text-neutral-800">Masuk cepat (mode tiruan)</h2>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Pilih peran untuk masuk langsung dengan akun demo sesuai level aksesnya.
              </p>
              <div className="mt-4 space-y-2">
                {ROLE_ORDER.map((role) => {
                  const meta = ROLE_META[role];
                  const account = mockAccounts.find((a) => a.role === role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        selectedRole === role
                          ? "border-[#00b3ac] bg-[#00b3ac]/10 ring-2 ring-[#00b3ac]/20"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`h-5 w-5 shrink-0 ${selectedRole === role ? "text-[#00b3ac]" : "text-neutral-400"}`}
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                      </svg>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-neutral-800">{meta.label}</span>
                        <span className="block text-[11px] text-neutral-500">{meta.desc}</span>
                      </span>
                      {account && (
                        <span className="font-mono text-[10px] text-neutral-400">
                          {account.email}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => mockLogin(selectedRole)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a1 1 0 0 1 1 1v4" />
                  <path d="M10 14 21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                Masuk sebagai {ROLE_META[selectedRole]?.label}
              </button>
              <p className="mt-3 text-center text-[11px] text-neutral-400">
                Akun demo contoh: staff@eps.local / Staff123!, admin@eps.local / Admin123!.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
