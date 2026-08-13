"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DEFAULT_SECURITY_CONFIG,
  parseSecurityConfig,
  SECURITY_CONFIG_LIMITS,
  type SecurityConfig,
} from "@/lib/security/config";
import { t, type Lang, type TranslationKey } from "@/lib/i18n";

// Shape backend GET/PUT /api/security-config (lib/brute-force/config.ts):
// waktu dalam milidetik; UI lokal pakai menit — konversi di lapisan ini.
type ApiSecurityConfig = {
  maxAttempts: number;
  lockoutBaseMs: number;
  lockoutMaxMs: number;
  rateLimitMaxAttempts: number;
  rateLimitWindowMs: number;
};

const MS_PER_MINUTE = 60_000;

function apiToLocal(a: ApiSecurityConfig): SecurityConfig {
  return {
    maxFailedAttempts: a.maxAttempts,
    lockoutBaseMinutes: Math.round(a.lockoutBaseMs / MS_PER_MINUTE),
    lockoutMaxMinutes: Math.round(a.lockoutMaxMs / MS_PER_MINUTE),
    rateLimitMax: a.rateLimitMaxAttempts,
    rateLimitWindowMinutes: Math.round(a.rateLimitWindowMs / MS_PER_MINUTE),
  };
}

function localToApi(c: SecurityConfig): ApiSecurityConfig {
  return {
    maxAttempts: c.maxFailedAttempts,
    lockoutBaseMs: c.lockoutBaseMinutes * MS_PER_MINUTE,
    lockoutMaxMs: c.lockoutMaxMinutes * MS_PER_MINUTE,
    rateLimitMaxAttempts: c.rateLimitMax,
    rateLimitWindowMs: c.rateLimitWindowMinutes * MS_PER_MINUTE,
  };
}

type FormState = {
  maxFailedAttempts: string;
  lockoutBaseMinutes: string;
  lockoutMaxMinutes: string;
  rateLimitMax: string;
  rateLimitWindowMinutes: string;
};

type FieldKey = keyof FormState;

const FIELDS: { key: FieldKey; labelKey: TranslationKey; hintKey: TranslationKey; unitKey: TranslationKey }[] = [
  { key: "maxFailedAttempts", labelKey: "sec.maxFailedAttempts", hintKey: "sec.maxFailedAttemptsHint", unitKey: "sec.unitAttempts" },
  { key: "lockoutBaseMinutes", labelKey: "sec.lockoutBaseMinutes", hintKey: "sec.lockoutBaseMinutesHint", unitKey: "sec.unitMinutes" },
  { key: "lockoutMaxMinutes", labelKey: "sec.lockoutMaxMinutes", hintKey: "sec.lockoutMaxMinutesHint", unitKey: "sec.unitMinutes" },
  { key: "rateLimitMax", labelKey: "sec.rateLimitMax", hintKey: "sec.rateLimitMaxHint", unitKey: "sec.unitAttempts" },
  { key: "rateLimitWindowMinutes", labelKey: "sec.rateLimitWindowMinutes", hintKey: "sec.rateLimitWindowMinutesHint", unitKey: "sec.unitMinutes" },
];

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

function fillTemplate(text: string, min: number, max: number): string {
  return text.replaceAll("{min}", String(min)).replaceAll("{max}", String(max));
}

function toForm(config: SecurityConfig): FormState {
  return {
    maxFailedAttempts: String(config.maxFailedAttempts),
    lockoutBaseMinutes: String(config.lockoutBaseMinutes),
    lockoutMaxMinutes: String(config.lockoutMaxMinutes),
    rateLimitMax: String(config.rateLimitMax),
    rateLimitWindowMinutes: String(config.rateLimitWindowMinutes),
  };
}

function validateForm(lang: Lang, form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { key } of FIELDS) {
    const n = Number(form[key]);
    const { min, max } = SECURITY_CONFIG_LIMITS[key];
    if (!Number.isInteger(n) || n < min || n > max) {
      const rangeKey = key === "maxFailedAttempts" || key === "rateLimitMax" ? "sec.errRangeAttempts" : "sec.errRangeMinutes";
      errors[key] = fillTemplate(t(lang, rangeKey), min, max);
    }
  }
  const base = Number(form.lockoutBaseMinutes);
  const max = Number(form.lockoutMaxMinutes);
  if (!errors.lockoutBaseMinutes && !errors.lockoutMaxMinutes && max < base) {
    errors.lockoutMaxMinutes = t(lang, "sec.errLockMaxLessBase");
  }
  return errors;
}

export default function SettingsSecurityPanel({ lang }: { lang: Lang }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Konfigurasi NYATA dari backend (GET /api/security-config — dipakai juga
  // oleh route login untuk rate limit & lockout). Gagal muat → form default
  // (backend fallback AUTH_CONFIG) + pesan, tanpa crash.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(toForm(DEFAULT_SECURITY_CONFIG));
    fetch("/api/security-config")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Gagal memuat pengaturan keamanan."))))
      .then((data: { config: ApiSecurityConfig }) => {
        setForm(toForm(apiToLocal(data.config)));
      })
      .catch((err: unknown) => {
        flash({ type: "err", text: err instanceof Error ? err.message : "Gagal memuat pengaturan keamanan." });
      });
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

  function flash(next: { type: "ok" | "err"; text: string }) {
    setFeedback(next);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }

  function handleChange(key: FieldKey, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Simpan via PUT /api/security-config — backend menulis tabel security_configs
  // + audit SECURITY_CONFIG_UPDATED (route). Bukan lagi localStorage/mock audit.
  async function persist(config: SecurityConfig, okMessage: string) {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/security-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localToApi(config)),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan pengaturan keamanan.");
      setForm(toForm(apiToLocal(data.config)));
      setErrors({});
      flash({ type: "ok", text: okMessage });
    } catch (err) {
      flash({ type: "err", text: err instanceof Error ? err.message : "Gagal menyimpan pengaturan keamanan." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const nextErrors = validateForm(lang, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      flash({ type: "err", text: t(lang, "sec.saveErr") });
      return;
    }
    await persist(parseSecurityConfig(form), t(lang, "sec.savedOk"));
  }

  async function handleReset() {
    if (!window.confirm(t(lang, "sec.resetConfirm"))) return;
    await persist(DEFAULT_SECURITY_CONFIG, t(lang, "sec.resetOk"));
  }

  return (
    <section className="glass-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-800 text-white shadow-lg shadow-cyan-500/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              </svg>
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t(lang, "sec.title")}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(lang, "sec.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {t(lang, "sec.resetDefault")}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {FIELDS.map(({ key, labelKey, hintKey, unitKey }) => {
              const { min, max } = SECURITY_CONFIG_LIMITS[key];
              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={key} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t(lang, labelKey)}
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {min}–{max} {t(lang, unitKey)}
                    </span>
                  </div>
                  <input
                    id={key}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    value={form?.[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{t(lang, hintKey)}</p>
                  {errors[key] && (
                    <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                      {errors[key]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {feedback && (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-lg border px-3 py-2.5 text-xs font-medium ${
                feedback.type === "ok"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              }`}
            >
              {feedback.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-950/10 pt-5 dark:border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "…" : t(lang, "sec.save")}
            </button>
          </div>
        </form>

        <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-[11px] leading-relaxed text-amber-800 dark:text-amber-400">
          <p className="font-semibold">{t(lang, "sec.notesTitle")}</p>
          <p className="mt-1">{t(lang, "sec.notesBody")}</p>
        </div>
      </div>
    </section>
  );
}
