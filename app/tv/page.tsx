"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { fetchAllRecords } from "@/lib/api/records";
import { getDashboardData, type LineStatus } from "@/lib/mocks/dashboard";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";

const REFRESH_MS = 60_000;

type TvKpis = {
  plan: number;
  actual: number;
  achievementPct: number;
  remaining: number;
  defect: number;
  defectRatePct: number;
};

type TvData = {
  kpis: TvKpis;
  lineStatus: readonly LineStatus[];
};

// KPI dari record nyata. ponytail: ProductionRecord tidak punya field defect,
// jadi Defect/Defect Rate = 0 selama DB terisi; mock dipakai penuh saat kosong.
// Upgrade path: hitung defectRatePct = defect / actual * 100 begitu ada field.
function buildKpis(records: MockProductionRecord[]): TvKpis {
  const plan = records.reduce((a, r) => a + r.plan, 0);
  const actual = records.reduce((a, r) => a + r.outputProd, 0);
  return {
    plan,
    actual,
    achievementPct: plan === 0 ? 0 : (actual / plan) * 100,
    remaining: Math.max(0, plan - actual),
    defect: 0,
    defectRatePct: 0,
  };
}

function buildLineStatus(records: MockProductionRecord[]): LineStatus[] {
  const byLine = new Map<string, { models: Set<string>; plan: number; actual: number }>();
  for (const r of records) {
    const key = r.area?.name ?? r.model;
    const g = byLine.get(key) ?? { models: new Set<string>(), plan: 0, actual: 0 };
    g.models.add(r.model);
    g.plan += r.plan;
    g.actual += r.outputProd;
    byLine.set(key, g);
  }
  return [...byLine.entries()]
    .map(([line, g]) => ({
      line,
      model: [...g.models].join(", "),
      status: (g.actual > 0 ? "RUNNING" : "IDLE") as LineStatus["status"],
      plan: g.plan,
      actual: g.actual,
      achievementPct: g.plan === 0 ? 0 : (g.actual / g.plan) * 100,
      defect: 0,
    }))
    .sort((a, b) => a.line.localeCompare(b.line));
}

