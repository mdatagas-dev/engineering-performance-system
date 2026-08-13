"use client";

import { useEffect, useState } from "react";
import KpiSummary from "@/components/kpi-summary";
import ProductionForm from "@/components/production-form";
import QuickEntryTable from "@/components/quick-entry-table";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { createRecord, fetchAllRecords, type CreateRecordPayload } from "@/lib/api/records";
import {
  buildMockRecordTotal,
  type MockProductionRecord,
  type MockRecordTotal,
} from "@/lib/mocks/records";
import { RecordStatus } from "@/app/generated/prisma/enums";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RECORD_FIELDS = new Set([
  "uphTarget",
  "uphResult",
  "hcStandard",
  "hcActual",
  "plan",
  "outputProd",
  "totalSetup",
  "workingHour",
  "totalSetupPacking",
  "workingHourPacking",
]);

function toCreatePayload(r: MockProductionRecord): CreateRecordPayload {
  return {
    date: r.date,
    model: r.model,
    shift: r.shift,
    areaId: r.area && UUID_RE.test(r.area.id) ? r.area.id : null,
    uphTarget: Number(r.uphTarget),
    uphResult: Number(r.uphResult),
    hcStandard: Number(r.hcStandard),
    hcActual: Number(r.hcActual),
    plan: Number(r.plan),
    outputProd: Number(r.outputProd),
    totalSetup: Number(r.totalSetup),
    workingHour: Number(r.workingHour),
    totalSetupPacking: Number(r.totalSetupPacking),
    workingHourPacking: Number(r.workingHourPacking),
  };
}

const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (v: number): string => numFmt.format(v);
const fmtNull = (v: number | null): string => (v === null ? "—" : fmt(v));
const dateContext = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

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

// GAP UPH & GAP OP: nilai positif = melampaui target (baik). GAP HC: nilai
// negatif = HC aktual di bawah standar (baik).
function gapClass(v: number, lowerIsGood = false): string {
  if (v === 0) return "text-slate-400 dark:text-slate-500";
  const good = lowerIsGood ? v < 0 : v > 0;
  return good
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";
}

