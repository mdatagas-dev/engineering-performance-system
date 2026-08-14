"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { QualityScorePanel } from "@/components/quality-score-panel";
import { useCountUp } from "@/components/use-count-up";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { RecordStatus } from "@/app/generated/prisma/enums";
import {
  isPresetActive,
  presetLastNDays,
  presetMonthToDate,
  presetToday,
} from "@/lib/dashboard/filters";

// Dashboard Kualitas - agregasi dari GET /api/quality/summary + daftar
// inspeksi terbaru dari GET /api/quality/checks. Frontend-first: bila API
// belum siap, halaman menampilkan state error/empty yang jujur.

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

type QualityTrendPoint = { date: string; yieldPct: number; defectRatePct: number };

type QualityCheck = {
  id: string;
  date: string;
  model: string;
  shift: string | null;
  areaId: string | null;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectCount: number;
  status: RecordStatus;
  version: number;
  createdAt: string;
};

type QualitySummaryResponse = {
  summary: {
    totals: QualityTotals;
    byDate: unknown[];
    byModel: unknown[];
    pareto: QualityParetoItem[];
    trend: QualityTrendPoint[];
  };
};

type QualityFilters = {
  from: string | null;
  to: string | null;
  model: string | null;
  area: string | null;
};

const EMPTY_FILTERS: QualityFilters = { from: null, to: null, model: null, area: null };

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
const dateContext = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtInt = (v: number): string => numFmt.format(v);
const fmtPct = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? "-" : `${decFmt.format(v)}%`;

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TH_LEFT = TH_CLS;
const TH_RIGHT = `${TH_CLS} text-right`;
const TD = "px-3 py-2 text-xs whitespace-nowrap tabular-nums";
const TD_LEFT = `${TD} text-left`;
const TD_RIGHT = `${TD} text-right`;
const ROW_CLS = "odd:bg-slate-950/[0.02] transition-colors hover:bg-cyan-500/[0.05] dark:odd:bg-white/[0.02]";

