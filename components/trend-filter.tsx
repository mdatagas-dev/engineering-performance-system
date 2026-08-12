"use client";

import { DateRangeFilter } from "@/components/date-range-filter";
import {
  isPresetActive,
  presetLastNDays,
  presetToday,
  type DateRangeFilter as DateRangeFilterValue,
} from "@/lib/dashboard/filters";

const chipBase = "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";
const chipActive = "border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-400";
const chipIdle =
  "border-slate-950/15 text-slate-600 hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10";

// Filter rentang waktu Analisis Tren — MEMBUNGKUS components/date-range-filter
// (props json value/onChange/minDate/maxDate pas, reuse langsung, tanpa fork)
// dan menambahkan preset chip cepat (Hari Ini / 7 Hari Terakhir / 30 Hari
// Terakhir / Semua). Controlled penuh: state tinggal di halaman, komponen
// hanya melaporkan rentang baru via onChange.
export function TrendDateFilter({
  value,
  minDate,
  maxDate,
  onChange,
  disabled,
  now,
}: {
  value: DateRangeFilterValue;
  minDate: string;
  maxDate: string;
  onChange: (next: DateRangeFilterValue) => void;
  disabled?: boolean;
  now?: Date;
}) {
  const presets = [
    { key: "today", label: "Hari Ini", range: presetToday(now) },
    { key: "7d", label: "7 Hari Terakhir", range: presetLastNDays(7, now) },
    { key: "30d", label: "30 Hari Terakhir", range: presetLastNDays(30, now) },
  ];
  const isAll = value.from === null && value.to === null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.range)}
            className={`${chipBase} ${isPresetActive(value, p.range) ? chipActive : chipIdle}`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ from: null, to: null })}
          className={`${chipBase} ${isAll ? chipActive : chipIdle}`}
        >
          Semua
        </button>
      </div>
      <DateRangeFilter value={value} minDate={minDate} maxDate={maxDate} onChange={onChange} disabled={disabled} />
    </div>
  );
}