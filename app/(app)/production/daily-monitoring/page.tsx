"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { getDashboardData, type DashboardData } from "@/lib/mocks/dashboard";
import { mockProductionRecords, type MockProductionRecord } from "@/lib/mocks/records";
import { fetchAllRecords } from "@/lib/api/records";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";
import DemoBanner from "@/components/demo-banner";


function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="xw-kpi xpp-kpi">
      <span className="xw-kpi__label">{label}</span>
      <span className="xw-kpi__value">{value}</span>
    </div>
  );
}

export default function DailyMonitoringPage() {
  const session = useSessionGuard("dashboard.view");
  const [data, setData] = useState<DashboardData | null>(null);
  const [records, setRecords] = useState<MockProductionRecord[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.resolve(getDashboardData()).then((d) => {
      if (alive) setData(d);
    });
    fetchAllRecords()
      .then((rs) => {
        if (alive) setRecords(rs);
      })
      .catch(() => {
        if (alive) setRecords(mockProductionRecords);
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

  const { kpis } = data;
  const dates = [...new Set(records.map((r) => r.date))].sort((a, b) => b.localeCompare(a));

  return (
    <main className="xpp-page">

      <DemoBanner note="KPI berasal dari lib/mocks/dashboard.ts." />
      <section className="xw-panel">
        <h2 className="xw-panel__title">Daily Monitoring</h2>
        <div className="xpp-kpi-row">
          <Kpi label="Total Output (PCS)" value={formatNumber(kpis.actual)} />
          <Kpi label="Plan (PCS)" value={formatNumber(kpis.plan)} />
          <Kpi label="Achievement (%)" value={formatDecimal(kpis.achievementPct)} />
          <Kpi label="Defect (PCS)" value={formatNumber(kpis.defect)} />
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Daily Production Records</h2>
        <div className="xpp-pad">
          {dates.length === 0 ? (
            <p className="xpp-empty">Belum ada data record produksi.</p>
          ) : (
            dates.map((date) => (
              <div key={date} className="xpp-date-group">
                <h3 className="xpp-date-head">{date}</h3>
                <table className="xw-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Model</th>
                      <th>Shift</th>
                      <th className="xpp-num">Plan (PCS)</th>
                      <th className="xpp-num">Output (PCS)</th>
                      <th className="xpp-num">UPPH</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records
                      .filter((r) => r.date === date)
                      .map((r) => (
                        <tr key={r.id}>
                          <td>{r.date}</td>
                          <td>{r.model}</td>
                          <td>{r.shift ?? "-"}</td>
                          <td className="xpp-num">{formatNumber(r.plan)}</td>
                          <td className="xpp-num">{formatNumber(r.outputProd)}</td>
                          <td className="xpp-num">{formatDecimal(r.upph)}</td>
                          <td>{r.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
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
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 8px;
        }
        .xpp-kpi {
          min-width: 0;
        }
        .xpp-pad {
          padding: 8px;
        }
        .xpp-date-group + .xpp-date-group {
          margin-top: 12px;
        }
        .xpp-date-head {
          margin: 0 0 4px;
          font-size: 11px;
          font-weight: bold;
          color: #0a246a;
        }
        .xpp-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .xpp-empty {
          margin: 0;
          color: #555;
        }
      `}</style>
    </main>
  );
}
