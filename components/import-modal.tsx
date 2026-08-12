"use client";

import { useMemo, useRef, useState } from "react";
import type { MockSession } from "@/lib/mocks/session";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { buildRecordFromRow, type DraftRowValues } from "@/lib/records/form";
import { validateRows, type ValidateRowsResult } from "@/lib/imports/validation";
import { parseCsv, type ParseCsvResult, type ParsedCsvRow } from "@/lib/imports/parse";
import {
  CALC_FIELD_IDS,
  CSV_COLUMN_LABELS,
  INPUT_FIELD_IDS,
  NUMERIC_INPUT_FIELD_IDS,
  type InputFieldId,
} from "@/lib/imports/columns";
import { SAMPLE_CSV, SAMPLE_CSV_FILENAME } from "@/lib/imports/sample";

const PREVIEW_ROWS_LIMIT = 5;

export type ImportOutcome = {
  records: MockProductionRecord[];
  fileName: string;
  rowsImported: number;
  rowsSkipped: number;
};

type ImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Record yang sudah ada (seed + simpanan) untuk deteksi duplikat. */
  existing: { date: string; model: string; shift: string | null }[];
  session: MockSession;
  onImported: (outcome: ImportOutcome) => void;
};

type Step = "pick" | "review" | "done";

function toDraftValues(values: Partial<Record<InputFieldId, string>>): DraftRowValues {
  const out = {} as Record<string, string>;
  for (const field of NUMERIC_INPUT_FIELD_IDS) out[field] = values[field] ?? "";
  return out as DraftRowValues;
}

