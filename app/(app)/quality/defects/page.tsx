"use client";

import { useEffect, useMemo, useState } from "react";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useSessionGuard } from "@/hooks/use-session-guard";

// Defect Records - daftar defect per baris dari GET /api/quality/defects +
// agregasi Pareto mini dihitung client-side.

type QualityDefect = {
  id: string;
  date: string;
  model: string;
  shift: string | null;
  area: string | null;
  defectCode: string;
  defectName: string;
  quantity: number;
};

type DefectFilters = {
  from: string | null;
  to: string | null;
  model: string | null;
  area: string | null;
};

const EMPTY_FILTERS: DefectFilters = { from: null, to: null, model: null, area: null };

const numFmt = new Intl.NumberFormat("id-ID");
const decFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmtInt = (v: number): string => numFmt.format(v);
const fmtPct = (v: number | null): string =>
  v === null || !Number.isFinite(v) ? "-" : `${decFmt.format(v)}%`;

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";
const labelClass = "text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400";

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TH_LEFT = TH_CLS;
const TH_RIGHT = `${TH_CLS} text-right`;
const TD = "px-3 py-2 text-xs whitespace-nowrap tabular-nums";
const TD_LEFT = `${TD} text-left`;
const TD_RIGHT = `${TD} text-right`;
const ROW_CLS = "odd:bg-slate-950/[0.02] transition-colors hover:bg-cyan-500/[0.05] dark:odd:bg-white/[0.02]";
const TOTAL_ROW_CLS = "bg-cyan-500/10 text-slate-800 dark:bg-cyan-500/[0.08] dark:text-cyan-100";

type ParetoRow = {
  rank: number;
  defectCode: string;
  defectName: string;
  quantity: number;
  percentPct: number;
  cumulativePct: number;
};

function buildPareto(items: QualityDefect[]): ParetoRow[] {
  const m = new Map<string, { defectCode: string; defectName: string; quantity: number }>();
  for (const d of items) {
    const key = `${d.defectCode}|${d.defectName}`;
    const e = m.get(key) ?? { defectCode: d.defectCode, defectName: d.defectName, quantity: 0 };
    e.quantity += d.quantity;
    m.set(key, e);
  }
  const rows = [...m.values()].sort((a, b) => b.quantity - a.quantity);
  const total = rows.reduce((a, r) => a + r.quantity, 0);
  let cum = 0;
  return rows.map((r, i) => {
    cum += r.quantity;
    return {
      rank: i + 1,
      defectCode: r.defectCode,
      defectName: r.defectName,
      quantity: r.quantity,
      percentPct: total > 0 ? (r.quantity / total) * 100 : 0,
      cumulativePct: total > 0 ? (cum / total) * 100 : 0,
    };
  });
}

export default function QualityDefectsPage() {
  const session = useSessionGuard("quality.view");
  const authed = session !== null;

  const [items, setItems] = useState<QualityDefect[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DefectFilters>(EMPTY_FILTERS);

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
    fetch(`/api/quality/defects?${qs.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat defect (${res.status}).`);
        return res.json() as Promise<{ items: QualityDefect[]; total: number }>;
      })
      .then((data) => {
        if (alive) setItems(data.items);
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

  const models = useMemo(() => [...new Set(items.map((d) => d.model))].sort(), [items]);
  const pareto = useMemo(() => buildPareto(items), [items]);
  const totalQty = useMemo(() => items.reduce((a, d) => a + d.quantity, 0), [items]);
  const totalDefects = useMemo(
    () => new Set(items.map((d) => `${d.defectCode}|${d.defectName}`)).size,
    [items]
  );

  const applyFilters = (patch: Partial<DefectFilters>) => {
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
              <h1 className="text-xl font-bold tracking-tight">Defect Records</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Daftar defect per baris dari GET /api/quality/defects{loadError ? ` - ${loadError}` : ""}.
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtInt(totalQty)} qty - {fmtInt(totalDefects)} jenis defect
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
            Menampilkan <span className="font-semibold tabular-nums">{fmtInt(items.length)}</span> baris defect
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="glass-card p-4 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold tracking-tight">Daftar Defect</h2>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Per baris inspeksi defect</p>
            </div>
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <div className="shimmer h-4 w-2/3 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="shimmer h-4 w-1/2 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-8 text-center dark:border-white/15">
              <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada defect pada rentang ini</p>
            </div>
          ) : (
            <div className="mt-3 max-h-[34rem] overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[44rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={TH_LEFT}>Tanggal</th>
                    <th className={TH_LEFT}>Model</th>
                    <th className={TH_LEFT}>Shift</th>
                    <th className={TH_LEFT}>Area</th>
                    <th className={TH_LEFT}>Kode</th>
                    <th className={TH_LEFT}>Nama Defect</th>
                    <th className={TH_RIGHT}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => (
                    <tr key={d.id} className={ROW_CLS}>
                      <td className={`${TD_LEFT} font-medium tabular-nums`}>{d.date}</td>
                      <td className={`${TD_LEFT} font-semibold`}>{d.model}</td>
                      <td className={TD_LEFT}>{d.shift ?? "-"}</td>
                      <td className={TD_LEFT}>{d.area ?? "-"}</td>
                      <td className={`${TD_LEFT} font-mono font-semibold`}>{d.defectCode}</td>
                      <td className={TD_LEFT}>{d.defectName}</td>
                      <td className={TD_RIGHT}>{fmtInt(d.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="glass-card flex min-h-0 flex-col p-4">
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight">Pareto Mini</h2>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Agregasi client-side per kode defect</p>
          </div>
          {pareto.length === 0 ? (
            <div className="mt-3">
              <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-8 text-center dark:border-white/15">
                <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada data</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 max-h-[34rem] overflow-auto rounded-lg border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[20rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className={TH_LEFT}>Rank</th>
                    <th className={TH_LEFT}>Defect</th>
                    <th className={TH_RIGHT}>Qty</th>
                    <th className={TH_RIGHT}>%</th>
                    <th className={TH_RIGHT}>Kum</th>
                  </tr>
                </thead>
                <tbody>
                  {pareto.map((p) => (
                    <tr key={p.rank} className={ROW_CLS}>
                      <td className={TD_LEFT}>{p.rank}</td>
                      <td className={TD_LEFT}>
                        <span className="font-mono font-semibold">{p.defectCode}</span>
                        {p.defectName && <span className="text-slate-500 dark:text-slate-400"> - {p.defectName}</span>}
                      </td>
                      <td className={TD_RIGHT}>{fmtInt(p.quantity)}</td>
                      <td className={TD_RIGHT}>{fmtPct(p.percentPct)}</td>
                      <td className={TD_RIGHT}>{fmtPct(p.cumulativePct)}</td>
                    </tr>
                  ))}
                  <tr className={TOTAL_ROW_CLS}>
                    <td className={`${TD_LEFT} text-[10px] font-bold uppercase`}>Total</td>
                    <td className={`${TD_LEFT} text-[10px] font-bold uppercase`}>{fmtInt(pareto.length)} jenis</td>
                    <td className={`${TD_RIGHT} font-bold`}>{fmtInt(totalQty)}</td>
                    <td className={`${TD_RIGHT} font-bold`}>{fmtPct(100)}</td>
                    <td className={TD_RIGHT} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
