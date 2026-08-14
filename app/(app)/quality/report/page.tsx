"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";
import Link from "next/link";

// Laporan Kualitas - agregat per tanggal & per model dari
// GET /api/quality/summary, tombol cetak (window.print), dan ekspor CSV
// client-side untuk baris defect (Pareto).

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

// byDate/byModel: field numerik opsional (defensive - backend bebas memberi
// subset kolom; yang absen dirender "-").
type QualityGroupRow = {
  date?: string;
  model?: string;
  inspected?: number;
  passed?: number;
  failed?: number;
  defectCount?: number;
  yieldPct?: number;
  defectRatePct?: number;
};

type SummaryResponse = {
  summary: {
    totals: QualityTotals;
    byDate: QualityGroupRow[];
    byModel: QualityGroupRow[];
    pareto: QualityParetoItem[];
    trend: unknown[];
  };
};

type ReportFilters = {
  from: string | null;
  to: string | null;
  model: string | null;
  area: string | null;
};

const EMPTY_FILTERS: ReportFilters = { from: null, to: null, model: null, area: null };
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
const dateContext = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
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
const TOTAL_ROW_CLS = "bg-cyan-500/10 text-slate-800 dark:bg-cyan-500/[0.08] dark:text-cyan-100";

const CSV_SEPARATOR = ";";
const CSV_INJECTION_PREFIX = ["=", "+", "-", "@", "\t", "\r"] as const;

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let out = value;
  if (CSV_INJECTION_PREFIX.some((p) => out.startsWith(p))) out = `'${out}`;
  if (/[;"\n\r]/.test(out)) out = `"${out.replace(/"/g, '""')}"`;
  return out;
}

function buildDefectCsv(pareto: QualityParetoItem[]): string {
  const header = ["Rank", "Kode Defect", "Nama Defect", "Qty", "%", "Kumulatif %"].join(CSV_SEPARATOR);
  const lines = pareto.map((p) =>
    [p.rank, p.defectCode, csvCell(p.defectName), p.quantity, p.percentPct, p.cumulativePct].join(CSV_SEPARATOR)
  );
  return `\uFEFF${[header, ...lines].join("\n")}`;
}

function toCsvDownload(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function num(row: QualityGroupRow, key: "inspected" | "passed" | "failed" | "defectCount" | "yieldPct" | "defectRatePct"): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export default function QualityReportPage() {
  const session = useSessionGuard("quality.view");
  const authed = session !== null;

  const [totals, setTotals] = useState<QualityTotals>(EMPTY_TOTALS);
  const [byDate, setByDate] = useState<QualityGroupRow[]>([]);
  const [byModel, setByModel] = useState<QualityGroupRow[]>([]);
  const [pareto, setPareto] = useState<QualityParetoItem[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);

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
        setByDate(Array.isArray(s.byDate) ? s.byDate : []);
        setByModel(Array.isArray(s.byModel) ? s.byModel : []);
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

  const sumByDate = useMemo(
    () => ({
      inspected: byDate.reduce((a, r) => a + (num(r, "inspected") ?? 0), 0),
      passed: byDate.reduce((a, r) => a + (num(r, "passed") ?? 0), 0),
      failed: byDate.reduce((a, r) => a + (num(r, "failed") ?? 0), 0),
      defectCount: byDate.reduce((a, r) => a + (num(r, "defectCount") ?? 0), 0),
    }),
    [byDate]
  );
  const sumByModel = useMemo(
    () => ({
      inspected: byModel.reduce((a, r) => a + (num(r, "inspected") ?? 0), 0),
      passed: byModel.reduce((a, r) => a + (num(r, "passed") ?? 0), 0),
      failed: byModel.reduce((a, r) => a + (num(r, "failed") ?? 0), 0),
      defectCount: byModel.reduce((a, r) => a + (num(r, "defectCount") ?? 0), 0),
    }),
    [byModel]
  );

  const applyFilters = (patch: Partial<ReportFilters>) => {
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

  const csvName = `EPS_Quality_Pareto_${new Date().toISOString().slice(0, 10)}.csv`;

  const exportCsv = () => {
    toCsvDownload(buildDefectCsv(pareto), csvName);
    setNotice(`CSV ${pareto.length} baris defect -> ${csvName}`);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const groupTd = (g: QualityGroupRow, key: "inspected" | "passed" | "failed" | "defectCount" | "yieldPct" | "defectRatePct") => {
    const v = num(g, key);
    return v === null ? <span className="text-slate-400 dark:text-slate-500">-</span> : fmtInt(v);
  };
  const groupPct = (g: QualityGroupRow, key: "yieldPct" | "defectRatePct") => fmtPct(num(g, key));

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <section className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Laporan Kualitas</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Agregat per tanggal &amp; per model dari GET /api/quality/summary - {dateContext.format(new Date())}
              {loadError ? ` - ${loadError}` : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading}
              className="rounded-lg border border-slate-950/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cetak Laporan
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={pareto.length === 0 || loading}
              title="Ekspor baris defect (Pareto) sebagai CSV client-side"
              className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ekspor CSV Defect
            </button>
          </div>
        </div>
        {notice && (
          <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-800 dark:text-cyan-300">
            {notice}
          </div>
        )}
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
            Total inspeksi {fmtInt(totals.inspected)} - {byDate.length} tanggal - {byModel.length} model
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="glass-card p-4">
          <p className={labelClass}>Inspeksi</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(totals.inspected)}</p>
        </div>
        <div className="glass-card p-4">
          <p className={labelClass}>Lolos</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{fmtInt(totals.passed)}</p>
        </div>
        <div className="glass-card p-4">
          <p className={labelClass}>Gagal</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">{fmtInt(totals.failed)}</p>
        </div>
        <div className="glass-card p-4">
          <p className={labelClass}>Defect</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-800 dark:text-slate-100">{fmtInt(totals.defectCount)}</p>
        </div>
        <div className="glass-card p-4">
          <p className={labelClass}>Yield</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{fmtPct(totals.yieldPct)}</p>
        </div>
        <div className="glass-card p-4">
          <p className={labelClass}>Defect Rate</p>
          <p className="mt-1 text-xl font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">{fmtPct(totals.defectRatePct)}</p>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="text-[13px] font-semibold tracking-tight">Laporan per Tanggal</h2>
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr>
                <th className={TH_LEFT}>Tanggal</th>
                <th className={TH_RIGHT}>Inspeksi</th>
                <th className={TH_RIGHT}>Lolos</th>
                <th className={TH_RIGHT}>Gagal</th>
                <th className={TH_RIGHT}>Defect</th>
                <th className={TH_RIGHT}>Yield %</th>
                <th className={TH_RIGHT}>Defect Rate %</th>
              </tr>
            </thead>
            <tbody>
              {byDate.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    Tidak ada data pada rentang ini
                  </td>
                </tr>
              ) : (
                [...byDate]
                  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                  .map((g, i) => (
                    <tr key={g.date ?? i} className={ROW_CLS}>
                      <td className={`${TD_LEFT} font-medium tabular-nums`}>{g.date ?? "-"}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "inspected")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "passed")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "failed")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "defectCount")}</td>
                      <td className={TD_RIGHT}>{groupPct(g, "yieldPct")}</td>
                      <td className={TD_RIGHT}>{groupPct(g, "defectRatePct")}</td>
                    </tr>
                  ))
              )}
              {byDate.length > 0 && (
                <tr className={TOTAL_ROW_CLS}>
                  <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByDate.inspected)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByDate.passed)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByDate.failed)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByDate.defectCount)}</td>
                  <td className={TD_RIGHT}>{fmtPct(totals.yieldPct)}</td>
                  <td className={TD_RIGHT}>{fmtPct(totals.defectRatePct)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4">
        <h2 className="text-[13px] font-semibold tracking-tight">Laporan per Model</h2>
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr>
                <th className={TH_LEFT}>Model</th>
                <th className={TH_RIGHT}>Inspeksi</th>
                <th className={TH_RIGHT}>Lolos</th>
                <th className={TH_RIGHT}>Gagal</th>
                <th className={TH_RIGHT}>Defect</th>
                <th className={TH_RIGHT}>Yield %</th>
                <th className={TH_RIGHT}>Defect Rate %</th>
              </tr>
            </thead>
            <tbody>
              {byModel.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    Tidak ada data pada rentang ini
                  </td>
                </tr>
              ) : (
                [...byModel]
                  .sort((a, b) => (a.model ?? "").localeCompare(b.model ?? ""))
                  .map((g, i) => (
                    <tr key={g.model ?? i} className={ROW_CLS}>
                      <td className={`${TD_LEFT} font-semibold`}>{g.model ?? "-"}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "inspected")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "passed")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "failed")}</td>
                      <td className={TD_RIGHT}>{groupTd(g, "defectCount")}</td>
                      <td className={TD_RIGHT}>{groupPct(g, "yieldPct")}</td>
                      <td className={TD_RIGHT}>{groupPct(g, "defectRatePct")}</td>
                    </tr>
                  ))
              )}
              {byModel.length > 0 && (
                <tr className={TOTAL_ROW_CLS}>
                  <td className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase">Total</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByModel.inspected)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByModel.passed)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByModel.failed)}</td>
                  <td className={TD_RIGHT}>{fmtInt(sumByModel.defectCount)}</td>
                  <td className={TD_RIGHT}>{fmtPct(totals.yieldPct)}</td>
                  <td className={TD_RIGHT}>{fmtPct(totals.defectRatePct)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight">Defect Pareto</h2>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              {pareto.length} baris - ekspor CSV di tombol atas
            </p>
          </div>
          <Link
            href="/export"
            className="rounded-md border border-slate-950/15 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Buka Halaman Export Produksi
          </Link>
        </div>
        {pareto.length === 0 ? (
          <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-8 text-center dark:border-white/15">
            <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada defect pada rentang ini</p>
          </div>
        ) : (
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
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
        )}
      </section>
    </main>
  );
}
