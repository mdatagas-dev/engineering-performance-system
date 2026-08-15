"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { getDashboardData, type DashboardData } from "@/lib/mocks/dashboard";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";
import DemoBanner from "@/components/demo-banner";


const STATUS_COLOR: Record<string, string> = {
  RUNNING: "#2e7d32",
  STOP: "#c62828",
  IDLE: "#757575",
};

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="xw-kpi xpp-kpi">
      <span className="xw-kpi__label">{label}</span>
      <span className="xw-kpi__value">{value}</span>
    </div>
  );
}

export default function LineStatusPage() {
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

  const lines = data.lineStatus;
  const activeCount = lines.filter((l) => l.status === "RUNNING").length;
  const idleCount = lines.filter((l) => l.status === "IDLE").length;
  const running = lines.filter((l) => l.status === "RUNNING");
  const avgAch = running.length
    ? running.reduce((a, l) => a + l.achievementPct, 0) / running.length
    : 0;

  return (
    <main className="xpp-page">

      <DemoBanner note="Data berasal dari lib/mocks/dashboard.ts." />
      <section className="xw-panel">
        <h2 className="xw-panel__title">Line Status</h2>
        <div className="xpp-kpi-row">
          <Kpi label="Active Lines" value={formatNumber(activeCount)} />
          <Kpi label="Idle Lines" value={formatNumber(idleCount)} />
          <Kpi label="Avg Achievement (%)" value={formatDecimal(avgAch)} />
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Line Status Monitoring</h2>
        <div className="xpp-pad">
          <table className="xw-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Model</th>
                <th>Status</th>
                <th className="xpp-num">Plan (PCS)</th>
                <th className="xpp-num">Actual (PCS)</th>
                <th className="xpp-num">Achievement (%)</th>
                <th className="xpp-num">Defect (PCS)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r) => (
                <tr key={r.line}>
                  <td>{r.line}</td>
                  <td>{r.model}</td>
                  <td>
                    <span className="xpp-status">
                      <span className="xpp-dot" style={{ background: STATUS_COLOR[r.status] ?? "#888" }} />
                      {r.status}
                    </span>
                  </td>
                  <td className="xpp-num">{formatNumber(r.plan)}</td>
                  <td className="xpp-num">{formatNumber(r.actual)}</td>
                  <td className="xpp-num">{formatDecimal(r.achievementPct)}</td>
                  <td className="xpp-num">{formatNumber(r.defect)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="xpp-legend">
            {Object.entries(STATUS_COLOR).map(([status, color]) => (
              <span key={status} className="xpp-legend-item">
                <span className="xpp-dot" style={{ background: color }} />
                {status}
              </span>
            ))}
          </div>
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
        .xpp-kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 8px;
        }
        .xpp-kpi {
          min-width: 0;
        }
        .xpp-pad {
          padding: 8px;
        }
        .xpp-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .xpp-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: bold;
          color: #1a1a1a;
        }
        .xpp-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.3);
          display: inline-block;
        }
        .xpp-legend {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        .xpp-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
        }
      `}</style>
    </main>
  );
}
