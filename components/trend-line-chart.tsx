"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Grafik garis tren — SVG murni (tanpa library chart). Mendukung 1–2 seri,
// gridline horizontal, label axis tanggal (dd/mm), legenda swatch, tooltip
// hover (div floating + <title> native per titik). Responsif: lebar diukur via
// ResizeObserver, koordinat dalam piksel aktual (tanpa viewBox scaling).

export const TREND_COLORS = {
  cyan: "#06b6d4",
  blue: "#3b82f6",
  emerald: "#10b981",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
} as const;

export type TrendChartSerie<T> = {
  key: string;
  label: string;
  color: string;
  get: (point: T) => number;
};

const PAD = { top: 18, right: 14, bottom: 26, left: 48 };
const AXIS_TEXT_CLS = "fill-slate-500 text-[9px] dark:fill-slate-400";
const GRID_CLS = "stroke-slate-950/10 dark:stroke-white/10";

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = 10 ** exp;
  const norm = v / base;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * base;
}

export function TrendLineChart<T extends { date: string }>({
  points,
  series,
  formatValue,
  height = 240,
}: {
  points: T[];
  series: TrendChartSerie<T>[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = useMemo(
    () => points.flatMap((p) => series.map((s) => s.get(p))),
    [points, series]
  );
  const top = useMemo(() => niceCeil(Math.max(1, ...values)), [values]);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const n = points.length;
  const step = n > 1 ? innerW / (n - 1) : innerW;

  const xAt = (i: number) => PAD.left + (n === 1 ? innerW / 2 : i * step);
  const yAt = (v: number) => PAD.top + innerH - (Math.max(0, Math.min(1, v / top)) * innerH);

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + innerH - f * innerH,
    value: top * f,
  }));

  // Label tanggal: maksimal ~6, rata kiri-kanan (selalu sertakan titik terakhir).
  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));
  const labelIndexes = n > 0 ? Array.from({ length: n }, (_, i) => i).filter((i) => i % labelStep === 0 || i === n - 1) : [];

  const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

  const pos = (i: number) => {
    const x = xAt(i);
    return {
      left: Math.min(Math.max(x - 70, 4), Math.max(4, width - 150)),
      top: PAD.top + 2,
    };
  };

  if (points.length === 0 || series.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-10 text-center dark:border-white/15">
        <p className="text-xs text-slate-500 dark:text-slate-400">Tidak ada data untuk ditampilkan</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block touch-none select-none"
          onMouseMove={(e) => {
            if (n === 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const localX = e.clientX - rect.left;
            const idx = Math.max(0, Math.min(n - 1, Math.round((localX - PAD.left) / step)));
            setHover(idx);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {gridLines.map((g) => (
            <g key={g.y}>
              <line x1={PAD.left} x2={width - PAD.right} y1={g.y} y2={g.y} strokeWidth={1} className={GRID_CLS} />
              <text x={PAD.left - 6} y={g.y + 3} textAnchor="end" className={AXIS_TEXT_CLS}>
                {formatValue(g.value)}
              </text>
            </g>
          ))}

          {series.map((s) => {
            const pts = points.map((p, i) => `${xAt(i)},${yAt(s.get(p))}`);
            return (
              <g key={s.key}>
                <polyline
                  points={pts.join(" ")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
                {points.map((p, i) => (
                  <circle key={i} cx={xAt(i)} cy={yAt(s.get(p))} r={3} fill={s.color} stroke="#fff" strokeWidth={1.5}>
                    <title>
                      {s.label} · {formatValue(s.get(p))} · {p.date}
                    </title>
                  </circle>
                ))}
              </g>
            );
          })}

          {labelIndexes.map((i) => (
            <text
              key={i}
              x={xAt(i)}
              y={height - 8}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className={AXIS_TEXT_CLS}
            >
              {shortDate(points[i].date)}
            </text>
          ))}
        </svg>
      )}

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 w-36 rounded-lg border border-slate-950/10 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/95"
          style={pos(hover)}
        >
          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{points[hover].date}</p>
          <div className="mt-1 flex flex-col gap-1">
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                  {formatValue(s.get(points[hover]))}
                </span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}