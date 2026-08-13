"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendLineChart, TREND_COLORS } from "@/components/trend-line-chart";
import { TrendDateFilter } from "@/components/trend-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { formatDateShort, formatDecimal, formatNumber } from "@/lib/production-table/format";
import { presetLastNDays, type DateRangeFilter } from "@/lib/dashboard/filters";
import type { TrendPoint } from "@/lib/trends/series";
import type { PeriodComparison, PeriodDelta, PeriodMetrics } from "@/lib/trends/compare";

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const UPHR_SERIE = [
  { key: "uphResult", label: "UPH Result", color: TREND_COLORS.emerald, get: (p: TrendPoint) => p.uphResult },
];
const OUTPUT_SERIE = [
  { key: "output", label: "Output Prod", color: TREND_COLORS.cyan, get: (p: TrendPoint) => p.outputProd },
];
const HC_SERIES = [
  { key: "hcStandard", label: "HC Standard", color: TREND_COLORS.amber, get: (p: TrendPoint) => p.hcStandard },
  { key: "hcActual", label: "HC Actual", color: TREND_COLORS.violet, get: (p: TrendPoint) => p.hcActual },
];
const SETUP_SERIE = [
  { key: "setup", label: "Total Setup", color: TREND_COLORS.rose, get: (p: TrendPoint) => p.totalSetup },
];

function toneFor(percent: number, lowerIsGood: boolean): "emerald" | "rose" {
  const good = percent > 0 ? !lowerIsGood : lowerIsGood;
  return good ? "emerald" : "rose";
}