const STATUS_META: Record<RecordStatus, { label: string; cls: string }> = {
  [RecordStatus.DRAFT]: {
    label: "Draft",
    cls: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400",
  },
  [RecordStatus.SUBMITTED]: {
    label: "Submitted",
    cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  [RecordStatus.REVIEWED]: {
    label: "Reviewed",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  },
  [RecordStatus.APPROVED]: {
    label: "Approved",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  [RecordStatus.LOCKED]: {
    label: "Locked",
    cls: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
};

function StatusBadge({ status }: { status: RecordStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const KPI_TONES = {
  cyan: { value: "text-cyan-700 dark:text-cyan-400", strip: "from-cyan-500 to-blue-700" },
  emerald: { value: "text-emerald-600 dark:text-emerald-400", strip: "from-emerald-500 to-teal-700" },
  rose: { value: "text-rose-600 dark:text-rose-400", strip: "from-rose-500 to-red-700" },
  slate: { value: "text-slate-800 dark:text-slate-100", strip: "from-slate-400 to-slate-600" },
} as const;

function KpiCard({
  label,
  num,
  suffix,
  tone,
}: {
  label: string;
  num: number;
  suffix?: string;
  tone: keyof typeof KPI_TONES;
}) {
  const t = KPI_TONES[tone];
  const animated = useCountUp(num);
  return (
    <div className="glass-card relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${t.strip}`} />
      <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight tabular-nums ${t.value}`}>
        {fmtInt(animated)}
        {suffix}
      </p>
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

function Shimmer() {
  return (
    <div className="space-y-2">
      <div className="shimmer h-4 w-1/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="shimmer h-4 w-1/2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="shimmer h-4 w-2/5 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
    </div>
  );
}

function TrendChart({ points }: { points: QualityTrendPoint[] }) {
  const W = 720;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 24;
  if (points.length === 0) return null;
  const maxY = Math.ceil(Math.max(100, ...points.map((p) => p.yieldPct), ...points.map((p) => p.defectRatePct)) / 10) * 10;
  const minY = 0;
  const spanY = Math.max(1, maxY - minY);
  const n = points.length;
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, n - 1);
  const y = (v: number) => PAD_T + (1 - (v - minY) / spanY) * (H - PAD_T - PAD_B);
  const line = (key: "yieldPct" | "defectRatePct") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => minY + (maxY - minY) * t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik tren yield dan defect rate">
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
      {n <= 7 &&
        points.map((p, i) => (
          <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[8px]" fontFamily="monospace">
            {p.date.slice(5)}
          </text>
        ))}
    </svg>
  );
}

// GET /api/quality/checks - multi-halaman (pola lib/api/records.ts).
async function fetchAllChecks(params: QualityFilters): Promise<QualityCheck[]> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.model) qs.set("model", params.model);
  if (params.area) qs.set("area", params.area);
  const all: QualityCheck[] = [];
  let page = 1;
  for (;;) {
    const q = new URLSearchParams(qs);
    q.set("perPage", "100");
    q.set("page", String(page));
    const res = await fetch(`/api/quality/checks?${q.toString()}`);
    if (!res.ok) throw new Error(`Gagal memuat data inspeksi (${res.status}).`);
    const data = (await res.json()) as { items: QualityCheck[]; total: number };
    all.push(...data.items);
    if (page * 100 >= data.total || data.items.length === 0) break;
    page += 1;
  }
  return all;
}

export default function QualityDashboardPage() {
  const session = useSessionGuard("quality.view");
  const authed = session !== null;

  const [totals, setTotals] = useState<QualityTotals>(EMPTY_TOTALS);
  const [pareto, setPareto] = useState<QualityParetoItem[]>([]);
  const [trend, setTrend] = useState<QualityTrendPoint[]>([]);
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<QualityFilters>(EMPTY_FILTERS);

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

    Promise.allSettled([
      fetch(`/api/quality/summary?${qs.toString()}`).then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat ringkasan (${res.status}).`);
        return res.json() as Promise<QualitySummaryResponse>;
      }),
      fetchAllChecks(filters),
    ])
      .then(([summaryRes, checksRes]) => {
        if (!alive) return;
        if (summaryRes.status === "fulfilled") {
          const s = summaryRes.value.summary;
          setTotals(s.totals ?? EMPTY_TOTALS);
          setPareto(Array.isArray(s.pareto) ? s.pareto : []);
          setTrend(Array.isArray(s.trend) ? s.trend : []);
        } else {
          setTotals(EMPTY_TOTALS);
          setPareto([]);
          setTrend([]);
          setLoadError(summaryRes.reason instanceof Error ? summaryRes.reason.message : "Gagal memuat ringkasan.");
        }
        if (checksRes.status === "fulfilled") setChecks(checksRes.value);
        else setChecks([]);
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

  const models = useMemo(() => [...new Set(checks.map((c) => c.model))].sort(), [checks]);
  const recent = useMemo(
    () => [...checks].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 30),
    [checks]
  );

  const applyFilters = (patch: Partial<QualityFilters>) => {
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

  const now = new Date();
  const presets = [
    { key: "today", label: "Hari Ini", range: presetToday(now) },
    { key: "week", label: "Minggu Ini", range: presetLastNDays(7, now) },
    { key: "month", label: "Bulan Ini", range: presetMonthToDate(now) },
  ];
  const filterCount = (filters.from ? 1 : 0) + (filters.to ? 1 : 0) + (filters.model ? 1 : 0) + (filters.area ? 1 : 0);

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <section className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Dashboard Kualitas</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {dateContext.format(new Date())} - ringkasan dari GET /api/quality/summary
              {loadError ? ` - ${loadError}` : ""}
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtInt(checks.length)} inspeksi
          </span>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Filter Data</h2>
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyFilters({ from: p.range.from, to: p.range.to })}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isPresetActive(filters, p.range)
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
                    : "border-slate-950/15 text-slate-600 hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => applyFilters({ from: null, to: null })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filters.from === null && filters.to === null
                  ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400"
                  : "border-slate-950/15 text-slate-600 hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              Semua
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <DateRangeFilter
            value={{ from: filters.from, to: filters.to }}
            minDate=""
            maxDate=""
            disabled={loading}
            onChange={(range) => applyFilters({ from: range.from, to: range.to })}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Model</span>
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
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Area</span>
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
            {filterCount === 0 ? "Tanpa filter" : `${filterCount} filter aktif`} - {fmtInt(checks.length)} inspeksi
          </p>
        </div>
      </section>

      <QualityScorePanel />

      {loading ? (
        <section className="glass-card p-4">
          <Shimmer />
        </section>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Total Inspeksi" num={totals.inspected} tone="cyan" />
            <KpiCard label="Lolos (Passed)" num={totals.passed} tone="emerald" />
            <KpiCard label="Gagal (Failed)" num={totals.failed} tone="rose" />
            <KpiCard label="Jumlah Defect" num={totals.defectCount} tone="slate" />
            <KpiCard label="Yield" num={totals.yieldPct} suffix="%" tone="emerald" />
            <KpiCard label="Defect Rate" num={totals.defectRatePct} suffix="%" tone="rose" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="glass-card flex min-h-0 flex-col p-4">
              <div>
                <h2 className="text-[13px] font-semibold tracking-tight">Defect Pareto</h2>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Ranking defect terbesar - % dan kumulatif dari summary</p>
              </div>
              {pareto.length === 0 ? (
                <div className="mt-3">
                  <EmptyNote text="Belum ada defect pada rentang ini" />
                </div>
              ) : (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
                  <table className="w-full min-w-[26rem] border-collapse text-left">
                    <thead>
                      <tr>
                        <th className={TH_LEFT}>Rank</th>
                        <th className={TH_LEFT}>Kode Defect</th>
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
              )}
            </section>

            <section className="glass-card flex min-h-0 flex-col p-4">
              <div>
                <h2 className="text-[13px] font-semibold tracking-tight">Quality Trend</h2>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Yield % vs defect rate % per tanggal - SVG murni</p>
              </div>
              <div className="mt-3 flex-1">
                {trend.length === 0 ? (
                  <EmptyNote text="Belum ada data tren pada rentang ini" />
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
          </section>

          <section className="glass-card flex min-h-0 flex-col p-4">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight">Inspeksi Terbaru</h2>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                30 terbaru dari GET /api/quality/checks - {fmtInt(checks.length)} total
              </p>
            </div>
            {recent.length === 0 ? (
              <div className="mt-3">
                <EmptyNote text="Belum ada inspeksi pada rentang ini" />
              </div>
            ) : (
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
                <table className="w-full min-w-[38rem] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className={TH_LEFT}>Tanggal</th>
                      <th className={TH_LEFT}>Model</th>
                      <th className={TH_LEFT}>Shift</th>
                      <th className={TH_RIGHT}>Inspeksi</th>
                      <th className={TH_RIGHT}>Lolos</th>
                      <th className={TH_RIGHT}>Gagal</th>
                      <th className={TH_RIGHT}>Defect</th>
                      <th className={TH_LEFT}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr key={c.id} className={ROW_CLS}>
                        <td className={`${TD_LEFT} font-medium tabular-nums`}>{c.date}</td>
                        <td className={`${TD_LEFT} font-semibold`}>{c.model}</td>
                        <td className={TD_LEFT}>{c.shift ?? "-"}</td>
                        <td className={TD_RIGHT}>{fmtInt(c.inspectedQty)}</td>
                        <td className={TD_RIGHT}>{fmtInt(c.passedQty)}</td>
                        <td className={TD_RIGHT}>{fmtInt(c.failedQty)}</td>
                        <td className={TD_RIGHT}>{fmtInt(c.defectCount)}</td>
                        <td className={TD_LEFT}>
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
