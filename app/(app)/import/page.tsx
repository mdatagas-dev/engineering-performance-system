"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import ImportHistory from "@/components/import-history";
import ImportModal, { type ImportOutcome } from "@/components/import-modal";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { createRecordsStore } from "@/lib/records/state";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";
import { buildMockRecordTotal } from "@/lib/mocks/records";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";
import { buildCsv, buildTemplateCsv, toCsvDownload } from "@/lib/imports/csv";
import { addImportHistory, loadImportHistory, type ImportHistoryEntry } from "@/lib/imports/history";
import { mergeAndSortRecords, type DateSortOrder } from "@/lib/imports/records";
import { CSV_COLUMNS, CSV_COLUMN_LABELS, type CsvFieldId } from "@/lib/imports/columns";

const FILENAME_TODAY = () => `EPS_${new Date().toISOString().slice(0, 10)}.csv`;
const TEMPLATE_FILENAME = "EPS_Template_Impor.csv";

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TD_LEFT_CLS = "whitespace-nowrap border-b border-slate-950/5 px-3 py-2 text-left text-xs dark:border-white/5";
const TD_CLS = "whitespace-nowrap border-b border-slate-950/5 px-3 py-2 text-right text-xs tabular-nums dark:border-white/5";

function gapTone(value: number | null): string {
  return value === null || value < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400";
}

function cellValue(record: MockProductionRecord, field: CsvFieldId): string {
  switch (field) {
    case "date":
    case "model":
      return record[field];
    case "shift":
      return record.shift ?? "—";
    case "gapUph":
    case "gapHc":
    case "gapOp":
      return formatDecimal(record[field]);
    case "upph":
      return formatDecimal(record.upph);
    default: {
      const n = record[field];
      if (typeof n !== "number") return "—";
      return formatNumber(n);
    }
  }
}

const LEFT_FIELDS: readonly CsvFieldId[] = ["date", "model", "shift"];

export default function ImportPage() {
  const session = useSessionGuard("import.run");
  const authed = session !== null;

  const store = useMemo(
    () =>
      createRecordsStore({
        storage: typeof window === "undefined" ? null : window.localStorage,
      }),
    []
  );
  const savedRecords = useSyncExternalStore(store.subscribe, store.getRecords, store.getRecords);

  const [sortOrder, setSortOrder] = useState<DateSortOrder>("desc");
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>(() =>
    typeof window === "undefined" ? [] : loadImportHistory(window.localStorage)
  );
  const noticeTimer = useRef<number | null>(null);

  const records = useMemo(
    () => mergeAndSortRecords(savedRecords, mockProductionRecords, sortOrder),
    [savedRecords, sortOrder]
  );
  const total = useMemo(() => buildMockRecordTotal(records), [records]);
  const uniqueDates = new Set(records.map((r) => r.date)).size;

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };

  const exportCsv = () => {
    toCsvDownload(buildCsv(records), FILENAME_TODAY());
    showNotice(`Ekspor ${records.length} record → ${FILENAME_TODAY()}`);
  };

  const downloadTemplate = () => {
    toCsvDownload(buildTemplateCsv(), TEMPLATE_FILENAME);
    showNotice(`Template diunduh → ${TEMPLATE_FILENAME} (kolom input saja)`);
  };

  const handleImported = (outcome: ImportOutcome) => {
    store.setRecords([...outcome.records, ...store.getRecords()]);
    if (typeof window !== "undefined") {
      const status = outcome.rowsImported > 0 ? (outcome.rowsSkipped > 0 ? "partial" : "success") : "failed";
      const entry: ImportHistoryEntry = {
        id: `imp_${Date.now()}`,
        fileName: outcome.fileName,
        rowsImported: outcome.rowsImported,
        rowsSkipped: outcome.rowsSkipped,
        importedAt: new Date().toISOString(),
        importedBy: session.user.email,
        status,
      };
      const next = addImportHistory(window.localStorage, entry);
      setHistory(next);
    }
    showNotice(
      `${outcome.rowsImported} baris berhasil diimpor` +
        (outcome.rowsSkipped > 0 ? ` · ${outcome.rowsSkipped} dilewati` : "")
    );
  };

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Impor &amp; Ekspor Data Produksi</h1>
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    CSV UTF-8
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Impor file CSV (pemisah titik koma/koma), pratinjau &amp; validasi per baris, lalu ekspor
                  kembali — format &quot;Excel&quot; tanpa library: BOM + desimal titik.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {records.length} record · {uniqueDates} tanggal
              </span>
            </div>

            {notice && (
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-800 dark:text-cyan-300">
                {notice}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-950/5 pt-4 dark:border-white/5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
              >
                Import Excel
              </button>
              <button
                type="button"
                onClick={exportCsv}
                title="Ekspor seluruh record yang tampil sebagai CSV (EPS_<tanggal>.csv)"
                className="rounded-lg border border-slate-950/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Ekspor Excel
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                title="Template berisi kolom input; GAP & UPPH dihitung otomatis"
                className="rounded-lg border border-slate-950/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
              >
                Unduh Template
              </button>
              <label className="ml-auto flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Urut berdasarkan tanggal
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as DateSortOrder)}
                  className="rounded-lg border border-slate-950/15 bg-transparent px-2 py-1 text-xs dark:border-white/15"
                >
                  <option value="desc">Terbaru dulu</option>
                  <option value="asc">Terlama dulu</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Record" value={String(records.length)} />
          <Stat label="Tanggal" value={String(uniqueDates)} />
          <Stat label="Output Prod" value={formatNumber(total.outputProd)} />
          <Stat label="UPPH" value={formatDecimal(total.upph)} />
        </section>

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Data Produksi ({records.length} record)</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Kolom 17 persis PRD — GAP &amp; UPPH dihitung dari formula (calculateCalculated).
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-16 text-center dark:border-white/15">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada data produksi</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Impor file CSV atau tambahkan record di halaman Input Data Produksi.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 max-h-[32rem] overflow-auto rounded-xl border border-slate-950/5 dark:border-white/5">
              <table className="w-full min-w-[1150px] border-collapse bg-white/50 text-left dark:bg-white/[0.02]">
                <thead>
                  <tr>
                    {CSV_COLUMNS.map((field) => (
                      <th
                        key={field}
                        className={TH_CLS + (LEFT_FIELDS.includes(field) ? "" : " text-right")}
                      >
                        {CSV_COLUMN_LABELS[field]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                      {CSV_COLUMNS.map((field) => {
                        const left = LEFT_FIELDS.includes(field);
                        const cls = left ? TD_LEFT_CLS + fontCls(field) : TD_CLS;
                        const isGap =
                          field === "gapUph" || field === "gapHc" || field === "gapOp" || field === "upph";
                        return (
                          <td key={field} className={cls}>
                            {isGap ? (
                              <span className={`font-medium ${gapTone(field === "upph" ? record.upph : (record[field] as number))}`}>
                                {cellValue(record, field)}
                              </span>
                            ) : (
                              cellValue(record, field)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ImportHistory entries={history} />

        <ImportModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          existing={records}
          session={session}
          onImported={handleImported}
        />
      </main>
  );
}

function fontCls(field: CsvFieldId): string {
  if (field === "date") return " font-medium tabular-nums";
  if (field === "model") return " font-semibold";
  return "";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
      <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums">{value}</dd>
    </div>
  );
}