export default function ImportModal({ open, onClose, existing, session, onImported }: ImportModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [parsed, setParsed] = useState<ParseCsvResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [skipErrors, setSkipErrors] = useState(false);
  const [doneSummary, setDoneSummary] = useState<ImportOutcome | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validation: ValidateRowsResult | null = useMemo(
    () => (parsed ? validateRows({ rows: parsed.rows, existing, delimiter: parsed.delimiter }) : null),
    [parsed, existing]
  );

  if (!open) return null;

  const rowsByIndex = new Map<number, ParsedCsvRow>();
  for (const row of parsed?.rows ?? []) rowsByIndex.set(row.index, row);

  const reset = () => {
    setStep("pick");
    setParsed(null);
    setFileName("");
    setSkipErrors(false);
    setDoneSummary(null);
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const loadText = (text: string, name: string) => {
    setParsed(parseCsv(text));
    setFileName(name);
    setSkipErrors(false);
    setStep("review");
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      loadText(text, file.name);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = () => {
    if (!parsed || !validation) return;
    const records: MockProductionRecord[] = [];
    for (const validRow of validation.rows) {
      if (validRow.status !== "ok") continue;
      const row = rowsByIndex.get(validRow.index);
      if (!row) continue;
      records.push(
        buildRecordFromRow({
          id: `rec_imp_${Date.now()}_${validRow.index}`,
          date: row.values.date ?? "",
          model: row.values.model ?? "",
          shift: (row.values.shift ?? "").trim() || null,
          area: session.user.area ? { ...session.user.area, lineCode: null } : null,
          values: toDraftValues(row.values),
          createdByName: session.user.name,
        })
      );
    }
    const outcome: ImportOutcome = {
      records,
      fileName: fileName || "import.csv",
      rowsImported: records.length,
      rowsSkipped: validation.errorCount,
    };
    setDoneSummary(outcome);
    setStep("done");
    onImported(outcome);
  };

  const errorTotal = validation?.errorCount ?? 0;
  const canImport = validation !== null && validation.validCount > 0 && (errorTotal === 0 || skipErrors);

  const btnPrimary =
    "rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
  const btnGhost =
    "rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="glass-card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-slate-950/10 px-5 py-3 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold tracking-tight">Import Data Produksi</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {step === "pick" && "Pilih file CSV — atau muat contoh bawaan"}
              {step === "review" && `Validasi & pratinjau — ${fileName || "file"}`}
              {step === "done" && "Ringkasan impor"}
            </p>
          </div>
          <button type="button" onClick={handleClose} aria-label="Tutup" className={btnGhost}>
            Tutup
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === "pick" && (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                className={`grid place-items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragOver
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-slate-950/15 dark:border-white/15"
                }`}
              >
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} className={btnPrimary}>
                    Pilih File CSV
                  </button>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Atau seret &amp; jatuhkan file ke sini (.csv / .txt)
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Format file
                </p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                  <li>CSV UTF-8 — pemisah titik koma (;) atau koma (,), dideteksi otomatis.</li>
                  <li>Baris pertama = header kolom (nama Indonesia/Inggris dikenali otomatis).</li>
                  <li>Desimal titik (mis. 92.5); koma desimal (92,5) diterima bila pemisahnya titik koma.</li>
                  <li>GAP &amp; UPPH tidak perlu diisi — dihitung otomatis saat impor.</li>
                  <li>Nilai berisi tanda kutip atau pemisah belum didukung (dipecah apa adanya).</li>
                </ul>
              </div>

              <button type="button" onClick={() => loadText(SAMPLE_CSV, SAMPLE_CSV_FILENAME)} className={btnGhost}>
                Gunakan Contoh
              </button>
            </div>
          )}

          {step === "review" && parsed && validation && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Chip label="Delimiter" value={parsed.delimiter === ";" ? "titik koma (;)" : "koma (,)"} tone="slate" />
                <Chip label="Total baris" value={String(validation.totalCount)} tone="slate" />
                <Chip label="Valid" value={String(validation.validCount)} tone="emerald" />
                <Chip label="Error" value={String(validation.errorCount)} tone={errorTotal > 0 ? "rose" : "emerald"} />
                <Chip
                  label="Kolom diabaikan"
                  value={String(parsed.unknownColumns.length)}
                  tone={parsed.unknownColumns.length > 0 ? "amber" : "slate"}
                />
                <Chip label="File" value={fileName} tone="slate" />
              </div>

              <div className="rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-3 dark:border-white/5 dark:bg-white/[0.03]">
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Pemetaan kolom
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {INPUT_FIELD_IDS.map((field) => (
                    <span
                      key={field}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      {CSV_COLUMN_LABELS[field]}
                    </span>
                  ))}
                  {CALC_FIELD_IDS.map((field) => (
                    <span
                      key={field}
                      title="Nilai di file diabaikan — dihitung ulang dari input"
                      className="rounded-full border border-slate-950/10 bg-slate-950/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400"
                    >
                      {CSV_COLUMN_LABELS[field]} (auto)
                    </span>
                  ))}
                  {parsed.unknownColumns.map((label) => (
                    <span
                      key={label}
                      title="Kolom tidak dikenali — diabaikan"
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                    >
                      {label} (diabaikan)
                    </span>
                  ))}
                </div>
              </div>

              {parsed.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-[11px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                    Peringatan parse
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-800 dark:text-amber-300">
                    {parsed.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-950/5 dark:border-white/5">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-950/10 bg-slate-100/90 text-[10px] tracking-wider text-slate-600 uppercase dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400">
                      <th className="px-3 py-2 font-semibold">#</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Model</th>
                      <th className="px-3 py-2 font-semibold">Shift</th>
                      <th className="px-3 py-2 text-right font-semibold">UPH Target</th>
                      <th className="px-3 py-2 text-right font-semibold">Output Prod</th>
                      <th className="px-3 py-2 font-semibold">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, PREVIEW_ROWS_LIMIT).map((row) => {
                      const errors = validation.byIndex.get(row.index) ?? [];
                      return (
                        <tr key={row.index} className="border-b border-slate-950/5 text-xs dark:border-white/5">
                          <td className="px-3 py-2 tabular-nums text-slate-500">{row.index}</td>
                          <td className="px-3 py-2">
                            {errors.length === 0 ? (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                OK
                              </span>
                            ) : (
                              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                                ERROR
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{row.values.date ?? ""}</td>
                          <td className="px-3 py-2 font-medium">{row.values.model ?? ""}</td>
                          <td className="px-3 py-2">{row.values.shift ?? ""}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.values.uphTarget ?? ""}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{row.values.outputProd ?? ""}</td>
                          <td className="px-3 py-2">
                            {errors.length === 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Valid</span>
                            ) : (
                              <ul className="list-disc pl-3 text-[11px] text-rose-700 dark:text-rose-400">
                                {errors.map((e) => (
                                  <li key={`${e.field}-${e.message}`}>
                                    {e.field}: {e.message}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsed.rows.length > PREVIEW_ROWS_LIMIT && (
                  <p className="border-t border-slate-950/5 px-3 py-2 text-[11px] text-slate-500 dark:border-white/5 dark:text-slate-400">
                    +{parsed.rows.length - PREVIEW_ROWS_LIMIT} baris lainnya — pratinjau hanya menampilkan{" "}
                    {PREVIEW_ROWS_LIMIT} baris pertama.
                  </p>
                )}
              </div>

              {errorTotal > 0 && (
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-950/5 bg-slate-950/[0.03] p-3 text-xs dark:border-white/5 dark:bg-white/[0.03]">
                  <input
                    type="checkbox"
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    className="mt-0.5 accent-cyan-600"
                  />
                  <span>
                    <span className="font-semibold">Lewati {errorTotal} baris error</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                      Baris valid tetap diimpor; baris error dicatat di riwayat sebagai dilewati. Tanpa ini,
                      tombol impor terkunci sampai semua baris valid.
                    </span>
                  </span>
                </label>
              )}
            </div>
          )}

          {step === "done" && doneSummary && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span
                className={`grid h-14 w-14 place-items-center rounded-full text-xl font-bold ${
                  doneSummary.rowsImported > 0
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                }`}
              >
                {doneSummary.rowsImported > 0 ? "✓" : "!"}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {doneSummary.rowsImported > 0
                    ? `${doneSummary.rowsImported} baris berhasil diimpor`
                    : "Tidak ada baris yang diimpor"}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {doneSummary.fileName} · {doneSummary.rowsSkipped} baris error dilewati
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={reset} className={btnGhost}>
                  Impor Lagi
                </button>
                <button type="button" onClick={handleClose} className={btnPrimary}>
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>

        {step === "review" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-950/10 px-5 py-3 dark:border-white/10">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {errorTotal > 0 && !skipErrors
                ? "Ada baris error — perbaiki file atau aktifkan &quot;lewati baris error&quot;."
                : validation && validation.validCount > 0
                  ? `${validation.validCount} baris siap diimpor.`
                  : "Tidak ada baris valid untuk diimpor."}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className={btnGhost}>
                Kembali
              </button>
              <button type="button" onClick={handleImport} disabled={!canImport} className={btnPrimary}>
                Impor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "amber" | "slate" }) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    slate: "border-slate-950/10 bg-slate-950/[0.04] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      <span className="font-normal opacity-70">{label}:</span> {value}
    </span>
  );
}