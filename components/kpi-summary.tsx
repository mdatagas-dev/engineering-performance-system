"use client";

import { buildProductionSummary } from "@/lib/records/summary";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { useCountUp } from "./use-count-up";

// KPI cards ringkasan produksi — angka dihitung dari data nyata (buildProductionSummary,
// lib/records/summary.ts, murni), TIDAK di-hardcode. Format: 2 desimal, tabular-nums,
// warna status emerald (baik) / rose (perlu perhatian).

const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (v: number): string => numFmt.format(v);
const fmtNull = (v: number | null): string => (v === null ? "—" : fmt(v));

function goodColor(good: boolean): string {
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={path} />
    </svg>
  );
}

type CardProps = {
  label: string;
  value: string;
  /** nilai numerik utk animasi count-up (bila ada, value diabaikan) */
  num?: number;
  suffix?: string;
  sub?: React.ReactNode;
  icon: string;
  accent: string; // kelas ikon
};

function CountValue({ num, suffix }: { num: number; suffix?: string }) {
  const animated = useCountUp(num);
  return (
    <>
      {fmt(animated)}
      {suffix}
    </>
  );
}

function Card({ label, value, num, suffix, sub, icon, accent }: CardProps) {
  return (
    <div className="min-w-40 flex-1 rounded-xl border border-slate-950/10 bg-white/50 px-4 py-3 transition-colors dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${accent}`}>
          <Icon path={icon} className="h-4 w-4" />
        </span>
        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">{label}</p>
      </div>
      <p className="mt-2 font-bold text-slate-900 tabular-nums dark:text-slate-100">
        {num !== undefined ? <CountValue num={num} suffix={suffix} /> : value}
      </p>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400 tabular-nums dark:text-slate-500">{sub}</div>}
    </div>
  );
}

export default function KpiSummary({ records }: { records: MockProductionRecord[] }) {
  const s = buildProductionSummary(records);
  const outputGood = s.gapOp >= 0;
  const hcGood = s.gapHc <= 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Ringkasan KPI</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Dihitung dari {s.count} record terlihat · GAP dari total, bukan jumlah GAP per baris.
          </p>
        </div>
        {s.count > 0 && (
          <p className="text-[10px] tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Hit-rate UPH {s.uphHitCount}/{s.uphTotalCount} model
          </p>
        )}
      </div>
      <div className="stagger mt-4 flex flex-wrap gap-3">
        <Card
          label="Output Total"
          num={s.totalOutput}
          value={fmt(s.totalOutput)}
          sub={
            <>
              vs Plan {fmt(s.totalPlan)} ·{" "}
              <span className={`font-semibold ${goodColor(outputGood)}`}>
                {outputGood ? "+" : ""}
                {fmt(s.gapOp)} GAP OP
              </span>
            </>
          }
          icon="M3 17l6-6 4 4 8-8M15 7h6v6"
          accent="bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
        />
        <Card
          label="GAP OP"
          value={`${outputGood ? "+" : ""}${fmt(s.gapOp)}`}
          sub={outputGood ? "Output di atas plan" : "Output di bawah plan"}
          icon="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"
          accent={outputGood ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}
        />
        <Card
          label="UPPH Rata-rata"
          num={s.avgUpph ?? undefined}
          value={fmtNull(s.avgUpph)}
          sub="Σ Result ÷ Σ HC Actual"
          icon="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z"
          accent="bg-blue-500/10 text-blue-700 dark:text-blue-400"
        />
        <Card
          label="Total Setup"
          num={s.totalSetup}
          value={fmt(s.totalSetup)}
          sub="menit (setup + packing)"
          icon="M4 7h16M9 7v15M15 7v15M6 4l2.5-2.5L11 4M13 4l2.5-2.5L18 4"
          accent="bg-amber-500/10 text-amber-700 dark:text-amber-400"
        />
        <Card
          label="HC Act vs Std"
          value={`${fmt(s.hcActual)} / ${fmt(s.hcStandard)}`}
          sub={
            <>
              GAP HC{" "}
              <span className={`font-semibold ${goodColor(hcGood)}`}>
                {hcGood ? "" : "+"}
                {fmt(s.gapHc)} {hcGood ? "· hemat" : ""}
              </span>
            </>
          }
          icon="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          accent="bg-violet-500/10 text-violet-700 dark:text-violet-400"
        />
        <Card
          label="Hit-rate UPH"
          num={s.hitRateUph}
          suffix="%"
          value={`${fmt(s.hitRateUph)}%`}
          sub={`${s.uphHitCount} dari ${s.uphTotalCount} model capai target`}
          icon="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"
          accent={s.hitRateUph >= 50 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}
        />
      </div>
    </div>
  );
}