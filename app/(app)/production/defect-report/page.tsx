"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { getDashboardData, type DashboardData } from "@/lib/mocks/dashboard";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="xw-kpi xpp-kpi">
      <span className="xw-kpi__label">{label}</span>
      <span className="xw-kpi__value">{value}</span>
    </div>
  );
}

export default function DefectReportPage() {
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

  const items = data.pareto;
  const total = items.reduce((a, it) => a + it.quantity, 0) || 1;
  const rows = items.reduce<Array<{ name: string; quantity: number; pct: number; cumPct: number }>>(
    (acc, it) => {
      const pct = (it.quantity / total) * 100;
      const cumPct = (acc.length ? acc[acc.length - 1].cumPct : 0) + pct;
      acc.push({ name: it.name, quantity: it.quantity, pct, cumPct });
      return acc;
    },
    []
  );

  return (
    <main className="xpp-page">
      <section className="xw-panel">
        <h2 className="xw-panel__title">Defect Report</h2>
        <div className="xpp-kpi-row">
          <Kpi label="Total Defect (PCS)" value="123" />
          <Kpi label="Defect Rate (%)" value="2.72" />
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Defect Pareto (Top 5)</h2>
        <div className="xpp-pad">
          <table className="xw-table">
            <thead>
              <tr>
                <th className="xpp-num">Rank</th>
                <th>Defect Name</th>
                <th className="xpp-num">Quantity (PCS)</th>
                <th className="xpp-num">Percent (%)</th>
                <th className="xpp-num">Cumulative (%)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it, i) => (
                <tr key={it.name}>
                  <td className="xpp-num">{i + 1}</td>
                  <td>{it.name}</td>
                  <td className="xpp-num">{formatNumber(it.quantity)}</td>
                  <td className="xpp-num">{formatDecimal(it.pct)}</td>
                  <td className="xpp-num">{formatDecimal(it.cumPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Catatan</h2>
        <div className="xpp-pad">
          <p className="xpp-note">
            Modul defect lengkap (inspeksi, analisis, perbaikan) dikelola pada menu Quality. Halaman ini
            menampilkan ringkasan defect dari dashboard produksi.
          </p>
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
          grid-template-columns: repeat(2, 1fr);
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
        .xpp-note {
          margin: 0;
          color: #333;
        }
      `}</style>
    </main>
  );
}
