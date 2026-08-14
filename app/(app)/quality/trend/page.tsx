"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";

// Quality Trend - grafik yield % dan defect rate % per tanggal dari
// GET /api/quality/summary (summary.trend), murni SVG.

type QualityTrendPoint = { date: string; yieldPct: number; defectRatePct: number };

type SummaryResponse = {
  summary: {
    totals: unknown;
    byDate: unknown[];
    byModel: unknown[];
    pareto: unknown[];
    trend: QualityTrendPoint[];
  };
};

type TrendFilters = {
  from: string | null;
  to: string | null;
  model: string | null;
  area: string | null;
};

const EMPTY_FILTERS: TrendFilters = { from: null, to: null, model: null, area: null };

const decFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmtPct = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? "-" : `${decFmt.format(v)}%`;

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";
const labelClass = "text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400";

const TH_LEFT =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TH_RIGHT = `${TH_LEFT} text-right`;
const TD_LEFT = "px-3 py-2 text-xs whitespace-nowrap text-left tabular-nums";
const TD_RIGHT = "px-3 py-2 text-xs whitespace-nowrap text-right tabular-nums";
const ROW_CLS = "odd:bg-slate-950/[0.02] transition-colors hover:bg-cyan-500/[0.05] dark:odd:bg-white/[0.02]";

