"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

export type LoginGateProps = {
  /** Kirim kredensial. Return null = sukses; string = pesan error (Access Denied). */
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<string | null>;
  /** Dipanggil setelah sukses + animasi "System Ready" (page akan redirect ke /home). */
  onSuccess: () => void;
  /** Pesan awal opsional (mis. "Sesi Anda telah berakhir" saat ?expired=1). */
  initialMessage?: string;
  /** Kalau true (sudah ada sesi) → tampilkan "Sudah masuk" + tombol lanjut → onSuccess. */
  alreadyIn?: boolean;
};

type Phase = "boot" | "idle" | "checking" | "denied" | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const pad = (n: number) => String(n).padStart(2, "0");

function GateClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <time className="gate-clock" suppressHydrationWarning>
      {pad(now.getHours())}:{pad(now.getMinutes())}
    </time>
  );
}

function GateAvatar({ size = 40 }: { size?: number }): ReactNode {
  return <span className="gate-avatar" aria-hidden="true" style={{ width: size, height: size }} />;
}

export default function LoginGate({
  onLogin,
  onSuccess,
  initialMessage,
  alreadyIn,
}: LoginGateProps): ReactNode {
  const [phase, setPhase] = useState<Phase>(alreadyIn ? "idle" : "boot");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [status, setStatus] = useState("Checking Password...");
  const [shaking, setShaking] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      if (alive.current) fn();
    }, ms);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    if (phase !== "boot") return;
    later(() => setPhase("idle"), 1200);
  }, [phase, later]);

  const resetToIdle = useCallback(() => {
    setApiError(null);
    setPassword("");
    setShowPw(false);
    setFieldErrors({});
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (phase === "idle") {
      if (fieldErrors.password) pwRef.current?.focus();
      else emailRef.current?.focus();
    }
  }, [phase, fieldErrors.password]);

  useEffect(() => {
    if (phase !== "idle" && phase !== "denied") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resetToIdle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, resetToIdle]);

  const shakeTitle = () => {
    setShaking(true);
    later(() => setShaking(false), 450);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Wajib diisi";
    else if (!EMAIL_RE.test(email)) errs.email = "Format email tidak valid";
    if (!password) errs.password = "Wajib diisi";
    setFieldErrors(errs);
    if (errs.email || errs.password) return;

    setApiError(null);
    setPhase("checking");
    setStatus("Checking Password...");
    later(() => setStatus("Loading User Profile..."), 900);

    let error: string | null = null;
    try {
      error = await Promise.all([onLogin(email.trim(), password, remember), sleep(1600)]).then(
        ([r]) => r,
      );
    } catch (err) {
      error = err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.";
    }
    if (!alive.current) return;
    if (error) {
      setApiError(error);
      setPassword("");
      setShowPw(false);
      setFieldErrors({});
      setPhase("denied");
    } else {
      setPhase("success");
      later(onSuccess, 1400);
    }
  };

  const dialogBody = (): ReactNode => {
    if (phase === "checking") {
      return (
        <div className="gate-checking">
          <div className="gate-status">
            {status}
            <span className="gate-blink">_</span>
          </div>
          <div className="gate-progress" role="progressbar" aria-label={status}>
            <div className="gate-progress__bar" />
          </div>
        </div>
      );
    }

    if (phase === "success") {
      return (
        <div className="gate-row">
          <GateAvatar />
          <div>
            <div className="gate-msg gate-msg--ok">Welcome Back</div>
            <div className="gate-msg">System Ready</div>
            <div className="gate-msg">
              Loading desktop...
              <span className="gate-blink">_</span>
            </div>
          </div>
        </div>
      );
    }

    if (alreadyIn) {
      return (
        <>
          <div className="gate-row">
            <GateAvatar />
            <div>
              <div className="gate-msg gate-msg--ok">Sudah masuk</div>
              <div className="gate-msg">Sesi aktif terdeteksi. Lanjutkan ke desktop.</div>
            </div>
          </div>
          <div className="gate-actions">
            <button type="button" className="gate-btn gate-btn--default" onClick={onSuccess} autoFocus>
              Lanjut
            </button>
          </div>
        </>
      );
    }

    const denied = phase === "denied";
    return (
      <form onSubmit={handleLogin} noValidate>
        {initialMessage && !denied && (
          <div className="gate-msg gate-msg--info">⚠ {initialMessage}</div>
        )}
        {denied && (
          <div className="gate-msg gate-msg--err" role="alert">
            <div className="gate-msg__head">⚠ Access Denied</div>
            <div>{apiError ?? "The password you typed is incorrect. Try again."}</div>
          </div>
        )}
        <div className="gate-row">
          <GateAvatar />
          <p className="gate-msg">Type a user name and password to log on.</p>
        </div>
        <label className="gate-field" htmlFor="gate-user">
          User name:
          <input
            ref={emailRef}
            id="gate-user"
            className="gate-input"
            type="text"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            autoComplete="username"
          />
          {fieldErrors.email && (
            <span className="gate-field__error" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </label>
        <label className="gate-field" htmlFor="gate-pass">
          Password:
          <span className="gate-pwrow">
            <input
              ref={pwRef}
              id="gate-pass"
              className="gate-input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="gate-btn gate-btn--small"
              title={showPw ? "Sembunyikan password" : "Tampilkan password"}
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </span>
          {fieldErrors.password && (
            <span className="gate-field__error" role="alert">
              {fieldErrors.password}
            </span>
          )}
        </label>
        <label className="gate-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember session
        </label>
        <div className="gate-actions">
          {denied ? (
            <button type="button" className="gate-btn gate-btn--default" onClick={resetToIdle} autoFocus title="Coba lagi">
              Try Again
            </button>
          ) : (
            <button type="submit" className="gate-btn gate-btn--default" title="Masuk">
              OK
            </button>
          )}
          <button type="button" className="gate-btn" onClick={resetToIdle} title="Batal">
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const dialogOpen = phase === "idle" || phase === "checking" || phase === "denied" || phase === "success";
  const title = alreadyIn
    ? "THE GATE"
    : phase === "success"
      ? "Welcome Back"
      : "Welcome to THE GATE";

  return (
    <div className="gate-root">
      <div className="gate-icons" aria-hidden="true">
        <span className="gate-icon">
          <span className="gate-icon__glyph">🖥</span>
          <span className="gate-icon__label">My Computer</span>
        </span>
        <span className="gate-icon">
          <span className="gate-icon__glyph">🗑</span>
          <span className="gate-icon__label">Recycle Bin</span>
        </span>
      </div>

      <div className="gate-taskbar">
        <button type="button" className="gate-taskbar__start" title="Start" onClick={() => {}}>
          Start
        </button>
        <div className="gate-taskbar__spacer" />
        <div className="gate-tray">
          <GateClock />
        </div>
      </div>

      {phase === "boot" && (
        <div className="gate-boot" aria-label="Menyalakan sistem">
          <div className="gate-boot__logo">GAS ELECTRONIC OS</div>
          <div className="gate-boot__status">
            Loading THE GATE...
            <span className="gate-blink">_</span>
          </div>
        </div>
      )}

      {dialogOpen && (
        <div
          key={`${phase}-${alreadyIn}`}
          className={`gate-dialog gate-dialog--open${shaking ? " gate-dialog--shake" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-dlg-title"
        >
          <div className="gate-titlebar" onDoubleClick={shakeTitle} title="GAS ELECTRONIC OS">
            <span className="gate-titlebar__icon" aria-hidden="true">
              ▣
            </span>
            <span id="gate-dlg-title">{title}</span>
          </div>
          <div className="gate-dialog__body">{dialogBody()}</div>
        </div>
      )}
    </div>
  );
}