function toTvData(records: MockProductionRecord[]): TvData {
  if (records.length === 0) {
    const d = getDashboardData();
    return { kpis: d.kpis, lineStatus: d.lineStatus };
  }
  return { kpis: buildKpis(records), lineStatus: buildLineStatus(records) };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function TvPage() {
  const session = useSessionGuard("dashboard.view");
  const [data, setData] = useState<TvData | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchAllRecords()
        .then((rs) => {
          if (alive) setData(toTvData(rs));
        })
        .catch(() => {
          if (alive) setData(toTvData([]));
        });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session || !data) {
    return (
      <div className="tvx-root tvx-root--boot">
        <div className="tvx-boot">Loading production data...</div>
      </div>
    );
  }

  const clock = [now.getHours(), now.getMinutes(), now.getSeconds()].map(pad).join(":");

  return (
    <div className="tvx-root">
      <header className="tvx-header">
        <h1 className="tvx-title">GAS ELECTRONIC - PRODUCTION MONITOR</h1>
        <span className="tvx-clock">{clock}</span>
      </header>

      <section className="tvx-kpi-grid" aria-label="Production KPIs">
        <div className="tvx-kpi">
          <span className="tvx-kpi-label">Plan (PCS)</span>
          <span className="tvx-kpi-value">{formatNumber(data.kpis.plan)}</span>
        </div>
        <div className="tvx-kpi">
          <span className="tvx-kpi-label">Actual (PCS)</span>
          <span className="tvx-kpi-value">{formatNumber(data.kpis.actual)}</span>
        </div>
        <div className="tvx-kpi">
          <span className="tvx-kpi-label">Achievement (%)</span>
          <span className="tvx-kpi-value">{formatDecimal(data.kpis.achievementPct)}</span>
        </div>
        <div className="tvx-kpi">
          <span className="tvx-kpi-label">Defect Rate (%)</span>
          <span className="tvx-kpi-value">{formatDecimal(data.kpis.defectRatePct)}</span>
        </div>
      </section>

      <section className="tvx-table-wrap" aria-label="Line Status">
        <div className="tvx-table-head">LINE STATUS</div>
        <table className="tvx-table">
          <thead>
            <tr>
              <th>Line</th>
              <th>Model</th>
              <th>Status</th>
              <th className="tvx-num">Plan (PCS)</th>
              <th className="tvx-num">Actual (PCS)</th>
              <th className="tvx-num">Achievement (%)</th>
              <th className="tvx-num">Defect (PCS)</th>
            </tr>
          </thead>
          <tbody>
            {data.lineStatus.map((r) => (
              <tr key={r.line}>
                <td>{r.line}</td>
                <td>{r.model}</td>
                <td>
                  <span className={`tvx-status tvx-status--${r.status.toLowerCase()}`}>
                    <span className="tvx-dot" />
                    {r.status}
                  </span>
                </td>
                <td className="tvx-num">{formatNumber(r.plan)}</td>
                <td className="tvx-num">{formatNumber(r.actual)}</td>
                <td className="tvx-num">{formatDecimal(r.achievementPct)}</td>
                <td className="tvx-num">{formatNumber(r.defect)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        .tvx-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 20px;
          background: linear-gradient(180deg, #08306d 0%, #06224e 55%, #041a3a 100%);
          color: #ffffff;
          font-family: Tahoma, "MS Sans Serif", Verdana, sans-serif;
          overflow: auto;
        }
        .tvx-root--boot {
          align-items: center;
          justify-content: center;
        }
        .tvx-boot {
          font-size: 20px;
          color: #c8d8f0;
        }
        .tvx-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: linear-gradient(180deg, #3165c4 0%, #0a246a 100%);
          border: 1px solid #4a7ad0;
          box-shadow: inset 1px 1px #8fb2e8, inset -1px -1px #061a4a;
        }
        .tvx-title {
          flex: 1;
          margin: 0;
          font-size: 28px;
          font-weight: bold;
          letter-spacing: 0.04em;
        }
        .tvx-clock {
          font-size: 26px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
          color: #dce9ff;
          border: 1px solid #0a246a;
          padding: 4px 12px;
          background: #041a3a;
          box-shadow: inset 1px 1px #000000;
        }
        .tvx-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .tvx-kpi {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 6px;
          padding: 22px 26px;
          background: linear-gradient(180deg, #0d3f86 0%, #082c63 100%);
          border: 1px solid #4a7ad0;
          box-shadow: inset 1px 1px #8fb2e8, inset -1px -1px #061a4a;
        }
        .tvx-kpi-label {
          font-size: 15px;
          color: #bcd2f4;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tvx-kpi-value {
          font-size: 52px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
        }
        .tvx-table-wrap {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          border: 1px solid #4a7ad0;
          background: #041a3a;
          box-shadow: inset 1px 1px #8fb2e8, inset -1px -1px #061a4a;
        }
        .tvx-table-head {
          padding: 8px 14px;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 0.05em;
          background: linear-gradient(180deg, #3165c4 0%, #0a246a 100%);
          border-bottom: 1px solid #4a7ad0;
        }
        .tvx-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 19px;
        }
        .tvx-table th {
          padding: 10px 14px;
          text-align: left;
          font-size: 16px;
          color: #bcd2f4;
          border-bottom: 1px solid #4a7ad0;
          white-space: nowrap;
        }
        .tvx-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #0a246a;
          white-space: nowrap;
        }
        .tvx-table tbody tr:nth-child(even) {
          background: #06244f;
        }
        .tvx-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .tvx-status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: bold;
        }
        .tvx-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid #ffffff;
          display: inline-block;
        }
        .tvx-status--running .tvx-dot {
          background: #2ecc71;
        }
        .tvx-status--idle .tvx-dot {
          background: #f1c40f;
        }
        .tvx-status--stop .tvx-dot {
          background: #e74c3c;
        }
      `}</style>
    </div>
  );
}
