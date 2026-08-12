"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { createRecordsStore } from "@/lib/records/state";
import { mockProductionRecords } from "@/lib/mocks/records";
import { buildMockRecordTotal } from "@/lib/mocks/records";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";
import { buildCsv, buildTemplateCsv, toCsvDownload } from "@/lib/imports/csv";
import { mergeAndSortRecords } from "@/lib/imports/records";

const FILENAME_TODAY = () => `EPS_${new Date().toISOString().slice(0, 10)}.csv`;
const TEMPLATE_FILENAME = "EPS_Template_Impor.csv";
const PREVIEW_LINES = 10;

export default function ExportPage() {
  const session = useSessionGuard("export.run");
  const authed = session !== null;

  const store = useMemo(
    () =>
      createRecordsStore({
        storage: typeof window === "undefined" ? null : window.localStorage,
      }),
    []
  );
  const savedRecords = useSyncExternalStore(store.subscribe, store.getRecords, store.getRecords);

  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const records = useMemo(() => mergeAndSortRecords(savedRecords, mockProductionRecords, "desc"), [savedRecords]);
  const total = useMemo(() => buildMockRecordTotal(records), [records]);
  const dates = records.length > 0 ? [records[records.length - 1].date, records[0].date] : [];
  const previewCsv = useMemo(() => {
    const csv = buildCsv(records);
    const lines = csv.split("\n");
    return lines.slice(0, PREVIEW_LINES).join("\n");
  }, [records]);

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

  return (
    

      <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
        <section className="glass-card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">Ekspor Data Produksi</h1>
                  <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                    CSV UTF-8
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Unduh seluruh record sebagai file CSV siap buka di Excel — BOM + pemisah titik koma (;)
                  + desimal titik, kolom 17 persis PRD.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={records.length === 0}
                  className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
              </div>
            </div>

            {notice && (
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-medium text-cyan-800 dark:text-cyan-300">
                {notice}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Record" value={String(records.length)} />
          <Stat label="Rentang tanggal" value={dates.length === 2 ? `${dates[0]} — ${dates[1]}` : "—"} />
          <Stat label="Output Prod" value={formatNumber(total.outputProd)} />
          <Stat label="UPPH" value={formatDecimal(total.upph)} />
        </section>

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Pratinjau Isi File</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {PREVIEW_LINES} baris pertama dari {records.length + 1} baris file — GAP &amp; UPPH dihitung
                otomatis dari input.
              </p>
            </div>
            <code className="rounded-full border border-slate-950/10 bg-slate-950/[0.04] px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {FILENAME_TODAY()}
            </code>
          </div>

          <textarea
            readOnly
            value={previewCsv}
            spellCheck={false}
            aria-label="Pratinjau isi file CSV"
            className="mt-4 h-72 w-full resize-none rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 font-mono text-[11px] leading-relaxed text-slate-700 focus:outline-none dark:border-white/5 dark:bg-black/30 dark:text-slate-300"
          />
          {records.length + 1 > PREVIEW_LINES && (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              … dan {records.length + 1 - PREVIEW_LINES} baris lainnya akan ikut diunduh.
            </p>
          )}
        </section>
      </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
      <dt className="text-[11px] tracking-wide text-slate-500 uppercase dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums">{value}</dd>
    </div>
  );
}