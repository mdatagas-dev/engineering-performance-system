"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { fetchAllRecords } from "@/lib/api/records";
import {
  getDashboardData,
  type Alert,
  type DashboardData,
  type OutputTrend,
  type ParetoItem,
} from "@/lib/mocks/dashboard";
import type { MockProductionRecord } from "@/lib/mocks/records";
import { formatDecimal, formatNumber } from "@/lib/production-table/format";

const STATUS_COLOR: Record<string, string> = {
  RUNNING: "#2e7d32",
  STOP: "#c62828",
  IDLE: "#757575",
};

const LEVEL_CLS: Record<string, string> = {
  CRITICAL: "xwd-badge xwd-badge-critical",
  WARNING: "xwd-badge xwd-badge-warning",
  INFO: "xwd-badge xwd-badge-info",
};

const AXIS_TEXT = { fontSize: 10, fill: "#333", fontFamily: "Tahoma, Arial, sans-serif" } as const;

const pct = (v: number) => `${formatDecimal(v)} %`;

const MOCK_DATA: DashboardData = getDashboardData();

type Source = "real" | "demo";

type KpisView = {
  plan: number;
  actual: number;
  achievementPct: number;
  remaining: number;
  defect: string;
  defectRatePct: string;
};

type LineView = {
  line: string;
  model: string;
  status: "RUNNING" | "STOP" | "IDLE";
  plan: number;
  actual: number;
  achievementPct: number;
  defect: string;
};

type NotificationItem = {
  id?: string;
  title?: string;
  message?: string;
  severity?: unknown;
  createdAt?: unknown;
};

type TrendPointApi = {
  date: string;
  outputProd: number;
  plan?: number;
};

const mockKpis = (): KpisView => ({
  plan: MOCK_DATA.kpis.plan,
  actual: MOCK_DATA.kpis.actual,
  achievementPct: MOCK_DATA.kpis.achievementPct,
  remaining: MOCK_DATA.kpis.remaining,
  defect: formatNumber(MOCK_DATA.kpis.defect),
  defectRatePct: pct(MOCK_DATA.kpis.defectRatePct),
});

const mockLines = (): LineView[] =>
  MOCK_DATA.lineStatus.map((r) => ({
    line: r.line,
    model: r.model,
    status: r.status,
    plan: r.plan,
    actual: r.actual,
    achievementPct: r.achievementPct,
    defect: formatNumber(r.defect),
  }));

function buildKpis(records: MockProductionRecord[]): KpisView {
  const plan = records.reduce((s, r) => s + r.plan, 0);
  const actual = records.reduce((s, r) => s + r.outputProd, 0);
  return {
    plan,
    actual,
    achievementPct: plan === 0 ? 0 : (actual / plan) * 100,
    remaining: plan - actual,
    defect: "—",
    defectRatePct: "—",
  };
}

function buildLines(records: MockProductionRecord[]): LineView[] {
  const map = new Map<
    string,
    { model: string; plan: number; actual: number; gapOp: number; outputProd: number }
  >();
  for (const r of records) {
    const key = r.area?.name ?? r.model;
    const g = map.get(key) ?? { model: r.model, plan: 0, actual: 0, gapOp: 0, outputProd: 0 };
    g.plan += r.plan;
    g.actual += r.outputProd;
    g.gapOp += r.gapOp;
    g.outputProd += r.outputProd;
    map.set(key, g);
  }
  return [...map.entries()].map(([key, g]) => ({
    line: key,
    model: g.model,
    status: g.gapOp >= 0 ? "RUNNING" : g.outputProd === 0 ? "IDLE" : "STOP",
    plan: g.plan,
    actual: g.actual,
    achievementPct: g.plan === 0 ? 0 : (g.actual / g.plan) * 100,
    defect: "—",
  }));
}

