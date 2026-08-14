"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { getDashboardData, type DashboardData, type OutputTrend } from "@/lib/mocks/dashboard";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";

const AXIS_TEXT = { fontSize: 10, fill: "#333", fontFamily: "Tahoma, Arial, sans-serif" } as const;

function OutputChart({ data }: { data: readonly OutputTrend[] }) {
  const W = 640;
  const H = 260;
  const L = 48;
  const R = 14;
  const T = 18;
  const B = 30;
  const rawMax = Math.max(1, ...data.flatMap((d) => [d.plan, d.actual]));
  const yMax = Math.ceil((rawMax * 1.1) / 100) * 100;
  const iw = W - L - R;
  const ih = H - T - B;
  const slot = iw / data.length;
  const bw = Math.min(36, slot * 0.4);
  const y = (v: number) => T + ih - (v / yMax) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: yMax * f, y: y(yMax * f) }));

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Output Plan vs Actual (Daily)">
        {ticks.map((t) => (
          <g key={t.v}>
            <line x1={L} y1={t.y} x2={W - R} y2={t.y} stroke="#c8c8c8" strokeWidth="1" />
            <text x={L - 6} y={t.y + 4} textAnchor="end" style={AXIS_TEXT}>
              {formatNumber(t.v)}
            </text>
          </g>
        ))}
        <line x1={L} y1={T + ih} x2={W - R} y2={T + ih} stroke="#555" />
        <line x1={L} y1={T} x2={L} y2={T + ih} stroke="#555" />
        {data.map((d, i) => (
          <g key={d.date}>
            <rect
              x={slot * i + slot / 2 - bw}
              y={y(d.plan)}
              width={bw}
              height={Math.max(0, T + ih - y(d.plan))}
              fill="#00008b"
              stroke="#00006b"
            />
            <rect
              x={slot * i + slot / 2}
              y={y(d.actual)}
              width={bw}
              height={Math.max(0, T + ih - y(d.actual))}
              fill="#008000"
              stroke="#006000"
            />
            <text x={slot * i + slot / 2} y={H - B + 14} textAnchor="middle" style={AXIS_TEXT}>
              {d.date.slice(5).replace("-", "/")}
            </text>
          </g>
        ))}
      </svg>
      <div className="xpp-legend">
        <span className="xpp-legend-item">
          <span className="xpp-swatch" style={{ background: "#00008b" }} />
          Plan
        </span>
        <span className="xpp-legend-item">
          <span className="xpp-swatch" style={{ background: "#008000" }} />
          Actual
        </span>
      </div>
    </div>
  );
}

export default function OutputReportPage() {
  const session = useSessionGuard("dashboard.view");
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve(getDashboardData()).then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!session || !data) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const rows = data.outputTrend.map((d) => ({
    ...d,
    achievementPct: d.plan ? (d.actual / d.plan) * 100 : 0,
    delta: d.actual - d.plan,
  }));

  return (
    <main className="xpp-page">
      <section className="xw-panel">
        <h2 className="xw-panel__title">Output Report</h2>
        <div className="xpp-toolbar">
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Output Summary (Daily)</h2>
        <div className="xpp-pad">
          <table className="xw-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="xpp-num">Plan (PCS)</th>
                <th className="xpp-num">Actual (PCS)</th>
                <th className="xpp-num">Target (PCS)</th>
                <th className="xpp-num">Achievement (%)</th>
                <th className="xpp-num">Delta (PCS)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td className="xpp-num">{formatNumber(r.plan)}</td>
                  <td className="xpp-num">{formatNumber(r.actual)}</td>
                  <td className="xpp-num">{formatNumber(r.target)}</td>
                  <td className="xpp-num">{formatDecimal(r.achievementPct)}</td>
                  <td className={`xpp-num ${r.delta >= 0 ? "xpp-pos" : "xpp-neg"}`}>
                    {r.delta >= 0 ? "+" : ""}
                    {formatNumber(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Plan vs Actual (Daily)</h2>
        <div className="xpp-pad">
          <OutputChart data={data.outputTrend} />
        </div>
      </section>

      <style jsx>{`
        .xpp-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .xpp-toolbar {
          display: flex;
          justify-content: flex-end;
          padding: 6px 8px;
        }
        .xpp-pad {
          padding: 8px;
        }
        .xpp-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .xpp-pos {
          color: #006000;
        }
        .xpp-neg {
          color: #a51d1d;
        }
        .xpp-legend {
          display: flex;
          gap: 16px;
          margin-top: 4px;
        }
        .xpp-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
        }
        .xpp-swatch {
          width: 12px;
          height: 3px;
          display: inline-block;
        }
      `}</style>
    </main>
  );
}