function TrendChart({ points }: { points: QualityTrendPoint[] }) {
  const W = 760;
  const H = 320;
  const PAD_L = 44;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 40;
  if (points.length === 0) return null;
  const maxY = Math.ceil(
    Math.max(100, ...points.map((p) => p.yieldPct), ...points.map((p) => p.defectRatePct)) / 10
  ) * 10;
  const minY = 0;
  const spanY = Math.max(1, maxY - minY);
  const n = points.length;
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, n - 1);
  const y = (v: number) => PAD_T + (1 - (v - minY) / spanY) * (H - PAD_T - PAD_B);
  const line = (key: "yieldPct" | "defectRatePct") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + (maxY - minY) * t);
  const labelStep = Math.ceil(n / 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik tren kualitas">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="stroke-slate-950/10 dark:stroke-white/10" strokeWidth={1} />
          <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[9px]" fontFamily="monospace">
            {Math.round(t)}%
          </text>
        </g>
      ))}
      <path d={line("yieldPct")} fill="none" stroke="#06b6d4" strokeWidth={2} />
      <path d={line("defectRatePct")} fill="none" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 3" />
      {points.map((p, i) =>
        i % labelStep === 0 || i === n - 1 ? (
          <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[8px]" fontFamily="monospace">
            {p.date}
          </text>
        ) : null
      )}
      {points.map((p, i) => (
        <g key={`${p.date}-yield`}>
          <circle cx={x(i)} cy={y(p.yieldPct)} r={3} className="fill-cyan-500">
            <title>{`${p.date}: yield ${fmtPct(p.yieldPct)}`}</title>
          </circle>
        </g>
      ))}
      {points.map((p, i) => (
        <g key={`${p.date}-defect`}>
          <circle cx={x(i)} cy={y(p.defectRatePct)} r={2.5} className="fill-rose-500">
            <title>{`${p.date}: defect rate ${fmtPct(p.defectRatePct)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

export default function QualityTrendPage() {
  const session = useSessionGuard("quality.view");
  const authed = session !== null;

  const [trend, setTrend] = useState<QualityTrendPoint[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TrendFilters>(EMPTY_FILTERS);

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetch("/api/users?perPage=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: Array<{ id: string; name: string; area: { id: string; name: string } | null }> } | null) => {
        if (!alive || !data?.items) return;
        const seen = new Map<string, { id: string; name: string }>();
        for (const u of data.items) {
          if (u.area && !seen.has(u.area.id)) seen.set(u.area.id, { id: u.area.id, name: u.area.name });
        }
        setUsers([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    const qs = new URLSearchParams();
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    if (filters.model) qs.set("model", filters.model);
    if (filters.area) qs.set("area", filters.area);
    fetch(`/api/quality/summary?${qs.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat ringkasan (${res.status}).`);
        return res.json() as Promise<SummaryResponse>;
      })
      .then((data) => {
        if (!alive) return;
        const s = data.summary;
        setTrend(Array.isArray(s.trend) ? s.trend : []);
        setModels(
          (Array.isArray(s.byModel) ? s.byModel : [])
            .map((m) => (m && typeof m === "object" && "model" in m ? String((m as { model: unknown }).model) : ""))
            .filter((m) => m !== "")
            .sort((a, b) => a.localeCompare(b))
        );
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : "Gagal memuat data.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authed, filters]);

  const avgYield = useMemo(() => {
    if (trend.length === 0) return null;
    const sum = trend.reduce((a, p) => a + p.yieldPct, 0);
    return sum / trend.length;
  }, [trend]);
  const avgDefectRate = useMemo(() => {
    if (trend.length === 0) return null;
    const sum = trend.reduce((a, p) => a + p.defectRatePct, 0);
    return sum / trend.length;
  }, [trend]);

  const applyFilters = (patch: Partial<TrendFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLoading(true);
  };

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <section className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Quality Trend</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Yield % vs defect rate % per tanggal dari summary.trend - SVG murni
              {loadError ? ` - ${loadError}` : ""}.
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtPct(avgYield)} yield rata-rata
          </span>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="text-sm font-semibold tracking-tight">Filter Data</h2>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <DateRangeFilter
            value={{ from: filters.from, to: filters.to }}
            minDate=""
            maxDate=""
            disabled={loading}
            onChange={(range) => applyFilters({ ...range })}
          />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Model</span>
            <select
              value={filters.model ?? ""}
              disabled={loading}
              onChange={(e) => applyFilters({ model: e.target.value || null })}
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
            <span className={labelClass}>Area</span>
            <select
              value={filters.area ?? ""}
              disabled={loading}
              onChange={(e) => applyFilters({ area: e.target.value || null })}
              className={`${inputClass} min-w-44`}
            >
              <option value="">Semua Area</option>
              {users.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <p className="pb-2 text-[11px] text-slate-500 dark:text-slate-400">
            {trend.length} titik data - defect rate rata-rata {fmtPct(avgDefectRate)}
          </p>
        </div>
      </section>

      {loading ? (
        <section className="glass-card space-y-2 p-4">
          <div className="shimmer h-4 w-1/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
          <div className="shimmer h-4 w-1/2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
        </section>
      ) : (
        <>
          <section className="glass-card p-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight">Tren Harian</h2>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Arahkan kursor ke titik untuk nilai persis</p>
            </div>
            <div className="mt-3">
              {trend.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-12 text-center dark:border-white/15">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada data tren pada rentang ini</p>
                </div>
              ) : (
                <TrendChart points={trend} />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-cyan-500" /> Yield %
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 border-t-2 border-dashed border-rose-500" /> Defect Rate %
              </span>
            </div>
          </section>

          <section className="glass-card p-4">
            <h2 className="text-[13px] font-semibold tracking-tight">Tabel Tren</h2>
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[24rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={TH_LEFT}>Tanggal</th>
                    <th className={TH_RIGHT}>Yield %</th>
                    <th className={TH_RIGHT}>Defect Rate %</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trend]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((p) => (
                      <tr key={p.date} className={ROW_CLS}>
                        <td className={`${TD_LEFT} font-medium tabular-nums`}>{p.date}</td>
                        <td className={`${TD_RIGHT} font-medium text-emerald-600 dark:text-emerald-400`}>{fmtPct(p.yieldPct)}</td>
                        <td className={`${TD_RIGHT} font-medium text-rose-600 dark:text-rose-400`}>{fmtPct(p.defectRatePct)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