function StatusBadge({ status }: { status: RecordStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function GapCell({ value, lowerIsGood }: { value: number; lowerIsGood?: boolean }) {
  return <span className={`font-medium tabular-nums ${gapClass(value, lowerIsGood)}`}>{fmt(value)}</span>;
}

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TD_CLS = "whitespace-nowrap border-b border-slate-950/5 px-3 py-2 text-right text-xs tabular-nums dark:border-white/5";

export default function DataEntryRecordsPage() {
  const session = useSessionGuard("record.create");
  const authed = session !== null;

  // Data dari database (GET /api/records); draft quick-entry disimpan di state
  // lokal lalu di-POST ke /api/records saat "Simpan Semua".
  const [records, setRecords] = useState<MockProductionRecord[]>([]);
  const [quickRows, setQuickRows] = useState<MockProductionRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [reloadKey]);

  // Tab panel input: Form per-baris | Input Cepat (TASK 5).
  const [entryMode, setEntryMode] = useState<"form" | "quick">("form");

  async function persistQuick(rows: MockProductionRecord[]): Promise<string | null> {
    const results = await Promise.allSettled(rows.map((r) => createRecord(toCreatePayload(r))));
    const successfulIds = rows.filter((_, i) => results[i]?.status === "fulfilled").map((r) => r.id);
    const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

    if (successfulIds.length > 0) {
      setQuickRows((current) => current.filter((r) => !successfulIds.includes(r.id)));
      setReloadKey((k) => k + 1);
    }
    if (failed.length > 0) {
      const firstError = failed[0].reason;
      const message = firstError instanceof Error ? firstError.message : "Gagal menyimpan record.";
      return successfulIds.length > 0
        ? `${successfulIds.length} baris tersimpan; ${failed.length} baris gagal. ${message}`
        : message;
    }
    return null;
  }

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = buildMockRecordTotal(records);

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        {/* Konteks tanggal & shift */}
        <section className="glass-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Input Data Produksi</h1>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                  Input Manual
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Entri manual per model per shift — tersimpan ke database{loadError ? ` · ${loadError}` : ""}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1.5 text-xs font-medium tabular-nums dark:border-white/10 dark:bg-white/[0.03]">
                {dateContext.format(new Date())}
              </span>
              <select
                disabled
                aria-label="Pilih shift (placeholder)"
                className={`${inputClass} w-auto cursor-not-allowed`}
                defaultValue=""
              >
                <option value="">Shift: —</option>
              </select>
            </div>
          </div>
        </section>

        {/* KPI cards — dihitung dari data nyata (lib/records/summary.ts, murni) */}
        <section className="glass-card p-6">
          <KpiSummary records={records} />
        </section>

        {/* Filter — stub layout, aktif di task berikutnya */}
        <section className="glass-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Tanggal</span>
              <input disabled type="date" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Model</span>
              <input disabled placeholder="Semua model" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Area / Line</span>
              <input disabled placeholder="Semua area" className={inputClass} />
            </label>
            <p className="pb-2 text-[11px] text-slate-400 dark:text-slate-500">
              Filter Date / Model / Area — aktif di task berikutnya.
            </p>
          </div>
        </section>

        {/* Input: Form per-baris | Input Cepat (toggle panel, tidak duplikasi rutin) */}
        <section className="glass-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Input Data Harian</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Simpan → POST /api/records · tabel &amp; KPI refresh dari server.
              </p>
            </div>
            <div className="flex rounded-lg border border-slate-950/10 bg-slate-950/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.03]">
              {(
                [
                  { key: "form", label: "Form per-baris" },
                  { key: "quick", label: "Input Cepat" },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setEntryMode(m.key)}
                  aria-pressed={entryMode === m.key}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    entryMode === m.key
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {entryMode === "form" ? (
            <ProductionForm
              existingRecords={records}
              userName={session.user.name}
              onSaved={() => setReloadKey((k) => k + 1)}
            />
          ) : (
            <QuickEntryTable
              rows={quickRows}
              allRecords={records}
              userName={session.user.name}
              onAdd={(rec) => setQuickRows((rs) => [...rs, rec])}
              onUpdate={(id, patch) => {
                const normalized = { ...patch };
                for (const [key, value] of Object.entries(normalized)) {
                  if (NUMERIC_RECORD_FIELDS.has(key) && typeof value === "string") {
                    const parsed = Number(value);
                    normalized[key] = Number.isFinite(parsed) ? parsed : 0;
                  }
                }
                setQuickRows((rs) =>
                  rs.map((r) => (r.id === id ? ({ ...r, ...normalized } as MockProductionRecord) : r))
                );
              }}
              onRemove={(id) => setQuickRows((rs) => rs.filter((r) => r.id !== id))}
              onAddBulk={(rs) => setQuickRows((prev) => [...prev, ...rs])}
              onPersist={persistQuick}
            />
          )}
        </section>

        {/* Daily Production Table + total row */}
        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Daily Production Table</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Data dari database ({records.length} record) · GAP total dihitung dari total, bukan jumlah GAP per baris.
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {records.length} record
            </span>
          </div>

          {records.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-16 text-center dark:border-white/15">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada data produksi</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tambahkan record pertama melalui form di atas.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[1150px] border-collapse bg-white/50 text-left dark:bg-white/[0.02]">
                <thead>
                  <tr>
                    <th className={TH_CLS}>Date</th>
                    <th className={TH_CLS}>Model</th>
                    <th className={TH_CLS}>Shift</th>
                    <th className={TH_CLS}>Status</th>
                    <th className={`${TH_CLS} text-right`}>UPH Tgt</th>
                    <th className={`${TH_CLS} text-right`}>UPH Res</th>
                    <th className={`${TH_CLS} text-right`}>GAP UPH</th>
                    <th className={`${TH_CLS} text-right`}>HC Std</th>
                    <th className={`${TH_CLS} text-right`}>HC Act</th>
                    <th className={`${TH_CLS} text-right`}>GAP HC</th>
                    <th className={`${TH_CLS} text-right`}>Plan</th>
                    <th className={`${TH_CLS} text-right`}>Output</th>
                    <th className={`${TH_CLS} text-right`}>GAP OP</th>
                    <th className={`${TH_CLS} text-right`}>UPPH</th>
                    <th className={`${TH_CLS} text-right`}>Setup</th>
                    <th className={`${TH_CLS} text-right`}>WH</th>
                    <th className={`${TH_CLS} text-right`}>Setup Pack</th>
                    <th className={`${TH_CLS} text-right`}>WH Pack</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r: MockProductionRecord) => (
                    <tr key={r.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                      <td className="px-3 py-2 text-xs font-medium whitespace-nowrap tabular-nums">{r.date}</td>
                      <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">{r.model}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap tabular-nums">{r.shift ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className={TD_CLS}>{fmt(r.uphTarget)}</td>
                      <td className={TD_CLS}>{fmt(r.uphResult)}</td>
                      <td className={TD_CLS}><GapCell value={r.gapUph} /></td>
                      <td className={TD_CLS}>{fmt(r.hcStandard)}</td>
                      <td className={TD_CLS}>{fmt(r.hcActual)}</td>
                      <td className={TD_CLS}><GapCell value={r.gapHc} lowerIsGood /></td>
                      <td className={TD_CLS}>{fmt(r.plan)}</td>
                      <td className={TD_CLS}>{fmt(r.outputProd)}</td>
                      <td className={TD_CLS}><GapCell value={r.gapOp} /></td>
                      <td className={`${TD_CLS} font-medium`}>{fmtNull(r.upph)}</td>
                      <td className={TD_CLS}>{fmt(r.totalSetup)}</td>
                      <td className={TD_CLS}>{fmt(r.workingHour)}</td>
                      <td className={TD_CLS}>{fmt(r.totalSetupPacking)}</td>
                      <td className={TD_CLS}>{fmt(r.workingHourPacking)}</td>
                    </tr>
                  ))}
                  <TotalRow total={total} />
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
  );
}

function TotalRow({ total }: { total: MockRecordTotal }) {
  const cls =
    "px-3 py-2.5 text-right text-xs font-bold whitespace-nowrap tabular-nums";
  const label = "px-3 py-2.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase";
  return (
    <tr className="bg-cyan-500/10 text-slate-800 dark:bg-cyan-500/[0.08] dark:text-cyan-100">
      <td className="px-3 py-2.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase">
        Total · {total.count} record
      </td>
      <td className={label} colSpan={2}>—</td>
      <td className={label} colSpan={1}>—</td>
      <td className={cls}>{fmt(total.uphTarget)}</td>
      <td className={cls}>{fmt(total.uphResult)}</td>
      <td className={cls}><GapCell value={total.gapUph} /></td>
      <td className={cls}>{fmt(total.hcStandard)}</td>
      <td className={cls}>{fmt(total.hcActual)}</td>
      <td className={cls}><GapCell value={total.gapHc} lowerIsGood /></td>
      <td className={cls}>{fmt(total.plan)}</td>
      <td className={cls}>{fmt(total.outputProd)}</td>
      <td className={cls}><GapCell value={total.gapOp} /></td>
      <td className={cls}>{fmtNull(total.upph)}</td>
      <td className={cls}>{fmt(total.totalSetup)}</td>
      <td className={cls}>{fmt(total.workingHour)}</td>
      <td className={cls}>{fmt(total.totalSetupPacking)}</td>
      <td className={cls}>{fmt(total.workingHourPacking)}</td>
    </tr>
  );
}
