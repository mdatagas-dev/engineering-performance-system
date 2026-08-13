"use client";

import pkg from "@/package.json";
import { CHANGELOG, changelogKind, t, type Lang } from "@/lib/i18n";

const STACK = ["Next.js 16 (App Router)", "React 19", "TypeScript", "Prisma 7", "Tailwind CSS v4"];

export default function SettingsAboutPanel({ lang }: { lang: Lang }) {
  return (
    <section className="glass-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-800 text-white shadow-lg shadow-rose-500/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t(lang, "about.title")}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(lang, "about.subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-950/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t(lang, "about.version")}</p>
            <p className="mt-2">
              <span className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-2.5 py-1 font-mono text-sm font-bold text-white shadow-lg shadow-cyan-600/25">
                v{pkg.version}
              </span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">EPS · Engineering Production System</span>
            </p>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 dark:border-rose-500/20 dark:bg-rose-500/[0.05]">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t(lang, "about.securityPatch")}</p>
            <p className="mt-2">
              <span className="rounded-lg bg-gradient-to-r from-rose-600 to-pink-700 px-2.5 py-1 font-mono text-sm font-bold text-white shadow-lg shadow-rose-600/25">
                v{pkg.securityPatch}
              </span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                {t(lang, "about.release")}: {CHANGELOG.find((e) => e.version === `v${pkg.securityPatch}`)?.date ?? "—"}
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-950/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">{t(lang, "about.stack")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STACK.map((tech) => (
                <span key={tech} className="rounded-full border border-slate-950/10 bg-slate-950/5 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">{t(lang, "about.changelog")}</h3>
          <div className="mt-3 flex flex-col gap-3">
            {CHANGELOG.map((entry) => {
              const isSecurity = changelogKind(entry) === "security";
              return (
                <div
                  key={entry.version}
                  className={`rounded-xl border p-4 ${
                    isSecurity
                      ? "border-rose-500/25 bg-rose-500/[0.03] dark:border-rose-500/25"
                      : "border-slate-950/10 bg-white/50 dark:border-white/10 dark:bg-white/5"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold text-white shadow-lg ${
                        isSecurity
                          ? "bg-gradient-to-r from-rose-600 to-pink-700 shadow-rose-600/20"
                          : "bg-gradient-to-r from-cyan-600 to-blue-700 shadow-cyan-600/20"
                      }`}
                    >
                      {entry.version}
                    </span>
                    {isSecurity && (
                      <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-700 uppercase dark:text-rose-400">
                        Security
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {t(lang, "about.release")}: {entry.date}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {entry.features[lang].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
