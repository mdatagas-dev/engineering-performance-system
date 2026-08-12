"use client";

import { useMemo, useState } from "react";
import { RecordStatus } from "@/app/generated/prisma/enums";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { applyMockTransition, mockAllRecords, type MockTransitionResult } from "@/lib/mocks/workflow";
import { formatNumber, formatDecimal } from "@/lib/production-table/format";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  SUBMITTED: { label: "Submitted", badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  REVIEWED: { label: "Reviewed", badge: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  APPROVED: { label: "Approved", badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  LOCKED: { label: "Locked", badge: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

export default function ApprovalsPage() {
  const session = useSessionGuard();
  const [records, setRecords] = useState(() => mockAllRecords(typeof window === "undefined" ? null : window.localStorage));
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const queue = useMemo(
    () =>
      records
        .filter((r) => r.status === RecordStatus.SUBMITTED || r.status === RecordStatus.REVIEWED)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [records]
  );

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const user = session.user;
  const actor = {
    sub: user.id,
    role: user.role.name,
    permissions: user.permissions,
    name: user.name,
    email: user.email,
  };

  function transition(id: string, to: RecordStatus) {
    const result: MockTransitionResult = applyMockTransition(
      window.localStorage,
      records,
      id,
      to,
      actor
    );
    if (result.ok) {
      setRecords(records.map((r) => (r.id === id ? result.record! : r)));
      setNotice({ type: "ok", text: to === RecordStatus.REVIEWED ? "Record di-review." : "Record disetujui." });
    } else {
      setNotice({ type: "err", text: result.message });
    }
    window.setTimeout(() => setNotice(null), 3000);
  }

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Persetujuan Record</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review &amp; approve record produksi (SUBMITTED → REVIEWED → APPROVED).
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-amber-700 dark:text-amber-400">
          {queue.length} menunggu
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
        {queue.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Tidak ada record yang menunggu persetujuan.
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
                {queue.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                    <td className="px-4 py-3 tabular-nums">{r.date}</td>
                    <td className="px-4 py-3 font-medium">{r.model}</td>
                    <td className="px-4 py-3">{r.shift ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(r.outputProd)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatDecimal(r.upph)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          STATUS_META[r.status]?.badge ?? ""
                        }`}
                      >
                        {STATUS_META[r.status]?.label ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === RecordStatus.SUBMITTED ? (
                        <button
                          type="button"
                          onClick={() => transition(r.id, RecordStatus.REVIEWED)}
                          className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => transition(r.id, RecordStatus.APPROVED)}
                          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                        >
                          Approve
                        </button>
                      )}
                    </td>
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