function deriveAlerts(records: MockProductionRecord[]): Alert[] {
  return records
    .filter((r) => r.gapOp < 0)
    .map((r) => ({
      time: "—",
      level: "WARNING" as const,
      message: `Gap produksi ${r.model} (${r.area?.name ?? r.date}): ${r.gapOp} pcs`,
    }));
}

const fmtTime = (v: unknown): string => {
  if (typeof v !== "string") return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

const normLevel = (v: unknown): "INFO" | "WARNING" | "CRITICAL" => {
  const s = String(v ?? "").toUpperCase();
  if (s === "CRITICAL") return "CRITICAL";
  if (s === "WARNING") return "WARNING";
  return "INFO";
};

const srcChip = (src: Source, loading: boolean): string | undefined =>
  loading ? undefined : src === "real" ? "Data real" : "Data demo";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="xw-panel xwd-panel">
      <header className="xwd-section">
        <h3>{title}</h3>
        {note ? <span className="xwd-src-note">{note}</span> : null}
      </header>
      {children}
    </section>
  );
}

function BlockShimmer({ height }: { height: "sm" | "lg" }) {
  return (
    <div className="xwd-pad">
      <div
        className={`shimmer w-full rounded-lg bg-slate-200/80 dark:bg-slate-800/80 ${
          height === "sm" ? "h-20" : "h-56"
        }`}
      />
    </div>
  );
}

function KpiRowShimmer() {
  return (
    <div className="xwd-kpi-row">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="shimmer h-10 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      ))}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="xw-kpi xwd-kpi">
      <span className="xw-kpi__label xwd-kpi-label">{label}</span>
      <span className="xw-kpi__value xwd-kpi-value">{value}</span>
    </div>
  );
}

