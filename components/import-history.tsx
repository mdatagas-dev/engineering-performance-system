"use client";

import { formatImportDate, type ImportHistoryEntry } from "@/lib/imports/history";

const STATUS_META: Record<ImportHistoryEntry["status"], { label: string; cls: string }> = {
  success: { label: "Sukses", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  partial: { label: "Sebagian", cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  failed: { label: "Gagal", cls: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
};

export default function ImportHistory({ entries }: { entries: ImportHistoryEntry[] }) {
  return (
    <section className="glass-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Riwayat Impor</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Tersimpan di browser (eps_mock_imports) · sukses / sebagian / gagal per file.
          </p>
        </div>
        <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
          {entries.length} entri
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-12 text-center dark:border-white/15">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada riwayat impor</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Impor pertama akan tercatat di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-950/5 dark:border-white/5">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="sticky top-0 border-b border-slate-950/10 bg-slate-100/90 text-[10px] tracking-wider text-slate-600 uppercase dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400">
                <th className="px-3 py-2.5 font-semibold">Waktu</th>
                <th className="px-3 py-2.5 font-semibold">File</th>
                <th className="px-3 py-2.5 text-right font-semibold">Diimpor</th>
                <th className="px-3 py-2.5 text-right font-semibold">Dilewati</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Oleh</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const meta = STATUS_META[e.status] ?? STATUS_META.failed;
                return (
                  <tr
                    key={e.id}
                    className="border-b border-slate-950/5 text-xs transition-colors hover:bg-cyan-500/[0.04] dark:border-white/5"
                  >
                    <td className="px-3 py-2 tabular-nums">{formatImportDate(e.importedAt)}</td>
                    <td className="max-w-[220px] truncate px-3 py-2 font-medium">{e.fileName}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{e.rowsImported}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.rowsSkipped}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{e.importedBy.split("@")[0]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}