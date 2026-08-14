"use client";

import { useState, type ReactNode } from "react";
import { t, loadLang, type Lang } from "@/lib/i18n";

export type App95HomeProps = {
  user: { name: string; email: string; role: string };
  onNavigate?: (path: string) => void;
};

type Stat = { icon: string; label: string; value: string; unit: string; tip: string };
type Module = { icon: string; name: string; desc: string; path: string };
type Activity = { time: string; module: string; action: string; status: "OK" | "WARN" };

const LOCALES: Record<Lang, string> = { id: "id-ID", en: "en-US", zh: "zh-CN", ko: "ko-KR", ja: "ja-JP" };

export function App95HomeContent(props: App95HomeProps): ReactNode {
  const { user, onNavigate } = props;
  const [lang] = useState<Lang>(() => (typeof window === "undefined" ? "id" : loadLang(window.localStorage)));
  const [tab, setTab] = useState(0);
  const [notif, setNotif] = useState(true);
  const [period, setPeriod] = useState(() => t(lang, "suite.qtPeriodToday"));

  const stats: Stat[] = [
    { icon: "▤", label: t(lang, "suite.statRecordLabel"), value: "1.248", unit: t(lang, "suite.statRecordUnit"), tip: t(lang, "suite.statRecordTip") },
    { icon: "▦", label: t(lang, "suite.statOutputLabel"), value: "12.480", unit: t(lang, "suite.statOutputUnit"), tip: t(lang, "suite.statOutputTip") },
    { icon: "▧", label: t(lang, "suite.statUpphLabel"), value: "2,81", unit: t(lang, "suite.statUpphUnit"), tip: t(lang, "suite.statUpphTip") },
    { icon: "▣", label: t(lang, "suite.statSetupLabel"), value: "96", unit: t(lang, "suite.statSetupUnit"), tip: t(lang, "suite.statSetupTip") },
  ];

  const modules: Module[] = [
    { icon: "◉", name: t(lang, "suite.modAnalyticsName"), desc: t(lang, "suite.modAnalyticsDesc"), path: "/dashboard" },
    { icon: "▧", name: t(lang, "suite.modDetailName"), desc: t(lang, "suite.modDetailDesc"), path: "/production-table" },
    { icon: "⌨", name: t(lang, "suite.modInputName"), desc: t(lang, "suite.modInputDesc"), path: "/data-entry/records" },
    { icon: "⇅", name: t(lang, "suite.modTransferName"), desc: t(lang, "suite.modTransferDesc"), path: "/import" },
    { icon: "☰", name: t(lang, "suite.modAuditName"), desc: t(lang, "suite.modAuditDesc"), path: "/audit" },
    { icon: "⚙", name: t(lang, "suite.modKpiName"), desc: t(lang, "suite.modKpiDesc"), path: "/kpi" },
    { icon: "⌂", name: t(lang, "suite.modUsersName"), desc: t(lang, "suite.modUsersDesc"), path: "/users" },
    { icon: "◈", name: t(lang, "suite.modSessionsName"), desc: t(lang, "suite.modSessionsDesc"), path: "/sessions" },
    { icon: "▣", name: t(lang, "suite.modSettingsName"), desc: t(lang, "suite.modSettingsDesc"), path: "/settings" },
  ];

  const activities: Activity[] = [
    { time: "08:42", module: t(lang, "suite.modInputName"), action: t(lang, "suite.act1"), status: "OK" },
    { time: "08:37", module: t(lang, "suite.modDetailName"), action: t(lang, "suite.act2"), status: "OK" },
    { time: "08:31", module: t(lang, "suite.modTransferName"), action: t(lang, "suite.act3"), status: "OK" },
    { time: "08:15", module: t(lang, "suite.modAuditName"), action: t(lang, "suite.act4"), status: "OK" },
    { time: "07:58", module: t(lang, "suite.modInputName"), action: t(lang, "suite.act5"), status: "WARN" },
    { time: "07:44", module: t(lang, "suite.modKpiName"), action: t(lang, "suite.act6"), status: "OK" },
    { time: "07:20", module: t(lang, "suite.modSessionsName"), action: t(lang, "suite.act7"), status: "WARN" },
    { time: "06:59", module: t(lang, "suite.modUsersName"), action: t(lang, "suite.act8"), status: "OK" },
  ];

  const tabs = [t(lang, "suite.tabAll"), t(lang, "suite.tabProduction"), t(lang, "suite.tabSystem")];
  const periods = [t(lang, "suite.qtPeriodToday"), t(lang, "suite.qtPeriodWeek"), t(lang, "suite.qtPeriodMonth")];

  const now = new Date();
  const dateStr = now.toLocaleDateString(LOCALES[lang], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString(LOCALES[lang], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const go = (path: string) => onNavigate?.(path);

  return (
    <div className="app95-scroll flex h-full flex-col gap-3 p-3">
      {/* Welcome bar */}
      <div className="app95-panel flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-lg leading-none" data-tip={t(lang, "suite.home.activeTip")}>⌂</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{t(lang, "suite.home.welcome").replace("{name}", user.name)}</p>
            <p className="truncate text-xs text-[#404040]">{user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="app95-badge" data-tip={`${t(lang, "suite.home.role")}: ${user.role}`}>{user.role}</span>
          <span className="app95-badge" data-tip={t(lang, "suite.home.timeTip")}>🕑 {timeStr}</span>
        </div>
      </div>

      <div className="app95-panel flex items-center gap-2 px-3 py-1.5">
        <span className="text-xs leading-none" data-tip={t(lang, "suite.home.wgTip")}>▣</span>
        <p className="text-xs text-[#404040]">
          GAS ELECTRONIC Suite v1.8 · {t(lang, "suite.home.workgroup")} <span className="font-bold text-black">PRODUKSI</span> · {dateStr}
        </p>
        <span className="ml-auto hidden text-xs text-[#404040] sm:inline" data-tip={t(lang, "suite.home.demoTip")}>demo</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="app95-card px-3 py-2" data-tip={s.tip}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wide text-[#404040] uppercase">{s.label}</p>
              <span className="text-base leading-none" data-tip={s.tip}>{s.icon}</span>
            </div>
            <p className="app95-stat my-1 text-2xl font-bold" data-tip={s.tip}>{s.value}</p>
            <p className="text-[10px] text-[#404040]">{s.unit} · demo</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Module grid */}
        <div className="app95-panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#808080] px-3 py-1.5">
            <p className="text-sm font-bold">{t(lang, "suite.modulesTitle")}</p>
            <span className="text-[10px] text-[#404040]">{t(lang, "suite.modulesCount")}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
            {modules.map((m) => (
              <button
                key={m.path}
                type="button"
                className="app95-btn flex h-full flex-col items-start gap-1 px-2 py-2 text-left"
                onClick={() => go(m.path)}
                data-tip={t(lang, "suite.modOpenTip").replace("{name}", m.name).replace("{path}", m.path)}
              >
                <span className="text-lg leading-none" aria-hidden>{m.icon}</span>
                <span className="text-xs font-bold">{m.name}</span>
                <span className="text-[10px] leading-tight text-[#404040]">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right column: System / Quick Tools */}
        <div className="flex flex-col gap-3">
          <div className="app95-panel">
            <div className="border-b border-[#808080] px-3 py-1.5">
              <p className="text-sm font-bold">{t(lang, "suite.sysTitle")}</p>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">{t(lang, "suite.sysOs")}</span>
                <span>GAS OS 98 SE (build 4.10)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">{t(lang, "suite.sysCpu")}</span>
                <span>Pentium II 400 MHz</span>
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="text-[#404040]">{t(lang, "suite.sysRam")}</span>
                <div className="app95-progress" role="progressbar" aria-valuenow={62} data-tip={t(lang, "suite.sysRamTip")}>
                  <div className="w-[62%]" />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">{t(lang, "suite.sysWg")}</span>
                <span>PRODUKSI</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#404040]">{t(lang, "suite.sysFree")}</span>
                <span>1.2 GB</span>
              </div>
            </div>
          </div>

          <div className="app95-panel">
            <div className="border-b border-[#808080] px-3 py-1.5">
              <p className="text-sm font-bold">{t(lang, "suite.qtTitle")}</p>
            </div>
            <div className="app95-tabs mx-3 mt-2" role="tablist">
              {tabs.map((tabLabel, i) => (
                <button key={tabLabel} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} data-tip={t(lang, "suite.tabTip").replace("{tab}", tabLabel)}>
                  {tabLabel}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 p-3">
              <label className="app95-check flex items-center gap-2 text-xs" data-tip={t(lang, "suite.qtNotifTip")}>
                <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} />
                {t(lang, "suite.qtNotif")}
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-[#404040]">{t(lang, "suite.qtPeriod")}</span>
                <select className="app95-select" value={period} onChange={(e) => setPeriod(e.target.value)} data-tip={t(lang, "suite.qtPeriodTip")}>
                  {periods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <div className="app95-divider" />
              <button type="button" className="app95-btn app95-btn--primary text-xs" onClick={() => go("/dashboard")} data-tip={t(lang, "suite.qtAnalyticsTip")}>
                {t(lang, "suite.qtAnalytics")}
              </button>
              <button
                type="button"
                className="app95-btn text-xs"
                onClick={() => window.alert(t(lang, "suite.qtPrintAlert"))}
                data-tip={t(lang, "suite.qtPrintTip")}
              >
                {t(lang, "suite.qtPrint")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity table */}
      <div className="app95-panel">
        <div className="flex items-center justify-between border-b border-[#808080] px-3 py-1.5">
          <p className="text-sm font-bold">{t(lang, "suite.actTitle")}</p>
          <span className="text-[10px] text-[#404040]" data-tip={t(lang, "suite.actHintTip")}>{t(lang, "suite.actHint")}</span>
        </div>
        <div className="app95-scroll max-h-56 overflow-auto">
          <table className="app95-table w-full">
            <thead>
              <tr>
                <th className="w-16">{t(lang, "suite.actColTime")}</th>
                <th className="w-32">{t(lang, "suite.actColModule")}</th>
                <th>{t(lang, "suite.actColAction")}</th>
                <th className="w-20">{t(lang, "suite.actColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, i) => (
                <tr key={i} data-tip={a.status === "OK" ? t(lang, "suite.actTipOk") : t(lang, "suite.actTipWarn")}>
                  <td className="font-mono">{a.time}</td>
                  <td>{a.module}</td>
                  <td>{a.action}</td>
                  <td>
                    <span className={`app95-badge ${a.status === "WARN" ? "app95-badge--warn" : ""}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="px-1 pb-1 text-center text-[10px] text-[#404040]" data-tip={t(lang, "suite.footerTip")}>
        {t(lang, "suite.footer")}
      </footer>
    </div>
  );
}

export default App95HomeContent;
