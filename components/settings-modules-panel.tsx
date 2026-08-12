"use client";

import Link from "next/link";
import { canAccess } from "@/lib/auth/menu";
import { t, type Lang, type TranslationKey } from "@/lib/i18n";

type ModuleUser = { role: string | { name: string }; permissions: string[] };

type ModuleCard = {
  key: string;
  href: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  permission: string;
  icon: React.ReactNode;
  accent: string;
};

const CARDS: ModuleCard[] = [
  {
    key: "kpi",
    href: "/kpi",
    titleKey: "mod.kpiTitle",
    descKey: "mod.kpiDesc",
    permission: "kpi.configure",
    accent: "from-cyan-500 to-blue-800",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="20" />
        <line x1="4" y1="16" x2="8" y2="16" />
        <line x1="9" y1="16" x2="14" y2="16" />
        <line x1="4" y1="12" x2="12" y2="12" />
        <line x1="4" y1="8" x2="20" y2="8" />
        <line x1="4" y1="4" x2="16" y2="4" />
      </svg>
    ),
  },
  {
    key: "users",
    href: "/users",
    titleKey: "mod.usersTitle",
    descKey: "mod.usersDesc",
    permission: "user.manage",
    accent: "from-violet-500 to-purple-800",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "audit",
    href: "/audit",
    titleKey: "mod.auditTitle",
    descKey: "mod.auditDesc",
    permission: "audit.view",
    accent: "from-amber-500 to-orange-700",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="16" y2="17" />
      </svg>
    ),
  },
  {
    key: "sessions",
    href: "/sessions",
    titleKey: "mod.sessionsTitle",
    descKey: "mod.sessionsDesc",
    permission: "dashboard.view",
    accent: "from-emerald-500 to-teal-800",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function SettingsModulesPanel({ lang, user }: { lang: Lang; user: ModuleUser }) {
  return (
    <section className="glass-card relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 text-white shadow-lg shadow-violet-500/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t(lang, "tab.modules")}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(lang, "mod.subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {CARDS.map((card) => {
            const allowed = canAccess(user, card.permission);
            const inner = (
              <>
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg ${card.accent} ${
                    allowed ? "shadow-slate-950/20" : "opacity-50"
                  }`}
                >
                  {card.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t(lang, card.titleKey)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t(lang, card.descKey)}
                  </span>
                </span>
                {allowed ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400"
                    aria-hidden
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-950/15 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:border-white/15 dark:text-slate-400">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {t(lang, "mod.locked")}
                  </span>
                )}
              </>
            );
            return allowed ? (
              <Link
                key={card.key}
                href={card.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-950/10 bg-white/50 p-4 transition hover:border-cyan-500/40 hover:bg-cyan-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-cyan-500/10"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={card.key}
                aria-disabled="true"
                className="flex items-center gap-3 rounded-xl border border-slate-950/10 bg-white/30 p-4 opacity-60 dark:border-white/10 dark:bg-white/[0.03]"
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