function DeltaBadge({ delta, lowerIsGood }: { delta: PeriodDelta; lowerIsGood: boolean }) {
  const pct = delta.percent;
  const cls =
    pct === null
      ? "border-slate-950/10 bg-slate-950/[0.03] text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400"
      : toneFor(pct, lowerIsGood) === "emerald"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  const text =
    pct === null ? "—" : `${pct >= 0 ? "+" : ""}${formatDecimal(pct)}%`;
  return (
    <span
      title={delta.absolute === null ? "Tidak bisa dihitung" : `Selisih absolut: ${formatNumber(delta.absolute)}`}
      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${cls}`}
    >
      {text}
    </span>
  );
}

type CompareRow = {
  key: string;
  label: string;
  get: (m: PeriodMetrics) => string;
  delta: PeriodDelta;
  lowerIsGood: boolean;
};

function ComparePanel({ comparison, from, to }: { comparison: PeriodComparison; from: string; to: string }) {
  const { current, previous, deltas } = comparison;
  const rows: CompareRow[] = [
    {
      key: "output",
      label: "Output Total",
      get: (m) => formatNumber(m.totalOutput),
      delta: deltas.output,
      lowerIsGood: false,
    },
    {
      key: "upph",
      label: "UPPH Rata-rata",
      get: (m) => formatDecimal(m.avgUpph),
      delta: deltas.upph,
      lowerIsGood: false,
    },
    { key: "setup", label: "Total Setup", get: (m) => formatNumber(m.totalSetup), delta: deltas.setup, lowerIsGood: true },
    { key: "hc", label: "HC Rata-rata", get: (m) => formatDecimal(m.avgHc), delta: deltas.hc, lowerIsGood: true },
  ];
  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Perbandingan Periode</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {formatDateShort(from)} — {formatDateShort(to)} vs periode {comparison.windowDays} hari sama sebelumnya
            ({formatDateShort(comparison.previousFrom)} — {formatDateShort(comparison.previousTo)})
          </p>
        </div>
        <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          Jendela {comparison.windowDays} hari
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[520px] grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-x-3 gap-y-2 text-[11px]">
          <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Metrik</span>
          <span className="text-[10px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">Periode Ini</span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Periode Sebelumnya
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Delta</span>
          {rows.map((r) => (
            <div key={r.key} className="contents">
              <span className="py-1 font-medium text-slate-600 dark:text-slate-300">{r.label}</span>
              <span className="py-1 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{r.get(current)}</span>
              <span className="py-1 tabular-nums text-slate-500 dark:text-slate-400">{r.get(previous)}</span>
              <span className="py-1">
                <DeltaBadge delta={r.delta} lowerIsGood={r.lowerIsGood} />
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 border-t border-slate-950/5 pt-2 text-[10px] text-slate-500 dark:border-white/5 dark:text-slate-400">
        UPPH = Σ UPH Result ÷ Σ HC Actual · HC rata-rata = Σ HC Actual ÷ jumlah record · delta % dihitung dari nilai
        periode sebelumnya (0/null → &ldquo;—&rdquo;)
      </p>
    </section>
  );
}

export default function AnalisisTrenPage() {
  const session = useSessionGuard("dashboard.view");

  const [allPoints, setAllPoints] = useState<TrendPoint[]>([]);
  const [series, setSeries] = useState<TrendPoint[]>([]);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [range, setRange] = useState<DateRangeFilter>(() => presetLastNDays(7));

  // Data dari server: /api/trends/series (agregasi Σ per tanggal) & /api/trends/compare.
  useEffect(() => {
    let alive = true;
    fetch("/api/trends/series")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Gagal memuat tren (${res.status}).`))))
      .then((data: { points: TrendPoint[] }) => {
        if (alive) setAllPoints(data.points);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const dates = useMemo(() => allPoints.map((p) => p.date), [allPoints]);

  const effFrom = range.from ?? dates[0] ?? null;
  const effTo = range.to ?? dates[dates.length - 1] ?? null;

  useEffect(() => {
    let alive = true;
    if (effFrom === null || effTo === null) {
      return;
    }
    const q = new URLSearchParams({ from: effFrom, to: effTo });
    Promise.all([
      fetch(`/api/trends/series?${q}`).then((res) => (res.ok ? res.json() : Promise.reject(new Error("Gagal memuat tren.")))),
      fetch(`/api/trends/compare?${q}`).then((res) => (res.ok ? res.json() : Promise.reject(new Error("Gagal memuat perbandingan.")))),
    ])
      .then(([s, c]: [{ points: TrendPoint[] }, PeriodComparison]) => {
        if (!alive) return;
        setSeries(s.points);
        setComparison(c);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [effFrom, effTo]);

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const noData = series.length === 0;

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Analisis Tren</h1>
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    Trend Analysis
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tren UPH, output, HC &amp; setup per tanggal dibandingkan dengan periode sebelumnya — agregasi
                  server dari database (/api/trends).
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {dates.length} tanggal · {series.length} titik · {formatDateShort(dates[dates.length - 1] ?? "")}
              </span>
            </div>
          </div>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-sm font-semibold tracking-tight">Filter Rentang Waktu</h2>
          <div className="mt-3">
            <TrendDateFilter
              value={range}
              minDate={dates[0] ?? ""}
              maxDate={dates[dates.length - 1] ?? ""}
              disabled={dates.length === 0}
              onChange={setRange}
            />
          </div>
          <p className="mt-3 border-t border-slate-950/5 pt-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
            Filter diterapkan SEBELUM agregasi (grafik &amp; perbandingan dihitung dari rentang yang tersaring:{" "}
            <span className="font-semibold tabular-nums">{series.length}</span> dari{" "}
            <span className="font-semibold tabular-nums">{dates.length}</span> tanggal)
          </p>
        </section>

        {noData ? (
          <section className="glass-card p-6">
            <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-16 text-center dark:border-white/15">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tidak ada data pada rentang ini</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Ubah rentang waktu atau pilih preset &ldquo;Semua&rdquo; untuk melihat tren.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-6 md:grid-cols-2">
              <Panel title="Tren UPH (Result)" subtitle="Σ UPH Result per tanggal (konvensi baris total)">
                <TrendLineChart points={series} series={UPHR_SERIE} formatValue={formatNumber} />
              </Panel>
              <Panel title="Tren Output Prod" subtitle="Σ Output Prod per tanggal (unit)">
                <TrendLineChart points={series} series={OUTPUT_SERIE} formatValue={formatNumber} />
              </Panel>
              <Panel title="Tren HC (Actual vs Standard)" subtitle="Σ HC per tanggal — actual vs standard">
                <TrendLineChart points={series} series={HC_SERIES} formatValue={formatNumber} />
              </Panel>
              <Panel title="Tren Setup Time" subtitle="Σ Total Setup per tanggal (menit)">
                <TrendLineChart points={series} series={SETUP_SERIE} formatValue={formatNumber} />
              </Panel>
            </section>

            {comparison && (
              <ComparePanel comparison={comparison} from={effFrom ?? ""} to={effTo ?? ""} />
            )}
          </>
        )}
      </main>
  );
}