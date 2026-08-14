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
    <div className="gate-root">
      <div
        className="gate-dialog gate-dialog--open gate-dialog--lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-title"
      >
        <div className="gate-titlebar">
          <span className="gate-titlebar__icon" aria-hidden="true">
            🖥
          </span>
          <span id="fp-title">Recovery — GAS ELECTRONIC Suite</span>
        </div>
        <div className="gate-dialog__body">
          {sent ? (
            <>
              <div className="gate-row">
                <span className="gate-msg__glyph" aria-hidden="true">
                  🖥
                </span>
                <div>
                  <p className="gate-msg gate-msg--ok" role="status">
                    Pesan terkirim
                  </p>
                  <p className="gate-msg">
                    Jika email terdaftar, instruksi reset password telah dikirim ke inbox Anda.
                  </p>
                </div>
              </div>
              <div className="gate-actions">
                <Link href="/login" className="gate-btn gate-btn--default gate-btn-link" title="Kembali ke login">
                  OK
                </Link>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="gate-msg gate-msg--err" role="alert">
                  <div className="gate-msg__head">⚠ Error</div>
                  <div>{error}</div>
                </div>
              )}
              <div className="gate-row">
                <span className="gate-msg__glyph" aria-hidden="true">
                  🖥
                </span>
                <p className="gate-msg">
                  Masukkan email akun Anda. Instruksi reset password akan dikirim — alur tiruan,
                  tidak ada email sungguhan yang dikirim.
                </p>
              </div>
              <label className="gate-field" htmlFor="fp-email">
                Email:
                <input
                  id="fp-email"
                  className="gate-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="nama@perusahaan.com"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "fp-error" : undefined}
                />
                {error && (
                  <span id="fp-error" className="gate-field__error" role="alert">
                    {error}
                  </span>
                )}
              </label>
              <div className="gate-actions">
                <button type="submit" className="gate-btn gate-btn--default" title="Kirim instruksi reset">
                  OK
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <p className="gate-backlink">
        <Link href="/login">← Kembali ke login</Link>
      </p>
    </div>
  );
}
