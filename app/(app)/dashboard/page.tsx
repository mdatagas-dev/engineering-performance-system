"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { useCountUp } from "@/components/use-count-up";
import { fetchAllRecords } from "@/lib/api/records";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { round2 } from "@/lib/records/calculate";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";
import {
  applyFilters,
  EMPTY_FILTERS,
  isPresetActive,
  presetLastNDays,
  presetMonthToDate,
  presetToday,
  uniqueAreas,
  uniqueDates,
  uniqueModels,
  type DashboardFilters,
} from "@/lib/dashboard/filters";
import { buildDashboardSummary, type ModelGroup } from "@/lib/dashboard/summary";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ENGINEERING_MANAGER: "Engineering Manager",
  ENGINEERING_STAFF: "Engineering Staff",
  VIEWER: "Viewer",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const dateContext = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const fmtSigned = (v: number): string => (v >= 0 ? `+${formatNumber(v)}` : formatNumber(v));

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

// GAP UPH & GAP OP: nilai positif = melampaui target (baik). GAP HC: nilai
// negatif = HC aktual di bawah standar (baik). Warna konsisten dengan tabel
// data entry (gapClass).
function gapCls(v: number, lowerIsGood = false): string {
  if (v === 0) return "text-slate-400 dark:text-slate-500";
  const good = lowerIsGood ? v < 0 : v > 0;
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function GapCell({ value, lowerIsGood }: { value: number; lowerIsGood?: boolean }) {
  return <span className={`font-medium tabular-nums ${gapCls(value, lowerIsGood)}`}>{formatDecimal(value)}</span>;
}

function UphBadge({ gap }: { gap: number }) {
  const hit = gap >= 0;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
        hit
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
      }`}
    >
      {hit ? "Capai" : "Gagal"}
    </span>
  );
}

function HcBadge({ gap }: { gap: number }) {
  const meta =
    gap < 0
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : gap > 0
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
        : "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400";
  const label = gap < 0 ? "Hemat" : gap > 0 ? "Berlebih" : "Sesuai";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${meta}`}>
      {label}
    </span>
  );
}

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TH_LEFT = TH_CLS;
const TH_RIGHT = `${TH_CLS} text-right`;
const TD = "px-3 py-2 text-xs whitespace-nowrap tabular-nums";
const TD_LEFT = `${TD} text-left`;
const TD_RIGHT = `${TD} text-right`;
const ROW_CLS =
  "odd:bg-slate-950/[0.02] transition-colors hover:bg-cyan-500/[0.05] dark:odd:bg-white/[0.02]";
const TOTAL_ROW_CLS =
  "bg-cyan-500/10 text-slate-800 dark:bg-cyan-500/[0.08] dark:text-cyan-100";

const KPI_TONES = {
  cyan: { value: "text-cyan-700 dark:text-cyan-400", strip: "from-cyan-500 to-blue-700" },
  emerald: { value: "text-emerald-600 dark:text-emerald-400", strip: "from-emerald-500 to-teal-700" },
  rose: { value: "text-rose-600 dark:text-rose-400", strip: "from-rose-500 to-red-700" },
  slate: { value: "text-slate-800 dark:text-slate-100", strip: "from-slate-400 to-slate-600" },
} as const;

