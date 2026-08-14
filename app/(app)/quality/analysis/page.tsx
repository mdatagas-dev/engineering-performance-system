"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";

// Analisis Pareto - chart bar + garis kumulatif murni SVG dari
// GET /api/quality/summary (summary.pareto), tanpa library chart.

type QualityTotals = {
  inspected: number;
  passed: number;
  failed: number;
  defectCount: number;
  yieldPct: number;
  passRatePct: number;
  rejectRatePct: number;
  defectRatePct: number;
};

type QualityParetoItem = {
  rank: number;
  defectCode: string;
  defectName: string;
  quantity: number;
  percentPct: number;
  cumulativePct: number;
};

type SummaryResponse = {
  summary: {
    totals: QualityTotals;
    byDate: unknown[];
    byModel: unknown[];
    pareto: QualityParetoItem[];
    trend: unknown[];
  };
};

type AnalysisFilters = {
  from: string | null;
  to: string | null;
  model: string | null;
  area: string | null;
};

const EMPTY_FILTERS: AnalysisFilters = { from: null, to: null, model: null, area: null };
const EMPTY_TOTALS: QualityTotals = {
  inspected: 0,
  passed: 0,
  failed: 0,
  defectCount: 0,
  yieldPct: 0,
  passRatePct: 0,
  rejectRatePct: 0,
  defectRatePct: 0,
};

const numFmt = new Intl.NumberFormat("id-ID");
const decFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmtInt = (v: number): string => numFmt.format(v);
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

