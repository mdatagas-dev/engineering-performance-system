"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { t, loadLang, type Lang } from "@/lib/i18n";

export type LoginGateProps = {
  /** Kirim kredensial. Return null = sukses; string = pesan error (tidak dibocorkan detail). */
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<string | null>;
  /** Dipanggil setelah sukses + animasi "Logging on" (page akan redirect ke /dashboard). */
  onSuccess: () => void;
  /** Dipanggil saat Cancel / tombol close (kembali ke Windows XP Homepage/Desktop). */
  onCancel?: () => void;
  /** Pesan awal opsional (mis. "Sesi Anda telah berakhir" saat ?expired=1). */
  initialMessage?: string;
  /** Kalau true (sudah ada sesi) → tampilkan "Sudah masuk" + tombol lanjut → onSuccess. */
  alreadyIn?: boolean;
};

type Phase = "idle" | "checking" | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Logo Windows XP: empat panel (merah/hijau/biru/kuning) bergelombang. */
function WinFlag({ size = 88 }: { size?: number }): ReactNode {
  return (
    <svg width={size} height={(size * 56) / 88} viewBox="0 0 88 56" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="xf-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f04e23" />
          <stop offset="1" stopColor="#c42a0c" />
        </linearGradient>
        <linearGradient id="xf-grn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cb52a" />
          <stop offset="1" stopColor="#44800c" />
        </linearGradient>
        <linearGradient id="xf-blu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f7fd4" />
          <stop offset="1" stopColor="#1f4f9e" />
        </linearGradient>
        <linearGradient id="xf-ylw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc800" />
          <stop offset="1" stopColor="#e09a00" />
        </linearGradient>
      </defs>
      {/* outline */}
      <rect x="1.5" y="1.5" width="85" height="53" rx="2" fill="none" stroke="#1a2f5a" strokeWidth="3" />
      <rect x="3.5" y="3.5" width="81" height="49" rx="1" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" />
      {/* 4 panel */}
      <path d="M5 5h39v23H5z" fill="url(#xf-red)" />
      <path d="M44 5h39v23H44z" fill="url(#xf-grn)" />
      <path d="M5 28h39v23H5z" fill="url(#xf-blu)" />
      <path d="M44 28h39v23H44z" fill="url(#xf-ylw)" />
      {/* pemisah + kilau gelombang */}
      <rect x="42" y="5" width="4" height="46" fill="#ffffff" opacity="0.85" />
      <rect x="5" y="26" width="78" height="4" fill="#ffffff" opacity="0.85" />
      <g stroke="#ffffff" strokeOpacity="0.28" fill="none" strokeWidth="1.5">
        <path d="M5 11q5 2 10 0t10 0 10 0 9 0" />
        <path d="M5 18q5 2 10 0t10 0 10 0 9 0" />
        <path d="M44 11q5 2 10 0t10 0 9 0" />
        <path d="M44 18q5 2 10 0t10 0 9 0" />
        <path d="M5 34q5 2 10 0t10 0 10 0 9 0" />
        <path d="M5 41q5 2 10 0t10 0 10 0 9 0" />
        <path d="M44 34q5 2 10 0t10 0 9 0" />
        <path d="M44 41q5 2 10 0t10 0 9 0" />
      </g>
    </svg>
  );
}

/** Ikon peringatan XP (segitiga kuning) untuk message box error. */
function WarnIcon(): ReactNode {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <polygon points="16,3 30,28 2,28" fill="#ffd76b" stroke="#000000" strokeWidth="1.5" />
      <rect x="15" y="10" width="2" height="10" fill="#000000" />
      <rect x="15" y="22" width="2" height="2" fill="#000000" />
    </svg>
  );
}

