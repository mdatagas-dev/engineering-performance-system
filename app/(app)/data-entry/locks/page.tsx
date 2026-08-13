"use client";

import { useEffect, useMemo, useState } from "react";
import { RecordStatus } from "@/app/generated/prisma/enums";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { changeRecordStatus, fetchAllRecords } from "@/lib/api/records";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { formatNumber, formatDecimal } from "@/lib/production-table/format";

export default function LocksPage() {
  const session = useSessionGuard("record.lock");
  const [records, setRecords] = useState<MockProductionRecord[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Record APPROVED/LOCKED dari database (workflow nyata via /api/records/[id]/status).
  useEffect(() => {
    let alive = true;
    fetchAllRecords()
      .then((rs) => {
        if (alive) setRecords(rs);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(
    () => records.filter((r) => r.status === RecordStatus.APPROVED || r.status === RecordStatus.LOCKED),
    [records]
  );

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  async function lock(id: string) {
    setBusy(id);
    try {
      await changeRecordStatus(id, RecordStatus.LOCKED);
      const rs = await fetchAllRecords();
      setRecords(rs);
      setNotice({ type: "ok", text: "Record dikunci." });
    } catch (err) {
      setNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Gagal mengunci record.",
      });
    } finally {
      setBusy(null);
    }
    window.setTimeout(() => setNotice(null), 3000);
  }

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lock Records</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kunci record APPROVED → LOCKED. Record terkunci tidak bisa diedit.
          </p>
        </div>
        <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          {rows.filter((r) => r.status === RecordStatus.LOCKED).length} terkunci
        </span>
      </div>

      {notice && (
        <p
          role="status"
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            notice.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      <section className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Tidak ada record APPROVED / LOCKED.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-950/10 text-[11px] tracking-wide text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 text-right font-medium">Output</th>
                  <th className="px-4 py-3 text-right font-medium">UPPH</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-950/5 dark:divide-white/5">
                {rows.map((r) => {
                  const locked = r.status === RecordStatus.LOCKED;
                  return (
                    <tr key={r.id} className={`transition-colors ${locked ? "opacity-70" : "hover:bg-cyan-500/[0.04]"}`}>
                      <td className="px-4 py-3 tabular-nums">{r.date}</td>
                      <td className="px-4 py-3 font-medium">{r.model}</td>
                      <td className="px-4 py-3">{r.shift ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(r.outputProd)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(r.upph)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                            locked
                              ? "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          }`}
                        >
                          {locked ? "Locked" : "Approved"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {locked ? (
                          <span className="text-[11px] text-slate-400">Terkunci</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => lock(r.id)}
                            disabled={busy === r.id}
                            className="rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300"
                          >
                            {busy === r.id ? "Mengunci…" : "Lock"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
