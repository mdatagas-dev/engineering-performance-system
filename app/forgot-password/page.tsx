"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email wajib diisi.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Format email tidak valid.");
      return;
    }
    setError(null);
    setSent(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-800 font-mono text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
            EPS
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Lupa Password</h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Engineering Production System — reset password (tiruan)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="glass-card flex flex-col gap-4 p-6">
          {sent ? (
            <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-400">
              Jika email terdaftar, instruksi reset password telah dikirim ke inbox Anda.
            </p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Masukkan email akun Anda. Kami akan mengirim tautan untuk mereset password (alur tiruan — tidak ada email sungguhan yang dikirim).
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "email-error" : undefined}
                  className="w-full rounded-lg border border-slate-950/15 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500"
                />
                {error && (
                  <p id="email-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="mt-1 w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90"
              >
                Kirim Instruksi Reset
              </button>
            </>
          )}
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Ingat password?{" "}
          <Link href="/login" className="font-medium text-cyan-700 hover:underline dark:text-cyan-400">
            Kembali ke login
          </Link>
        </p>
      </div>
    </div>
  );
}
