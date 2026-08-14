"use client";

import { useEffect, useState } from "react";
import { fetchAllRecords } from "@/lib/api/records";
import type { MockProductionRecord } from "@/lib/mocks/records";

type QualityComponentKey = "completeness" | "validity" | "duplication" | "anomaly";

type QualityScoreResult = {
  score: number | null;
  reason?: string;
  totalRecords: number;
  components: Record<QualityComponentKey, number | null>;
  perComponent: { component: QualityComponentKey; score: number | null; issueCount: number }[];
  issueCount: number;
  message?: string;
};

const COMPONENT_LABELS: Record<QualityComponentKey, string> = {
  completeness: "Completeness (Kelengkapan)",
  validity: "Validity (Validitas)",
  duplication: "Duplication (Duplikasi)",
  anomaly: "Anomaly (Anomali)",
};

const COMPONENT_ORDER: QualityComponentKey[] = ["completeness", "validity", "duplication", "anomaly"];

function toScorePayload(records: MockProductionRecord[]): Record<string, unknown>[] {
  return records.map((r) => ({
    date: r.date,
    model: r.model,
    shift: r.shift,
    uphTarget: r.uphTarget,
    uphResult: r.uphResult,
    hcStandard: r.hcStandard,
    hcActual: r.hcActual,
    plan: r.plan,
    outputProd: r.outputProd,
    totalSetup: r.totalSetup,
    workingHour: r.workingHour,
    totalSetupPacking: r.totalSetupPacking,
    workingHourPacking: r.workingHourPacking,
    upph: r.upph,
    duplicateKey: `${r.date}|${r.model}|${r.shift ?? ""}|${r.area?.id ?? ""}`,
  }));
}

const scoreCls = (score: number | null): string => {
  if (score === null) return "qsp-score-none";
  if (score >= 80) return "qsp-score-good";
  if (score >= 60) return "qsp-score-warn";
  return "qsp-score-bad";
};

export function QualityScorePanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QualityScoreResult | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const records = await fetchAllRecords();
        if (!alive) return;
        if (records.length === 0) {
          setEmpty(true);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/quality-score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toScorePayload(records)),
        });
        const data = (await res.json().catch(() => null)) as QualityScoreResult | null;
        if (!alive) return;
        if (!res.ok || !data) {
          setError(data?.message ?? `Gagal menghitung skor kualitas (${res.status}).`);
        } else {
          setResult(data);
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Gagal memuat skor kualitas.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="xw-panel qsp-panel">
      <h2 className="xw-panel__title qsp-title">Data Quality Score</h2>
      <div className="qsp-body">
        {loading ? (
          <div className="qsp-hint">Menghitung skor kualitas data...</div>
        ) : error ? (
          <div className="qsp-error">{error}</div>
        ) : empty ? (
          <div className="qsp-hint">Tidak ada record produksi untuk dinilai.</div>
        ) : result ? (
          <div className="qsp-grid">
            <div className="qsp-score">
              <span className="qsp-score-label">Skor</span>
              <span className={`qsp-score-value ${scoreCls(result.score)}`}>
                {result.score === null ? "-" : result.score.toFixed(1)}
              </span>
              <span className="qsp-score-meta">
                {result.totalRecords} record - {result.issueCount} isu
              </span>
              {result.reason ? <span className="qsp-score-meta">{result.reason}</span> : null}
            </div>
            <table className="xw-table qsp-table">
              <thead>
                <tr>
                  <th>Komponen</th>
                  <th className="qsp-num">Skor</th>
                  <th className="qsp-num">Isu</th>
                </tr>
              </thead>
              <tbody>
                {COMPONENT_ORDER.map((c) => {
                  const s = result.components[c];
                  const per = result.perComponent.find((p) => p.component === c);
                  return (
                    <tr key={c}>
                      <td>{COMPONENT_LABELS[c]}</td>
                      <td className={`qsp-num ${scoreCls(s === null ? null : Math.round(s * 1000) / 10)}`}>
                        {s === null ? "-" : `${(s * 100).toFixed(1)}%`}
                      </td>
                      <td className="qsp-num">{per?.issueCount ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      <style jsx>{`
        .qsp-panel {
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .qsp-title {
          font-size: 11px;
        }
        .qsp-body {
          padding: 8px;
        }
        .qsp-grid {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 8px;
        }
        .qsp-score {
          border: 1px solid #a0a0a0;
          background: #f2f0ea;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .qsp-score-label {
          font-size: 10px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .qsp-score-value {
          font-size: 28px;
          font-weight: bold;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .qsp-score-good {
          color: #1e6b1e;
        }
        .qsp-score-warn {
          color: #9c6b00;
        }
        .qsp-score-bad {
          color: #b00000;
        }
        .qsp-score-none {
          color: #666;
        }
        .qsp-score-meta {
          font-size: 10px;
          color: #555;
        }
        .qsp-table th {
          font-size: 11px;
        }
        .qsp-table td {
          font-size: 11px;
        }
        .qsp-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .qsp-hint {
          padding: 16px 8px;
          text-align: center;
          color: #555;
        }
        .qsp-error {
          padding: 8px;
          border: 1px solid #a52318;
          background: #fbe9e7;
          color: #a52318;
        }
        @media (max-width: 640px) {
          .qsp-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