function KpiCard({
  label,
  value,
  num,
  suffix,
  sub,
  tone,
}: {
  label: string;
  value: string;
  num?: number;
  suffix?: string;
  sub?: string;
  tone: keyof typeof KPI_TONES;
}) {
  const t = KPI_TONES[tone];
  const animated = useCountUp(num ?? 0);
  return (
    <div className="glass-card relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.strip}`} />
      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight tabular-nums ${t.value}`}>
        {num !== undefined ? (
          <>
            {formatNumber(animated)}
            {suffix}
          </>
        ) : (
          value
        )}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function EmptyNote({ text = "Tidak ada data pada rentang ini" }: { text?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-8 text-center dark:border-white/15">
      <p className="text-xs text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function TableCard({
  title,
  subtitle,
  minW,
  maxH = "max-h-72",
  leftCols = 1,
  empty,
  headers,
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  minW: string;
  maxH?: string;
  leftCols?: number;
  empty: boolean;
  headers: string[];
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <section className="glass-card flex min-h-0 flex-col p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {headerRight}
      </div>
      {empty ? (
        <div className="mt-3">
          <EmptyNote />
        </div>
      ) : (
        <div className={`mt-3 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5 ${maxH}`}>
          <table className={`w-full ${minW} border-collapse text-left`}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={h} className={i < leftCols ? TH_LEFT : TH_RIGHT}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Grup Daily Production per (tanggal, model, shift) — agregasi inline dari
// record terfilter (summary hanya menyediakan per-tanggal dan per-model).
type DailyGroup = {
  date: string;
  model: string;
  shift: string | null;
  plan: number;
  output: number;
  uphResult: number;
  hcActual: number;
};

function buildDailyGroups(records: Parameters<typeof applyFilters>[0]): DailyGroup[] {
  const m = new Map<string, DailyGroup>();
  for (const r of records) {
    const key = `${r.date}|${r.model}|${r.shift ?? ""}`;
    const g = m.get(key) ?? { date: r.date, model: r.model, shift: r.shift, plan: 0, output: 0, uphResult: 0, hcActual: 0 };
    g.plan += r.plan;
    g.output += r.outputProd;
    g.uphResult += r.uphResult;
    g.hcActual += r.hcActual;
    m.set(key, g);
  }
  return [...m.values()].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.model.localeCompare(b.model) || (a.shift ?? "").localeCompare(b.shift ?? "")
  );
}

const chipBase = "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";
const chipActive = "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400";
const chipIdle =
  "border-slate-950/15 text-slate-600 hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10";

export default function DashboardPage() {
  const session = useSessionGuard("dashboard.view");

  const [records, setRecords] = useState<MockProductionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  useEffect(() => {
    let alive = true;
    fetchAllRecords()
      .then((rs) => {
        if (alive) setRecords(rs);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : "Gagal memuat data.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const dates = useMemo(() => uniqueDates(records), [records]);
  const models = useMemo(() => uniqueModels(records), [records]);
  const areas = useMemo(() => uniqueAreas(records), [records]);
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const summary = useMemo(() => buildDashboardSummary(filtered), [filtered]);
  const dailyGroups = useMemo(() => buildDailyGroups(filtered), [filtered]);

  // Working Hour & Setup Packing tidak ada di summary.byModel — agregasi
  // inline per model, digabung dengan data summary.
  const setupExtra = useMemo(() => {
    const m = new Map<string, { workingHour: number; setupPacking: number }>();
    for (const r of filtered) {
      const e = m.get(r.model) ?? { workingHour: 0, setupPacking: 0 };
      e.workingHour += r.workingHour;
      e.setupPacking += r.totalSetupPacking;
      m.set(r.model, e);
    }
    return m;
  }, [filtered]);

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const { user } = session;
  const roleLabel = ROLE_LABELS[user.role.name] ?? user.role.name;
  const noData = filtered.length === 0;

  const now = new Date();
  const presets = [
    { key: "today", label: "Hari Ini", range: presetToday(now) },
    { key: "week", label: "Minggu Ini", range: presetLastNDays(7, now) },
    { key: "month", label: "Bulan Ini", range: presetMonthToDate(now) },
  ];

  // Total tiap tabel dihitung DARI total (bukan jumlah gap per baris) — formula Excel.
  const dailyTotal = {
    output: dailyGroups.reduce((a, g) => a + g.output, 0),
    uphResult: dailyGroups.reduce((a, g) => a + g.uphResult, 0),
    hcActual: dailyGroups.reduce((a, g) => a + g.hcActual, 0),
    plan: dailyGroups.reduce((a, g) => a + g.plan, 0),
  };
  const dailyGapOp = round2(dailyTotal.output - dailyTotal.plan);
  const dailyUpph = dailyTotal.hcActual === 0 ? null : round2(dailyTotal.uphResult / dailyTotal.hcActual);

  const setupTotal = { workingHour: 0, setupPacking: 0 };
  for (const e of setupExtra.values()) {
    setupTotal.workingHour += e.workingHour;
    setupTotal.setupPacking += e.setupPacking;
  }

  const planPct = (plan: number, output: number) => (plan > 0 ? (output / plan) * 100 : 0);
  const planPctTotal = planPct(summary.plan, summary.output);
  const uphGapTotal = round2(summary.uphResult - summary.uphTarget);
  const hcGapTotal = round2(summary.hcActual - summary.hcStandard);
  const upphTotal = summary.hcActual === 0 ? null : round2(summary.uphResult / summary.hcActual);

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      {/* Judul halaman: subtitle tanggal + badge role/sesi */}
      <section className="glass-card relative overflow-hidden p-4">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Dashboard Produksi</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                {roleLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {dateContext.format(new Date())} · data dari database{loadError ? ` · ${loadError}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-slate-950/10 py-1 pr-3 pl-1 sm:flex dark:border-white/10">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-500/20 font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                {initials(user.name)}
              </span>
              <span className="text-xs font-medium">{user.name}</span>
            </span>
            <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1.5 text-xs font-semibold tabular-nums dark:border-white/10 dark:bg-white/[0.03]">
              {records.length} record
            </span>
          </div>
        </div>
      </section>

      {/* Filter bar: rentang tanggal + model/area + chip cepat */}
      <section className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Filter Data</h2>
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, from: p.range.from, to: p.range.to }))}
                className={`${chipBase} ${isPresetActive(filters, p.range) ? chipActive : chipIdle}`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, from: null, to: null }))}
              className={`${chipBase} ${filters.from === null && filters.to === null ? chipActive : chipIdle}`}
            >
              Semua
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <DateRangeFilter
            value={{ from: filters.from, to: filters.to }}
            minDate={dates[0] ?? ""}
            maxDate={dates[dates.length - 1] ?? ""}
            disabled={records.length === 0}
            onChange={(range) => setFilters((f) => ({ ...f, ...range }))}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Model
            </span>
            <select
              value={filters.model ?? ""}
              disabled={records.length === 0}
              onChange={(e) => setFilters((f) => ({ ...f, model: e.target.value || null }))}
              className={`${inputClass} min-w-40`}
            >
              <option value="">Semua Model</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Area
            </span>
            <select
              value={filters.area ?? ""}
              disabled={records.length === 0}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || null }))}
              className={`${inputClass} min-w-44`}
            >
              <option value="">Semua Area</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-[11px] text-slate-500 dark:text-slate-400">
            Menampilkan <span className="font-semibold tabular-nums">{filtered.length}</span> dari{" "}
            <span className="font-semibold tabular-nums">{records.length}</span> record
          </p>
        </div>
      </section>

      {/* Baris KPI — dihitung dari data, bukan hardcode */}
      <section className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Output" num={summary.output} value={formatNumber(summary.output)} sub={`${summary.count} record`} tone="cyan" />
        <KpiCard
          label="GAP OP"
          num={summary.gapOp}
          value={fmtSigned(summary.gapOp)}
          sub="Σ Output − Σ Plan"
          tone={summary.gapOp >= 0 ? "emerald" : "rose"}
        />
        <KpiCard
          label="Rata-rata UPPH"
          num={summary.upph ?? undefined}
          value={formatDecimal(summary.upph)}
          sub="Σ UPH Result ÷ Σ HC Actual"
          tone="slate"
        />
        <KpiCard
          label="Hit-rate UPH Target"
          num={summary.hitRateUph}
          suffix="%"
          value={`${formatDecimal(summary.hitRateUph)}%`}
          sub="record dgn GAP UPH ≥ 0"
          tone="cyan"
        />
        <KpiCard label="Total Setup" num={summary.setup} suffix=" mnt" value={`${formatNumber(summary.setup)} mnt`} sub="Σ Setup" tone="slate" />
      </section>

      {/* Baris atas — 3 tabel sejajar */}
      <section className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 1. Daily Production Table */}
        <TableCard
          title="Daily Production"
          subtitle="Per tanggal · model · shift"
          minW="min-w-[32rem]"
          maxH="max-h-72"
          leftCols={3}
          empty={noData}
          headers={["Tanggal", "Model", "Shift", "UPH Result", "Output", "GAP OP", "UPPH"]}
        >
          {dailyGroups.map((g) => (
            <tr key={`${g.date}|${g.model}|${g.shift ?? ""}`} className={ROW_CLS}>
              <td className={TD_LEFT}>{g.date}</td>
              <td className={`${TD_LEFT} font-semibold`}>{g.model}</td>
              <td className={TD_LEFT}>{g.shift ?? "—"}</td>
              <td className={TD_RIGHT}>{formatNumber(g.uphResult)}</td>
              <td className={TD_RIGHT}>{formatNumber(g.output)}</td>
              <td className={TD_RIGHT}>
                <GapCell value={round2(g.output - g.plan)} />
              </td>
              <td className={TD_RIGHT}>
                {formatDecimal(g.hcActual === 0 ? null : round2(g.uphResult / g.hcActual))}
              </td>
            </tr>
          ))}
          <tr className={TOTAL_ROW_CLS}>
            <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase" colSpan={3}>
              Total · {dailyGroups.length} grup
            </td>
            <td className={TD_RIGHT}>{formatNumber(dailyTotal.uphResult)}</td>
            <td className={TD_RIGHT}>{formatNumber(dailyTotal.output)}</td>
            <td className={`${TD_RIGHT} font-bold`}>
              <GapCell value={dailyGapOp} />
            </td>
            <td className={`${TD_RIGHT} font-bold`}>{formatDecimal(dailyUpph)}</td>
          </tr>
        </TableCard>

        {/* 2. Plan vs Output */}
        <TableCard
          title="Plan vs Output"
          subtitle="Per model · % = Output ÷ Plan"
          minW="min-w-[18rem]"
          maxH="max-h-72"
          empty={noData}
          headers={["Model", "Plan", "Output", "GAP OP", "%"]}
        >
          {summary.byModel.map((m: ModelGroup) => {
            const pct = planPct(m.plan, m.output);
            return (
              <tr key={m.model} className={ROW_CLS}>
                <td className={`${TD_LEFT} font-semibold`}>{m.model}</td>
                <td className={TD_RIGHT}>{formatNumber(m.plan)}</td>
                <td className={TD_RIGHT}>{formatNumber(m.output)}</td>
                <td className={TD_RIGHT}>
                  <GapCell value={m.gapOp} />
                </td>
                <td className={`${TD_RIGHT} max-w-24`}>
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-950/10 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full ${m.gapOp >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold">{formatNumber(pct)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className={TOTAL_ROW_CLS}>
            <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
            <td className={TD_RIGHT}>{formatNumber(summary.plan)}</td>
            <td className={TD_RIGHT}>{formatNumber(summary.output)}</td>
            <td className={`${TD_RIGHT} font-bold`}>
              <GapCell value={summary.gapOp} />
            </td>
            <td className={`${TD_RIGHT} font-bold`}>{formatNumber(planPctTotal)}%</td>
          </tr>
        </TableCard>

        {/* 3. UPH Performance */}
        <TableCard
          title="UPH Performance"
          subtitle="Per model · rata-rata Result vs Target"
          minW="min-w-[18rem]"
          maxH="max-h-72"
          empty={noData}
          headers={["Model", "UPH Target", "UPH Result", "GAP UPH", "Status"]}
        >
          {summary.byModel.map((m: ModelGroup) => (
            <tr key={m.model} className={ROW_CLS}>
              <td className={`${TD_LEFT} font-semibold`}>{m.model}</td>
              <td className={TD_RIGHT}>{formatNumber(m.uphTargetAvg)}</td>
              <td className={TD_RIGHT}>{formatNumber(m.uphResultAvg)}</td>
              <td className={TD_RIGHT}>
                <GapCell value={m.gapUphAvg} />
              </td>
              <td className={TD_RIGHT}>
                <UphBadge gap={m.gapUphAvg} />
              </td>
            </tr>
          ))}
          <tr className={TOTAL_ROW_CLS}>
            <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
            <td className={TD_RIGHT}>{formatNumber(summary.uphTarget)}</td>
            <td className={TD_RIGHT}>{formatNumber(summary.uphResult)}</td>
            <td className={`${TD_RIGHT} font-bold`}>
              <GapCell value={uphGapTotal} />
            </td>
            <td className={TD_RIGHT}>
              <UphBadge gap={uphGapTotal} />
            </td>
          </tr>
        </TableCard>
      </section>

      {/* Baris bawah — 2 tabel */}
      <section className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 4. HC Performance */}
        <TableCard
          title="HC Performance"
          subtitle="Per model · GAP HC negatif = hemat"
          minW="min-w-[22rem]"
          maxH="max-h-64"
          empty={noData}
          headers={["Model", "HC Std", "HC Act", "GAP HC", "Status"]}
        >
          {summary.byModel.map((m: ModelGroup) => (
            <tr key={m.model} className={ROW_CLS}>
              <td className={`${TD_LEFT} font-semibold`}>{m.model}</td>
              <td className={TD_RIGHT}>{formatNumber(m.hcStandard)}</td>
              <td className={TD_RIGHT}>{formatNumber(m.hcActual)}</td>
              <td className={TD_RIGHT}>
                <GapCell value={m.gapHc} lowerIsGood />
              </td>
              <td className={TD_RIGHT}>
                <HcBadge gap={m.gapHc} />
              </td>
            </tr>
          ))}
          <tr className={TOTAL_ROW_CLS}>
            <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
            <td className={TD_RIGHT}>{formatNumber(summary.hcStandard)}</td>
            <td className={TD_RIGHT}>{formatNumber(summary.hcActual)}</td>
            <td className={`${TD_RIGHT} font-bold`}>
              <GapCell value={hcGapTotal} lowerIsGood />
            </td>
            <td className={TD_RIGHT}>
              <HcBadge gap={hcGapTotal} />
            </td>
          </tr>
        </TableCard>

        {/* 5. Setup & UPPH */}
        <TableCard
          title="Setup & UPPH"
          subtitle="Per model · menit"
          minW="min-w-[22rem]"
          maxH="max-h-64"
          empty={noData}
          headers={["Model", "Total Setup", "Working Hour", "Setup Packing", "UPPH"]}
        >
          {summary.byModel.map((m: ModelGroup) => {
            const extra = setupExtra.get(m.model) ?? { workingHour: 0, setupPacking: 0 };
            return (
              <tr key={m.model} className={ROW_CLS}>
                <td className={`${TD_LEFT} font-semibold`}>{m.model}</td>
                <td className={TD_RIGHT}>{formatNumber(m.setup)}</td>
                <td className={TD_RIGHT}>{formatNumber(extra.workingHour)}</td>
                <td className={TD_RIGHT}>{formatNumber(extra.setupPacking)}</td>
                <td className={`${TD_RIGHT} font-medium`}>{formatDecimal(m.upph)}</td>
              </tr>
            );
          })}
          <tr className={TOTAL_ROW_CLS}>
            <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
            <td className={TD_RIGHT}>{formatNumber(summary.setup)}</td>
            <td className={TD_RIGHT}>{formatNumber(setupTotal.workingHour)}</td>
            <td className={TD_RIGHT}>{formatNumber(setupTotal.setupPacking)}</td>
            <td className={`${TD_RIGHT} font-bold`}>{formatDecimal(upphTotal)}</td>
          </tr>
        </TableCard>
      </section>
    </main>
  );
}
