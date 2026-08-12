"use client";

import { useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { canAccess } from "@/lib/auth/menu";
import { LANGS, loadLang, saveLang, t, type Lang, type TranslationKey } from "@/lib/i18n";
import SettingsSecurityPanel from "@/components/settings-security-panel";
import SettingsLanguagePanel from "@/components/settings-language-panel";
import SettingsAboutPanel from "@/components/settings-about-panel";
import SettingsModulesPanel from "@/components/settings-modules-panel";

type Tab = "security" | "language" | "about" | "modules";

export default function SettingsPage() {
  const session = useSessionGuard("dashboard.view");
  const [tab, setTab] = useState<Tab | null>(null);
  const [lang, setLang] = useState<Lang>(() => loadLang(typeof window === "undefined" ? null : window.localStorage));

  function handleLangSelect(next: Lang) {
    setLang(next);
    saveLang(next, window.localStorage);
  }

  if (!session) {
    return (
      <main className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid h-full place-items-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t(lang, "common.checking")}</p>
        </div>
      </main>
    );
  }

  const canSecurity = canAccess(session.user, "user.manage");
  const TABS: { key: Tab; labelKey: TranslationKey }[] = [
    ...(canSecurity ? [{ key: "security" as const, labelKey: "tab.security" as const }] : []),
    { key: "modules", labelKey: "tab.modules" },
    { key: "language", labelKey: "tab.language" },
    { key: "about", labelKey: "tab.about" },
  ];
  const activeTab: Tab = tab ?? (canSecurity ? "security" : "modules");
  const activeLang = LANGS.find((l) => l.code === lang);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4">
        <header className="glass-card relative overflow-hidden px-6 py-5">
          <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-800 text-white shadow-lg shadow-cyan-500/20">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t(lang, "app.title")}</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(lang, "app.subtitle")}</p>
              </div>
            </div>
            {activeLang && (
              <span className="flex items-center gap-1.5 rounded-full border border-slate-950/10 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:text-slate-300">
                <span aria-hidden>{activeLang.flag}</span>
                {activeLang.label}
              </span>
            )}
          </div>
        </header>

        <nav
          aria-label={t(lang, "app.title")}
          className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-950/10 bg-white/50 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/5"
        >
          {TABS.map(({ key, labelKey }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  active
                    ? "bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-lg shadow-cyan-600/25"
                    : "text-slate-600 hover:bg-slate-950/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                {t(lang, labelKey)}
              </button>
            );
          })}
        </nav>

        {!canSecurity && (
          <p className="-mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t(lang, "mod.securityRestricted")}</p>
        )}

        <div className="flex-1">
          {activeTab === "security" && <SettingsSecurityPanel lang={lang} user={session.user} />}
          {activeTab === "modules" && <SettingsModulesPanel lang={lang} user={session.user} />}
          {activeTab === "language" && <SettingsLanguagePanel lang={lang} onSelect={handleLangSelect} />}
          {activeTab === "about" && <SettingsAboutPanel lang={lang} />}
        </div>
      </div>
    </main>
  );
}
