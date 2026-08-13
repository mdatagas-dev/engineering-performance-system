"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import ColumnVisibility, { type ColumnDef } from "@/components/column-visibility";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { fetchAllRecords } from "@/lib/api/records";
import type { MockProductionRecord } from "@/lib/mocks/records";
import {
  formatDateLong,
  formatDateShort,
  formatDecimal,
  formatNumber,
} from "@/lib/production-table/format";
import {
  groupProductionTotals,
  type ProductionDateGroup,
  type TableTotal,
} from "@/lib/production-table/totals";

// Seluruh kolom PRD — label persis Excel/PRD (Indonesian naming). Date/Model/
// Shift wajib tampil; sisanya bisa disembunyikan lewat PanelColumnVisibility.
const COLUMNS: readonly ColumnDef[] = [
  { id: "date", label: "Date", required: true },
  { id: "model", label: "Model", required: true },
  { id: "shift", label: "Shift", required: true },
  { id: "uphTarget", label: "UPH Target" },
  { id: "uphResult", label: "UPH Result" },
  { id: "gapUph", label: "GAP UPH" },
  { id: "hcStandard", label: "HC Standard" },
  { id: "hcActual", label: "HC Actual" },
  { id: "gapHc", label: "GAP HC" },
  { id: "plan", label: "Plan" },
  { id: "outputProd", label: "Output Prod" },
  { id: "gapOp", label: "GAP OP" },
  { id: "upph", label: "UPPH" },
  { id: "totalSetup", label: "Total Setup" },
  { id: "workingHour", label: "Working Hour" },
  { id: "totalSetupPacking", label: "Total Setup Packing" },
  { id: "workingHourPacking", label: "Working Hour Packing" },
];

const COLUMN_IDS = COLUMNS.map((c) => c.id);
const REQUIRED_COLUMN_IDS = COLUMNS.filter((c) => c.required === true).map((c) => c.id);
const COLUMNS_STORAGE_KEY = "eps_table_columns";

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TD_LEFT_CLS =
  "whitespace-nowrap border-b border-slate-950/5 px-3 py-2 text-left text-xs dark:border-white/5";
const TD_CLS =
  "whitespace-nowrap border-b border-slate-950/5 px-3 py-2 text-right text-xs tabular-nums dark:border-white/5";
const TOTAL_TD_CLS =
  "whitespace-nowrap border-b border-slate-950/5 px-3 py-2.5 text-right text-xs font-bold tabular-nums dark:border-white/5";
const TOTAL_TD_LEFT_CLS =
  "whitespace-nowrap border-b border-slate-950/5 px-3 py-2.5 text-left text-xs font-bold dark:border-white/5";

// Task 6 — aturan Excel: GAP negatif = buruk = merah; 0 & positif = hijau.
function gapTone(value: number | null): string {
  return value === null || value < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
}

function GapValue({ value, title }: { value: number; title: string }) {
  return (
    <span title={title} className={`font-medium tabular-nums ${gapTone(value)}`}>
      {formatDecimal(value)}
    </span>
  );
}

function UpphValue({ value }: { value: number | null }) {
  return (
    <span
      title="UPPH = UPH Result ÷ HC Actual · merah bila negatif"
      className={`font-medium tabular-nums ${gapTone(value)}`}
    >
      {formatDecimal(value)}
    </span>
  );
}

type CellSource = MockProductionRecord | TableTotal;

function cellFor(id: string, source: CellSource, total?: { modelText: string; dateText: string }): ReactNode {
  const isTotal = total !== undefined;
  const td = (extra: string) => (
    <td key={id} className={(isTotal ? TOTAL_TD_CLS : TD_CLS) + extra}>
      {cellBody()}
    </td>
  );
  const tdLeft = (extra: string) => (
    <td key={id} className={(isTotal ? TOTAL_TD_LEFT_CLS : TD_LEFT_CLS) + extra}>
      {cellBody()}
    </td>
  );

  function body(): ReactNode {
    switch (id) {
      case "date":
        return total ? total.dateText : source.date;
      case "model":
        return total ? total.modelText : "model" in source ? source.model : "—";
      case "shift":
        return total ? "—" : source.shift ?? "—";
      case "uphTarget":
        return formatNumber(source.uphTarget);
      case "uphResult":
        return formatNumber(source.uphResult);
      case "gapUph":
        return <GapValue value={source.gapUph} title="GAP UPH = UPH Result − UPH Target · negatif = di bawah target" />;
      case "hcStandard":
        return formatNumber(source.hcStandard);
      case "hcActual":
        return formatNumber(source.hcActual);
      case "gapHc":
        return <GapValue value={source.gapHc} title="GAP HC = HC Actual − HC Standard · negatif = di bawah standar" />;
      case "plan":
        return formatNumber(source.plan);
      case "outputProd":
        return formatNumber(source.outputProd);
      case "gapOp":
        return <GapValue value={source.gapOp} title="GAP OP = Output Prod − Plan · negatif = di bawah plan" />;
      case "upph":
        return <UpphValue value={source.upph} />;
      case "totalSetup":
        return formatNumber(source.totalSetup);
      case "workingHour":
        return formatNumber(source.workingHour);
      case "totalSetupPacking":
        return formatNumber(source.totalSetupPacking);
      case "workingHourPacking":
        return formatNumber(source.workingHourPacking);
    }
  }
  function cellBody(): ReactNode {
    return body() ?? "—";
  }

  return id === "date" || id === "model" || id === "shift"
    ? tdLeft(id === "date" ? " font-medium tabular-nums" : id === "model" ? " font-semibold" : "")
    : td("");
}

function LegendStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        GAP negatif = merah (di bawah target)
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        GAP 0 / positif = hijau (sesuai / melampaui target)
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        UPPH = UPH Result ÷ HC Actual · GAP &amp; UPPH 2 desimal
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        &ldquo;—&rdquo; = data tidak tersedia · arahkan kursor ke sel GAP untuk detail formula
      </span>
    </div>
  );
}

function GroupRows({
  group,
  visible,
}: {
  group: ProductionDateGroup<MockProductionRecord>;
  visible: ReadonlySet<string>;
}) {
  const span = COLUMNS.filter((c) => visible.has(c.id)).length;
  const breakdown = group.shifts.length > 1;
  return (
    <Fragment>
      <tr className="bg-slate-950/[0.05] dark:bg-white/[0.05]">
        <td colSpan={span} className="px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wider uppercase">{formatDateLong(group.date)}</p>
            <p className="text-[10px] font-medium text-slate-500 tabular-nums dark:text-slate-400">
              {group.dateTotal.count} record · Output {formatNumber(group.dateTotal.outputProd)} · UPPH{" "}
              {formatDecimal(group.dateTotal.upph)}
            </p>
          </div>
        </td>
      </tr>
      {group.shifts.map((shiftKey) => {
        const rows = group.rows.get(shiftKey) ?? [];
        const subtotal = group.shiftTotals.find((t) => (t.shift ?? "") === shiftKey);
        return (
          <Fragment key={shiftKey}>
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                {COLUMNS.filter((c) => visible.has(c.id)).map((c) => cellFor(c.id, r))}
              </tr>
            ))}
            {subtotal && breakdown && (
              <tr className="border-t-2 border-amber-500/30 bg-amber-500/[0.07] font-semibold dark:border-amber-400/30 dark:bg-amber-400/[0.06]">
                {COLUMNS.filter((c) => visible.has(c.id)).map((c) =>
                  cellFor(c.id, subtotal, {
                    modelText: "TOTAL",
                    dateText: `Shift ${subtotal.shift ?? "—"} · ${subtotal.count} record`,
                  })
                )}
              </tr>
            )}
          </Fragment>
        );
      })}
      <tr className="border-t-2 border-amber-500/40 bg-amber-500/15 font-semibold dark:border-amber-400/40 dark:bg-amber-400/[0.1]">
        {COLUMNS.filter((c) => visible.has(c.id)).map((c) =>
          cellFor(c.id, group.dateTotal, {
            modelText: "TOTAL",
            dateText: `${formatDateShort(group.date)} · ${group.dateTotal.count} record`,
          })
        )}
      </tr>
    </Fragment>
  );
}

export default function ProductionTablePage() {
  const session = useSessionGuard("dashboard.view");
  const authed = session !== null;

  const [records, setRecords] = useState<MockProductionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Task 8 & 9 — visibilitas kolom + persistensi localStorage (load di mount
  // via lazy initializer; save otomatis tiap toggle via effect).
  const [visible, setVisible] = useState<ReadonlySet<string>>(() => {
    if (typeof window === "undefined") return new Set(COLUMN_IDS);
    try {
      const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (!raw) return new Set(COLUMN_IDS);
      const parsed: unknown = JSON.parse(raw);
      const ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      return new Set([...REQUIRED_COLUMN_IDS, ...ids]);
    } catch {
      return new Set(COLUMN_IDS);
    }
  });

  useEffect(() => {
    try {
      const saved = COLUMN_IDS.filter((id) => visible.has(id) && !REQUIRED_COLUMN_IDS.includes(id));
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // localStorage tidak tersedia — preferensi tetap berlaku selama sesi.
    }
  }, [visible]);

  const toggleColumn = (id: string) => {
    if (REQUIRED_COLUMN_IDS.includes(id)) return;
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetColumns = () => setVisible(new Set(COLUMN_IDS));

  const groups = useMemo(() => groupProductionTotals(records), [records]);

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
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Tabel Produksi Harian</h1>
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    Daily Production Table
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Semua kolom PRD per model per shift — baris total per tanggal (GAP &amp; UPPH dihitung dari
                  total, bukan jumlah per baris).{loadError ? ` ${loadError}` : ""}
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {records.length} record · {groups.length} tanggal
              </span>
            </div>
            <div className="mt-4 border-t border-slate-950/5 pt-3 dark:border-white/5">
              <LegendStrip />
            </div>
          </div>
        </section>

        <ColumnVisibility
          columns={COLUMNS}
          visible={visible}
          onToggle={toggleColumn}
          onReset={resetColumns}
        />

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Rekap Harian</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {records.length} record dari database · grup per tanggal{records.some((r) => r.shift) ? " dengan subtotal shift" : ""} · tanpa total global.
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-16 text-center dark:border-white/15">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada data produksi</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tambahkan record di halaman Input Data Produksi, lalu kembali ke sini.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-h-[34rem] overflow-auto rounded-xl border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[1150px] border-collapse bg-white/50 text-left dark:bg-white/[0.02]">
                <thead>
                  <tr>
                    {COLUMNS.filter((c) => visible.has(c.id)).map((c) => (
                      <th
                        key={c.id}
                        className={TH_CLS + (c.id === "date" || c.id === "model" || c.id === "shift" ? "" : " text-right")}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g) => (
                    <GroupRows key={g.date} group={g} visible={visible} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
  );
}