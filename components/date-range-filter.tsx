"use client";

import { clampDateRange, type DateRangeFilter } from "@/lib/dashboard/filters";

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

// Kontrol rentang tanggal dashboard — controlled (value + onChange).
// minDate/maxDate = batas dari data (uniqueDates[0] / terakhir) agar input tidak
// bisa melewati data; dari ≤ sampai dijamin oleh clampDateRange (pure).
// Bila kosong tampil chip "Semua Tanggal".
export function DateRangeFilter({
  value,
  minDate,
  maxDate,
  onChange,
  disabled,
}: {
  value: DateRangeFilter;
  minDate: string;
  maxDate: string;
  onChange: (next: DateRangeFilter) => void;
  disabled?: boolean;
}) {
  const isAll = value.from === null && value.to === null;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Dari
        </span>
        <input
          type="date"
          className={inputClass}
          value={value.from ?? ""}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          onChange={(e) => onChange(clampDateRange(e.target.value || null, value.to))}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Sampai
        </span>
        <input
          type="date"
          className={inputClass}
          value={value.to ?? ""}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          onChange={(e) => onChange(clampDateRange(value.from, e.target.value || null))}
        />
      </label>
      <span className="rounded-full border border-slate-950/10 bg-slate-950/[0.03] px-3 py-1.5 text-xs font-medium tabular-nums text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
        {isAll ? "Semua Tanggal" : `${value.from} — ${value.to}`}
      </span>
    </div>
  );
}