export default function LoginGate({
  onLogin,
  onSuccess,
  onCancel,
  initialMessage,
  alreadyIn,
}: LoginGateProps): ReactNode {
  const [lang] = useState<Lang>(() => (typeof window === "undefined" ? "id" : loadLang(window.localStorage)));
  const [phase, setPhase] = useState<Phase>("idle");
  // Username default "user" (seperti logon Windows XP klasik).
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [errBox, setErrBox] = useState<string | null>(null);

  const userRef = useRef<HTMLInputElement>(null);
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
    if (phase !== "idle") return;
    if (fieldErrors.username) userRef.current?.focus();
    else if (fieldErrors.password) pwRef.current?.focus();
    else if (username) pwRef.current?.focus();
    else userRef.current?.focus();
  }, [phase, fieldErrors.username, fieldErrors.password, username]);

  const cancel = useCallback(() => {
    if (onCancel) onCancel();
  }, [onCancel]);

  // Escape = Cancel (kebiasaan dialog Windows).
  useEffect(() => {
    if (phase !== "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, cancel]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === "checking") return;
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = t(lang, "gate.errRequired");
    // Username XP klasik tidak wajib email; kalau berisi @ baru divalidasi format.
    else if (username.includes("@") && !EMAIL_RE.test(username)) errs.username = t(lang, "gate.errEmail");
    if (!password) errs.password = t(lang, "gate.errRequired");
    setFieldErrors(errs);
    if (errs.username || errs.password) return;

    setErrBox(null);
    setPhase("checking");

    let error: string | null = null;
    try {
      error = await Promise.all([onLogin(username.trim(), password, remember), sleep(1800)]).then(
        ([r]) => r,
      );
    } catch (err) {
      error = err instanceof Error ? err.message : t(lang, "gate.errGeneric");
    }
    if (!alive.current) return;
    if (error) {
      // Jangan bocorkan detail internal — selalu tampilkan pesan generik XP.
      setPassword("");
      setFieldErrors({});
      setPhase("idle");
      setErrBox(t(lang, "gate.errLogin"));
      later(() => pwRef.current?.focus(), 0);
    } else {
      setPhase("success");
      later(onSuccess, 1300);
    }
  };

  const errVisible = errBox !== null;

  const formArea = (): ReactNode => {
    if (phase === "checking" || phase === "success") {
      return (
        <div className="xl-logging">
          <div className="xl-logging__row">
            <div>
              <div className="xl-logging__msg">{phase === "checking" ? t(lang, "gate.statusChecking") : t(lang, "gate.loadingDesktop")}</div>
              <div className="xl-logging__bar" role="progressbar" aria-label={t(lang, "gate.statusChecking")}>
                <div className="xl-logging__blocks" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (alreadyIn) {
      return (
        <>
          <div className="xl-msg xl-msg--ok">{t(lang, "gate.alreadyIn")}</div>
          <div className="xl-msg">{t(lang, "gate.alreadyInDesc")}</div>
          <div className="xl-actions">
            <button type="button" className="xl-btn xl-btn--default" onClick={onSuccess} autoFocus>
              {t(lang, "gate.continue")}
            </button>
            <button type="button" className="xl-btn" onClick={cancel}>
              {t(lang, "gate.cancel")}
            </button>
          </div>
        </>
      );
    }

    return (
      <form onSubmit={handleLogin} noValidate>
        {initialMessage && <div className="xl-msg xl-msg--info">⚠ {initialMessage}</div>}
        <div className="xl-fieldrow">
          <label className="xl-fieldlabel" htmlFor="xl-user">
            {t(lang, "gate.userName")}
          </label>
          <input
            ref={userRef}
            id="xl-user"
            className={`xl-input${fieldErrors.username ? " xl-input--err" : ""}`}
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((f) => ({ ...f, username: undefined }));
            }}
            autoComplete="username"
            tabIndex={1}
          />
        </div>
        <div className="xl-fieldrow">
          <label className="xl-fieldlabel" htmlFor="xl-pass">
            {t(lang, "gate.password")}
          </label>
          <input
            ref={pwRef}
            id="xl-pass"
            className={`xl-input${fieldErrors.password ? " xl-input--err" : ""}`}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            autoComplete="current-password"
            tabIndex={2}
          />
        </div>

        {showOptions && (
          <div className="xl-options" id="xl-options">
            <fieldset className="xl-groupbox">
              <legend>{t(lang, "gate.logonTo")}</legend>
              <span className="xl-combo">
                <select id="xl-logon" className="xl-combo__select" defaultValue="pms" tabIndex={4}>
                  <option value="pms">{t(lang, "gate.domain")}</option>
                </select>
              </span>
              <label className="xl-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} tabIndex={5} />
                <span>{t(lang, "gate.remember")}</span>
              </label>
            </fieldset>
          </div>
        )}

        <div className="xl-actions">
          <button type="button" className="xl-btn xl-btn--options" onClick={() => setShowOptions((v) => !v)} tabIndex={3} aria-expanded={showOptions} aria-controls="xl-options">
            {showOptions ? t(lang, "gate.optionsClose") : t(lang, "gate.optionsOpen")}
          </button>
          <button type="button" className="xl-btn" onClick={cancel} title={t(lang, "gate.cancelTitle")} tabIndex={6}>
            {t(lang, "gate.cancel")}
          </button>
          <button type="submit" className="xl-btn xl-btn--default" title={t(lang, "gate.okTitle")} tabIndex={7}>
            {t(lang, "gate.ok")}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className={`xl-root${phase === "checking" || phase === "success" ? " xl-root--busy" : ""}`}>
      {/* Wallpaper Bliss — sama dengan homepage (winxp-desktop) */}
      <div className="winxp-wallpaper" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="winxp-wallpaper__img" src="/wallpaper-xp.jpg" alt="" draggable={false} />
      </div>

      <div className="xl-window" role="dialog" aria-modal="true" aria-labelledby="xl-dlg-title">
        {/* Title bar Luna */}
        <div className="xl-titlebar">
          <span id="xl-dlg-title" className="xl-titlebar__title">
            {t(lang, "gate.titleWelcome")}
          </span>
          <button
            type="button"
            className="xl-titlebar__btn"
            title={t(lang, "gate.cancelTitle")}
            aria-label={t(lang, "gate.cancelTitle")}
            onClick={cancel}
          >
            ✕
          </button>
        </div>

        {/* Header branding Windows XP Professional */}
        <div className="xl-header">
          <div className="xl-header__brand">
            <WinFlag />
            <div className="xl-header__text">
              <div className="xl-header__ms">Microsoft</div>
              <div className="xl-header__win">
                Windows<span className="xl-header__xp">XP</span>
              </div>
              <div className="xl-header__pro">Professional</div>
            </div>
          </div>
          <div className="xl-header__copy">
            <span>Copyright © 1985-2001</span>
            <span>Microsoft Corporation</span>
          </div>
          <span className="xl-header__ms2">Microsoft</span>
        </div>

        {/* Form area beige #ECE9D8 */}
        <div className="xl-form">{formArea()}</div>
      </div>

      {errVisible && (
        <div className="xl-errbox" role="alertdialog" aria-modal="true" aria-labelledby="xl-err-title" aria-describedby="xl-err-msg">
          <div className="xl-titlebar">
            <span className="xl-titlebar__icon" aria-hidden="true">
              <WarnIcon />
            </span>
            <span id="xl-err-title" className="xl-titlebar__title">
              {t(lang, "gate.warnTitle")}
            </span>
            <button
              type="button"
              className="xl-titlebar__btn"
              aria-label={t(lang, "gate.ok")}
              onClick={() => setErrBox(null)}
            >
              ✕
            </button>
          </div>
          <div className="xl-errbox__body">
            <span className="xl-errbox__icon" aria-hidden="true">
              <WarnIcon />
            </span>
            <p id="xl-err-msg" className="xl-errbox__msg">
              {errBox}
            </p>
          </div>
          <div className="xl-errbox__actions">
            <button type="button" className="xl-btn xl-btn--default" onClick={() => setErrBox(null)} autoFocus>
              {t(lang, "gate.ok")}
            </button>
          </div>
        </div>
      )}

      {/* Loading penuh layar setelah autentikasi sukses — visual sama dengan homepage */}
      {phase === "success" && (
        <div className="xl-loading" role="status" aria-live="polite">
          <div className="winxp-wallpaper" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="winxp-wallpaper__img" src="/wallpaper-xp.jpg" alt="" draggable={false} />
          </div>
          <div className="xl-loading__box">
            <div className="xl-loading__msg">{t(lang, "gate.loadingDesktop")}</div>
            <div className="xl-logging__bar xl-loading__bar" role="progressbar" aria-label={t(lang, "gate.loadingDesktop")}>
              <div className="xl-logging__blocks" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