function ParetoChart({ pareto }: { pareto: QualityParetoItem[] }) {
  const W = 760;
  const H = 320;
  const PAD_L = 48;
  const PAD_R = 52;
  const PAD_T = 12;
  const PAD_B = 40;
  if (pareto.length === 0) return null;
  const maxQ = Math.max(...pareto.map((p) => p.quantity), 1);
  const n = pareto.length;
  const bw = (W - PAD_L - PAD_R) / n;
  const barW = Math.max(8, bw * 0.6);
  const x = (i: number) => PAD_L + i * bw + (bw - barW) / 2;
  const y = (v: number) => PAD_T + (1 - v / maxQ) * (H - PAD_T - PAD_B);
  const cy = (pct: number) => PAD_T + (1 - pct / 100) * (H - PAD_T - PAD_B);
  const cx = (i: number) => PAD_L + i * bw + bw / 2;
  const cumPath = pareto
    .map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${cy(p.cumulativePct).toFixed(1)}`)
    .join(" ");
  const qtyTicks = [0, 0.5, 1].map((t) => maxQ * t);
  const cumTicks = [0, 25, 50, 75, 100];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pareto chart defect">
      {qtyTicks.map((t) => (
        <g key={`q${t}`}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} className="stroke-slate-950/10 dark:stroke-white/10" strokeWidth={1} />
          <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400 text-[9px]" fontFamily="monospace">
            {fmtInt(Math.round(t))}
          </text>
        </g>
      ))}
      {cumTicks.map((t) => (
        <text key={`c${t}`} x={W - PAD_R + 8} y={cy(t) + 3} className="fill-rose-400 text-[9px]" fontFamily="monospace">
          {t}%
        </text>
      ))}
      {pareto.map((p, i) => (
        <g key={`${p.rank}-${p.defectCode}`}>
          <rect x={x(i)} y={y(p.quantity)} width={barW} height={y(0) - y(p.quantity)} className="fill-cyan-500/70">
            <title>{`${p.defectCode}: ${p.defectName} - ${fmtInt(p.quantity)} (${fmtPct(p.percentPct)})`}</title>
          </rect>
          {n <= 14 && (
            <text
              x={cx(i)}
              y={H - 6}
              textAnchor="middle"
              className="fill-slate-400 text-[8px]"
              fontFamily="monospace"
              transform={`rotate(-35 ${cx(i)} ${H - 6})`}
            >
              {p.defectCode}
            </text>
          )}
        </g>
      ))}
      <path d={cumPath} fill="none" stroke="#f43f5e" strokeWidth={2} />
      {pareto.map((p, i) => (
        <circle key={`${p.rank}-${p.defectCode}-dot`} cx={cx(i)} cy={cy(p.cumulativePct)} r={2.5} className="fill-rose-500">
          <title>{`Kumulatif ${p.rank}: ${fmtPct(p.cumulativePct)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

export default function QualityAnalysisPage() {
  const session = useSessionGuard("quality.view");
  const authed = session !== null;

  const [totals, setTotals] = useState<QualityTotals>(EMPTY_TOTALS);
  const [pareto, setPareto] = useState<QualityParetoItem[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AnalysisFilters>(EMPTY_FILTERS);

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
        setTotals(s.totals ?? EMPTY_TOTALS);
        setPareto(Array.isArray(s.pareto) ? s.pareto : []);
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

  const topFive = useMemo(
    () => pareto.slice(0, 5).reduce((a, p) => a + p.quantity, 0),
    [pareto]
  );
  const topFiveShare = useMemo(
    () => (totals.defectCount > 0 ? (topFive / totals.defectCount) * 100 : 0),
    [topFive, totals.defectCount]
  );

  const applyFilters = (patch: Partial<AnalysisFilters>) => {
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
              <h1 className="text-xl font-bold tracking-tight">Analisis Pareto</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Bar = kuantitas defect - garis merah = kumulatif % - SVG murni, tanpa library
              {loadError ? ` - ${loadError}` : ""}.
            </p>
          </div>
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
        </div>
      </section>

      {loading ? (
        <section className="glass-card space-y-2 p-4">
          <div className="shimmer h-4 w-1/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
          <div className="shimmer h-4 w-1/2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <div className="glass-card p-4">
              <p className={labelClass}>Jumlah Defect</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(totals.defectCount)}</p>
            </div>
            <div className="glass-card p-4">
              <p className={labelClass}>Inspeksi</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(totals.inspected)}</p>
            </div>
            <div className="glass-card p-4">
              <p className={labelClass}>Gagal</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(totals.failed)}</p>
            </div>
            <div className="glass-card p-4">
              <p className={labelClass}>Defect Rate</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">{fmtPct(totals.defectRatePct)}</p>
            </div>
            <div className="glass-card p-4">
              <p className={labelClass}>Yield</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{fmtPct(totals.yieldPct)}</p>
            </div>
            <div className="glass-card p-4">
              <p className={labelClass}>Top 5 Share</p>
              <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtPct(topFiveShare)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{fmtInt(topFive)} defect</p>
            </div>
          </section>

          <section className="glass-card p-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight">Pareto Defect</h2>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                Sumbu kiri = kuantitas - sumbu kanan = kumulatif % - arahkan kursor ke bar untuk detail
              </p>
            </div>
            <div className="mt-3">
              {pareto.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-12 text-center dark:border-white/15">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada defect pada rentang ini</p>
                </div>
              ) : (
                <ParetoChart pareto={pareto} />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-4 rounded-sm bg-cyan-500/70" /> Qty
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-rose-500" /> Kumulatif %
              </span>
            </div>
          </section>

          <section className="glass-card p-4">
            <h2 className="text-[13px] font-semibold tracking-tight">Tabel Pareto</h2>
            <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[30rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={TH_LEFT}>Rank</th>
                    <th className={TH_LEFT}>Kode</th>
                    <th className={TH_LEFT}>Nama Defect</th>
                    <th className={TH_RIGHT}>Qty</th>
                    <th className={TH_RIGHT}>%</th>
                    <th className={TH_RIGHT}>Kumulatif</th>
                  </tr>
                </thead>
                <tbody>
                  {pareto.map((p) => (
                    <tr key={`${p.rank}-${p.defectCode}`} className={ROW_CLS}>
                      <td className={TD_LEFT}>{p.rank}</td>
                      <td className={`${TD_LEFT} font-mono font-semibold`}>{p.defectCode}</td>
                      <td className={TD_LEFT}>{p.defectName}</td>
                      <td className={TD_RIGHT}>{fmtInt(p.quantity)}</td>
                      <td className={TD_RIGHT}>{fmtPct(p.percentPct)}</td>
                      <td className={TD_RIGHT}>{fmtPct(p.cumulativePct)}</td>
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
