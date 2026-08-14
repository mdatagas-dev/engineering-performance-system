"use client";

import { useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  documents,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/lib/mocks/support";

const TYPE_LABELS: Record<DocumentType, string> = {
  SOP: "Standard Operating Procedure",
  WI: "Work Instruction",
  FORM: "Formulir",
  DRAWING: "Drawing",
};

export default function DocumentCenterPage() {
  const session = useSessionGuard("dashboard.view");
  const [filter, setFilter] = useState<DocumentType | "ALL">("ALL");

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const filtered =
    filter === "ALL" ? documents : documents.filter((d) => d.type === filter);
  const sopCount = documents.filter((d) => d.type === "SOP").length;

  return (
    <main className="xps-page">
      <section className="xw-panel">
        <h2 className="xw-panel__title">Document Center</h2>
        <div className="xps-kpi-row">
          <div className="xw-kpi xps-kpi">
            <span className="xw-kpi__label xps-kpi-label">Total Dokumen</span>
            <span className="xw-kpi__value">{documents.length}</span>
          </div>
          <div className="xw-kpi xps-kpi">
            <span className="xw-kpi__label xps-kpi-label">Jumlah SOP</span>
            <span className="xw-kpi__value">{sopCount}</span>
          </div>
        </div>
        <div className="xps-pad">
          <div className="xps-toolbar">
            <label className="xps-filter-label" htmlFor="type-filter">
              Filter Tipe Dokumen
            </label>
            <select
              id="type-filter"
              className="xps-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as DocumentType | "ALL")}
            >
              <option value="ALL">Semua Tipe</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t} - {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <table className="xw-table xps-table">
            <thead>
              <tr>
                <th>Nama Dokumen</th>
                <th>Tipe</th>
                <th>Versi</th>
                <th>Pemilik</th>
                <th className="xps-th-num">Update Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>
                    <span className="xps-badge xps-badge-type">{d.type}</span>
                  </td>
                  <td className="xps-num">v{d.version}</td>
                  <td>{d.owner}</td>
                  <td className="xps-num">{d.lastUpdate}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="xps-empty">
                    Tidak ada dokumen untuk tipe ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .xps-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .xps-kpi-row {
          display: flex;
          gap: 6px;
          padding: 8px 8px 0;
        }
        .xps-kpi {
          flex: 1;
        }
        .xps-kpi-label {
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .xps-pad {
          padding: 8px;
        }
        .xps-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0 8px;
        }
        .xps-filter-label {
          font-weight: bold;
        }
        .xps-select {
          border: 1px solid #7f9db9;
          background: #fff;
          font-family: inherit;
          font-size: 11px;
          padding: 2px 4px;
          box-shadow: inset 1px 1px 0 #d0d0d0;
        }
        .xps-select:focus {
          outline: 1px solid #3165c4;
        }
        .xps-table td,
        .xps-table th {
          padding: 3px 8px;
          font-size: 11px;
        }
        .xps-th-num {
          text-align: right;
          white-space: nowrap;
        }
        .xps-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .xps-badge {
          display: inline-block;
          padding: 0 6px;
          border: 1px solid #6f94d6;
          background: #cfe3ff;
          color: #17408d;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }
        .xps-empty {
          text-align: center;
          color: #666;
          padding: 12px 8px;
        }
      `}</style>
    </main>
  );
}
