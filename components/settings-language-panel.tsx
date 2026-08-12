"use client";

import { useRef, useState } from "react";
import { LANGS, t, type Lang } from "@/lib/i18n";

export default function SettingsLanguagePanel({ lang, onSelect }: { lang: Lang; onSelect: (lang: Lang) => void }) {
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSelect(next: Lang) {
    if (next === lang) return;
    onSelect(next);
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 4000);
  }

  return (
    <section className="glass-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-800 text-white shadow-lg shadow-emerald-500/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t(lang, "lang.title")}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(lang, "lang.subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {t(lang, "lang.active")}: {LANGS.find((l) => l.code === lang)?.label}
          </span>
          {saved && (
            <span role="status" aria-live="polite" className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
              {t(lang, "lang.saved")}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {LANGS.map(({ code, label, flag }) => {
            const active = code === lang;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                aria-pressed={active}
                className={`group flex flex-col items-center gap-2 rounded-xl border px-3 py-5 text-center transition ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/30"
                    : "border-slate-950/10 bg-white/50 hover:border-cyan-500/40 hover:bg-cyan-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-cyan-500/10"
                }`}
              >
                <span className="text-3xl" aria-hidden>
                  {flag}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                <span className="text-[10px] tracking-wide text-slate-400 uppercase dark:text-slate-500">{code}</span>
                {active && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
