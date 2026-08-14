"use client";

import { useSessionGuard } from "@/hooks/use-session-guard";
import { trainings } from "@/lib/mocks/support";

const CATEGORY_LABELS: Record<string, string> = {
  SAFETY: "Keselamatan",
  PROCESS: "Proses",
  QUALITY: "Kualitas",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Tersedia",
  "IN PROGRESS": "Berjalan",
  ARCHIVED: "Arsip",
};

const STATUS_CLS: Record<string, string> = {
  AVAILABLE: "xps-badge-ok",
  "IN PROGRESS": "xps-badge-run",
  ARCHIVED: "xps-badge-arch",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

export default function TrainingMaterialPage() {
  const session = useSessionGuard("dashboard.view");

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return (
    <main className="xps-page">
      <section className="xw-panel">
        <h2 className="xw-panel__title">Training Material</h2>
        <div className="xps-pad">
          <table className="xw-table xps-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul Pelatihan</th>
                <th>Kategori</th>
                <th>Durasi</th>
                <th>Status</th>
                <th className="xps-th-num">Update Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => (
                <tr key={t.code}>
                  <td className="xps-num">{t.code}</td>
                  <td>{t.title}</td>
                  <td>{CATEGORY_LABELS[t.category] ?? t.category}</td>
                  <td className="xps-num">{formatDuration(t.durationMinutes)}</td>
                  <td>
                    <span className={`xps-badge ${STATUS_CLS[t.status] ?? "xps-badge-arch"}`}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="xps-num">{t.lastUpdate}</td>
                </tr>
              ))}
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
        .xps-pad {
          padding: 8px;
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
          border: 1px solid;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }
        .xps-badge-ok {
          background: #dff0d8;
          color: #1b5e20;
          border-color: #7cb57c;
        }
        .xps-badge-run {
          background: #ffdf80;
          color: #4d3800;
          border-color: #c8a13a;
        }
        .xps-badge-arch {
          background: #e0e0e0;
          color: #444;
          border-color: #a0a0a0;
        }
      `}</style>
    </main>
  );
}