function TrendChart({ data }: { data: readonly OutputTrend[] }) {
  const W = 640;
  const H = 260;
  const L = 48;
  const R = 14;
  const T = 18;
  const B = 30;
  const rawMax = Math.max(1, ...data.flatMap((d) => [d.plan, d.actual, d.target]));
  const yMax = Math.ceil((rawMax * 1.1) / 100) * 100;
  const iw = W - L - R;
  const ih = H - T - B;
  const x = (i: number) => L + (i / Math.max(1, data.length - 1)) * iw;
  const y = (v: number) => T + ih - (v / yMax) * ih;
  const poly = (key: "plan" | "actual" | "target") =>
    data.map((d, i) => `${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: yMax * f, y: y(yMax * f) }));
  const series = [
    { key: "plan", label: "Plan", color: "#00008b" },
    { key: "actual", label: "Actual", color: "#008000" },
    { key: "target", label: "Target", color: "#b00000" },
  ] as const;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Output Trend (Daily)">
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
          <text key={d.date} x={x(i)} y={H - B + 14} textAnchor="middle" style={AXIS_TEXT}>
            {i % 2 === 0 ? d.date.slice(5).replace("-", "/") : ""}
          </text>
        ))}
        {series.map((s) => (
          <polyline key={s.key} points={poly(s.key)} fill="none" stroke={s.color} strokeWidth="1.5" />
        ))}
      </svg>
      <div className="xwd-legend">
        {series.map((s) => (
          <span key={s.key} className="xwd-legend-item">
            <span className="xwd-legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ParetoChart({ items }: { items: readonly ParetoItem[] }) {
  const W = 640;
  const H = 260;
  const L = 48;
  const R = 48;
  const T = 24;
  const B = 34;
  const iw = W - L - R;
  const ih = H - T - B;
  const total = items.reduce((a, it) => a + it.quantity, 0) || 1;
  const qMax = Math.max(1, Math.ceil(Math.max(...items.map((it) => it.quantity), 1) / 10) * 10);
  const slot = iw / items.length;
  const bw = Math.min(56, slot * 0.55);
  const yQ = (v: number) => T + ih - (v / qMax) * ih;
  const yPct = (p: number) => T + ih - (p / 100) * ih;
  const qTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => qMax * f);
  const cx = (i: number) => L + slot * i + slot / 2;
  const cumPts = items.map((it, i) => ({
    name: it.name,
    pct: (items.slice(0, i + 1).reduce((a, x) => a + x.quantity, 0) / total) * 100,
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Defect Pareto Chart (Top 5)">
      {qTicks.map((v) => (
        <g key={v}>
          <line x1={L} y1={yQ(v)} x2={W - R} y2={yQ(v)} stroke="#c8c8c8" strokeWidth="1" />
          <text x={L - 6} y={yQ(v) + 4} textAnchor="end" style={AXIS_TEXT}>
            {Math.round(v)}
          </text>
        </g>
      ))}
      {[0, 25, 50, 75, 100].map((v) => (
        <text key={v} x={W - R + 6} y={yPct(v) + 4} style={AXIS_TEXT}>
          {v}%
        </text>
      ))}
      <text x={L + 2} y={T - 5} style={AXIS_TEXT}>
        PCS
      </text>
      <text x={W - R + 6} y={T - 5} style={AXIS_TEXT}>
        %
      </text>
      <line x1={L} y1={T + ih} x2={W - R} y2={T + ih} stroke="#555" />
      <line x1={L} y1={T} x2={L} y2={T + ih} stroke="#555" />
      <line x1={W - R} y1={T} x2={W - R} y2={T + ih} stroke="#555" />
      {items.map((it, i) => (
        <g key={it.name}>
          <rect
            x={cx(i) - bw / 2}
            y={yQ(it.quantity)}
            width={bw}
            height={Math.max(0, T + ih - yQ(it.quantity))}
            fill="#3165c4"
            stroke="#0a246a"
          />
          <text x={cx(i)} y={yQ(it.quantity) - 4} textAnchor="middle" style={AXIS_TEXT}>
            {formatNumber(it.quantity)}
          </text>
          <text x={cx(i)} y={H - B + 14} textAnchor="middle" style={AXIS_TEXT}>
            {i + 1}. {it.name}
          </text>
        </g>
      ))}
      <polyline
        points={cumPts.map((c, i) => `${cx(i)},${yPct(c.pct)}`).join(" ")}
        fill="none"
        stroke="#b00000"
        strokeWidth="1.5"
      />
      {cumPts.map((c, i) => (
        <circle key={c.name} cx={cx(i)} cy={yPct(c.pct)} r="3" fill="#b00000" />
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  const session = useSessionGuard("dashboard.view");

  const [records, setRecords] = useState<MockProductionRecord[]>([]);
  const [kpis, setKpis] = useState<KpisView | null>(null);
  const [kpisSrc, setKpisSrc] = useState<Source>("demo");
  const [lines, setLines] = useState<readonly LineView[]>([]);
  const [linesSrc, setLinesSrc] = useState<Source>("demo");
  const [recsLoading, setRecsLoading] = useState(true);

  const [trend, setTrend] = useState<readonly OutputTrend[]>([]);
  const [trendSrc, setTrendSrc] = useState<Source>("demo");
  const [trendLoading, setTrendLoading] = useState(true);

  const [pareto, setPareto] = useState<readonly ParetoItem[]>([]);
  const [paretoSrc, setParetoSrc] = useState<Source>("demo");
  const [paretoLoading, setParetoLoading] = useState(true);

  const [alerts, setAlerts] = useState<readonly Alert[]>([]);
  const [alertsSrc, setAlertsSrc] = useState<Source>("demo");
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rs = await fetchAllRecords();
        if (!alive) return;
        setRecords(rs);
        if (rs.length > 0) {
          setKpis(buildKpis(rs));
          setKpisSrc("real");
          setLines(buildLines(rs));
          setLinesSrc("real");
        } else {
          setKpis(mockKpis());
          setKpisSrc("demo");
          setLines(mockLines());
          setLinesSrc("demo");
        }
      } catch {
        if (!alive) return;
        setKpis(mockKpis());
        setKpisSrc("demo");
        setLines(mockLines());
        setLinesSrc("demo");
      } finally {
        if (alive) setRecsLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/trends/series");
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { points?: TrendPointApi[] };
        const pts = json.points ?? [];
        if (pts.length === 0) throw new Error("empty");
        const planByDate = new Map(MOCK_DATA.outputTrend.map((d) => [d.date, d.plan]));
        setTrend(
          pts.map((p) => ({
            date: p.date,
            plan: planByDate.get(p.date) ?? 0,
            actual: p.outputProd,
            target: p.plan ?? 0,
          }))
        );
        setTrendSrc("real");
      } catch {
        if (!alive) return;
        setTrend(MOCK_DATA.outputTrend);
        setTrendSrc("demo");
      } finally {
        if (alive) setTrendLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/quality/summary");
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as {
          summary?: { pareto?: Array<{ defectName?: string; quantity?: number }> };
        };
        const rows = json.summary?.pareto ?? [];
        if (rows.length === 0) throw new Error("empty");
        setPareto(
          rows.map((r) => ({ name: r.defectName ?? "—", quantity: r.quantity ?? 0 }))
        );
        setParetoSrc("real");
      } catch {
        if (!alive) return;
        setPareto(MOCK_DATA.pareto);
        setParetoSrc("demo");
      } finally {
        if (alive) setParetoLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      let list: readonly Alert[] = MOCK_DATA.alerts;
      let src: Source = "demo";
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { items?: NotificationItem[] };
        const items = json.items ?? [];
        if (items.length > 0) {
          list = items.map((n) => ({
            time: fmtTime(n.createdAt),
            level: normLevel(n.severity),
            message: n.message || n.title || "—",
          }));
          src = "real";
        } else {
          const derived = deriveAlerts(records);
          if (derived.length > 0) {
            list = derived;
            src = "real";
          }
        }
      } catch {
        const derived = deriveAlerts(records);
        if (derived.length > 0) {
          list = derived;
          src = "real";
        }
      }
      if (!alive) return;
      setAlerts(list);
      setAlertsSrc(src);
      setAlertsLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [records]);

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return (
    <main className="xwd-page">
      <Section title="Production Overview" note={srcChip(kpisSrc, recsLoading)}>
        {recsLoading || !kpis ? (
          <KpiRowShimmer />
        ) : (
          <div className="xwd-kpi-row">
            <Kpi label="Plan (PCS)" value={formatNumber(kpis.plan)} />
            <Kpi label="Actual (PCS)" value={formatNumber(kpis.actual)} />
            <Kpi label="Achievement (%)" value={pct(kpis.achievementPct)} />
            <Kpi label="Remaining (PCS)" value={formatNumber(kpis.remaining)} />
            <Kpi label="Defect (PCS)" value={kpis.defect} />
            <Kpi label="Defect Rate (%)" value={kpis.defectRatePct} />
          </div>
        )}
      </Section>

      <Section title="Line Status Monitoring" note={srcChip(linesSrc, recsLoading)}>
        {recsLoading ? (
          <BlockShimmer height="sm" />
        ) : (
          <div className="xwd-pad">
            <table className="xw-table xwd-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th className="xwd-th-num">Plan (PCS)</th>
                  <th className="xwd-th-num">Actual (PCS)</th>
                  <th className="xwd-th-num">Achievement (%)</th>
                  <th className="xwd-th-num">Defect (PCS)</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.model}</td>
                    <td>
                      <span className="xwd-status">
                        <span className="xwd-dot" style={{ background: STATUS_COLOR[r.status] ?? "#888" }} />
                        {r.status}
                      </span>
                    </td>
                    <td className="xwd-num">{formatNumber(r.plan)}</td>
                    <td className="xwd-num">{formatNumber(r.actual)}</td>
                    <td className="xwd-num">{formatDecimal(r.achievementPct)}</td>
                    <td className="xwd-num">{r.defect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="xwd-cols2">
        <Section title="Output Trend (Daily)" note={srcChip(trendSrc, trendLoading)}>
          {trendLoading ? (
            <BlockShimmer height="lg" />
          ) : (
            <div className="xwd-pad">
              <TrendChart data={trend} />
            </div>
          )}
        </Section>
        <Section title="Defect Pareto Chart (Top 5)" note={srcChip(paretoSrc, paretoLoading)}>
          {paretoLoading ? (
            <BlockShimmer height="lg" />
          ) : (
            <div className="xwd-pad">
              <ParetoChart items={pareto} />
            </div>
          )}
        </Section>
      </div>

      <div className="xwd-cols3">
        <Section title="Alert Center" note={srcChip(alertsSrc, alertsLoading)}>
          {alertsLoading ? (
            <BlockShimmer height="sm" />
          ) : (
            <div className="xwd-pad">
              <table className="xw-table xwd-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={i}>
                      <td className="xwd-num">{a.time}</td>
                      <td>
                        <span className={LEVEL_CLS[a.level] ?? "xwd-badge xwd-badge-info"}>{a.level}</span>
                      </td>
                      <td>{a.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Document Center" note="Data demo">
          <div className="xwd-pad">
            <table className="xw-table xwd-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_DATA.documents.map((d, i) => (
                  <tr key={i}>
                    <td>{d.name}</td>
                    <td>{d.type}</td>
                    <td className="xwd-num">{d.lastUpdate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <style jsx>{`
        .xwd-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .xwd-panel {
          border: 1px solid #9c9c9c;
          background: #fff;
        }
        .xwd-section {
          background: linear-gradient(to bottom, #3165c4, #0a246a);
          color: #fff;
          padding: 4px 8px;
          border-bottom: 1px solid #0a246a;
        }
        .xwd-section h3 {
          margin: 0;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.02em;
        }
        .xwd-src-note {
          margin-left: 8px;
          font-size: 10px;
          font-weight: normal;
          opacity: 0.85;
        }
        .xwd-pad {
          padding: 8px;
        }
        .xwd-kpi-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
          padding: 8px;
        }
        .xwd-kpi {
          border: 1px solid #a0a0a0;
          background: #f2f0ea;
          padding: 6px 8px;
        }
        .xwd-kpi-label {
          display: block;
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .xwd-kpi-value {
          display: block;
          margin-top: 2px;
          font-size: 16px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
        }
        .xwd-table {
          border-collapse: collapse;
          width: 100%;
        }
        .xwd-table th {
          background: linear-gradient(to bottom, #f5f4ee, #d8d5cb);
          border: 1px solid #919b9c;
          border-bottom: 1px solid #6f7575;
          padding: 3px 8px;
          font-weight: bold;
          text-align: left;
          font-size: 11px;
          white-space: nowrap;
        }
        .xwd-table td {
          border: 1px solid #c0c0c0;
          padding: 3px 8px;
          font-size: 11px;
        }
        .xwd-th-num {
          text-align: right;
        }
        .xwd-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .xwd-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: bold;
          color: #1a1a1a;
        }
        .xwd-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.3);
          display: inline-block;
        }
        .xwd-badge {
          display: inline-block;
          padding: 0 6px;
          border: 1px solid;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }
        .xwd-badge-critical {
          background: #e0392b;
          color: #fff;
          border-color: #a52318;
        }
        .xwd-badge-warning {
          background: #ffdf80;
          color: #4d3800;
          border-color: #c8a13a;
        }
        .xwd-badge-info {
          background: #cfe3ff;
          color: #17408d;
          border-color: #6f94d6;
        }
        .xwd-cols2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .xwd-cols3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .xwd-legend {
          display: flex;
          gap: 16px;
          margin-top: 4px;
        }
        .xwd-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
        }
        .xwd-legend-swatch {
          width: 12px;
          height: 3px;
          display: inline-block;
        }
      `}</style>
    </main>
  );
}
