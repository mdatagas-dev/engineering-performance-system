"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import LoginVideoBackground from "@/components/login-video-background";
import { getMenuFor } from "@/lib/auth/menu";
import { loadMockSession, saveMockSession } from "@/lib/mocks/accounts";
import { withExpiry } from "@/lib/mocks/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MANUFACTURE_QUOTES: { quote: string; author: string }[] = [
  { quote: "Kualitas bukanlah suatu tindakan, melainkan sebuah kebiasaan.", author: "Aristoteles" },
  { quote: "Kesempurnaan tidak dapat dicapai, tetapi jika kita mengejarnya, kita dapat mencapai keunggulan.", author: "Vince Lombardi" },
  { quote: "Kualitas yang sesungguhnya berarti melakukan yang benar, ketika tidak ada yang mengawasi.", author: "Henry Ford" },
  { quote: "Perbaikan terus-menerus lebih baik daripada kesempurnaan yang tertunda.", author: "Mark Twain" },
  { quote: "Cara terbaik untuk memprediksi masa depan adalah dengan menciptakannya.", author: "Peter Drucker" },
  { quote: "Kesederhanaan adalah kecanggihan tertinggi.", author: "Leonardo da Vinci" },
];

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

  // ?expired=1 di-set guard sesi saat timeout → tampilkan pesan "sesi berakhir".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpired(new URLSearchParams(window.location.search).has("expired"));
  }, []);

  // Sudah punya sesi lokal → langsung ke /.
  useEffect(() => {
    if (loadMockSession()) router.replace("/home");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);

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
        router.replace("/home");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Email atau password salah.");
    } catch {
      setError("Gagal terhubung ke server. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/25 bg-white/10 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#00b3ac] focus:ring-2 focus:ring-[#00b3ac]/40 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video background: Blue Wave Particles — loop seamless via crossfade */}
      <LoginVideoBackground />
      <div className="absolute inset-0 bg-[#0a0f15]/45" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* ===== KIRI: kata mutiara (lebih besar) ===== */}
        <div className="flex flex-[1.3] flex-col justify-center px-8 py-12 lg:px-16 xl:px-24">
          <div className="mb-12 flex items-center gap-4">
            <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-xl shadow-lg shadow-cyan-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
            </span>
            <div className="text-left leading-tight">
              <p className="text-3xl font-semibold tracking-tight text-white">GAS ELECTRONIC</p>
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
            <div className="relative rounded-2xl border border-white/20 bg-white/[0.08] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-10">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-white/[0.03]" />
              <div className="relative">
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-white">Selamat Datang</h1>
                  <p className="mt-1 text-sm text-white/70">Masuk ke Engineering Production System.</p>
                </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {expired && (
                  <p role="alert" className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-2.5 text-sm text-amber-200">
                    Sesi Anda telah berakhir. Silakan login kembali.
                  </p>
                )}
                {error && (
                  <p role="alert" aria-live="assertive" className="rounded-lg border border-red-300/40 bg-red-500/15 px-4 py-2.5 text-sm text-red-200">
                    {error}
                  </p>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/80">
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
                    <p id="email-error" role="alert" className="mt-1 text-xs text-red-300">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/80">
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
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
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
                    <p id="password-error" role="alert" className="mt-1 text-xs text-red-300">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex cursor-pointer items-center gap-2 text-white/70">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-3.5 w-3.5 rounded accent-[#00b3ac]"
                    />
                    Remember Me
                  </label>
                  <Link href="/forgot-password" className="font-medium text-[#4dd8d2] hover:underline">
                    Forgot Password
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
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

              <p className="mt-8 text-center text-xs font-medium tracking-wide text-white/50">
                Engineering Production System · v1.0.0
              </p>
              </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
