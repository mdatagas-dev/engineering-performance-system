"use client";

import { useEffect, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  trainings as seedTrainings,
  TRAINING_CATEGORIES,
  TRAINING_STATUSES,
  type Training,
  type TrainingCategory,
  type TrainingStatus,
} from "@/lib/mocks/support";
import DemoBanner from "@/components/demo-banner";

const STORAGE_KEY = "eps-training-modules";

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

function nextCode(existing: readonly Training[]): string {
  const max = existing.reduce((acc, t) => {
    const n = parseInt(t.code.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `TR-${String(max + 1).padStart(3, "0")}`;
}

function loadCustom(): Training[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Training =>
        t &&
        typeof t.code === "string" &&
        typeof t.title === "string" &&
        typeof t.durationMinutes === "number" &&
        typeof t.lastUpdate === "string"
    );
  } catch {
    return [];
  }
}

export default function TrainingModulePage() {
  const session = useSessionGuard("dashboard.view");
  const [custom, setCustom] = useState<Training[]>([]);
  const [form, setForm] = useState<{
    title: string;
    category: TrainingCategory;
    durationMinutes: string;
    status: TrainingStatus;
    lastUpdate: string;
  }>({
    title: "",
    category: "SAFETY",
    durationMinutes: "",
    status: "AVAILABLE",
    lastUpdate: new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState<string | null>(null);

  // Load modul buatan pengguna (localStorage) setelah mount — hindari
  // hydration mismatch (localStorage tidak ada saat SSR).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustom(loadCustom());
  }, []);

  const trainings = [...custom, ...seedTrainings];

  function persist(next: Training[]) {
    setCustom(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleAdd() {
    const title = form.title.trim();
    if (!title) {
      setError("Judul pelatihan wajib diisi.");
      return;
    }
    const minutes = Number(form.durationMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError("Durasi wajib diisi (menit, angka positif).");
      return;
    }
    setError(null);
    const entry: Training = {
      code: nextCode(trainings),
      title,
      category: form.category,
      durationMinutes: minutes,
      status: form.status,
      lastUpdate: form.lastUpdate || new Date().toISOString().slice(0, 10),
    };
    persist([entry, ...custom]);
    setForm({
      title: "",
      category: "SAFETY",
      durationMinutes: "",
      status: "AVAILABLE",
      lastUpdate: new Date().toISOString().slice(0, 10),
    });
  }

  function handleDelete(code: string) {
    persist(custom.filter((t) => t.code !== code));
  }

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  return (
    <main className="xps-page">

      <DemoBanner note="Data dari lib/mocks/support.ts + input manual (tersimpan di browser)." />
      <section className="xw-panel xps-input-panel">
        <h2 className="xw-panel__title">Input Manual Training Modul</h2>
        <div className="xps-input-body">
          <label className="xps-field xps-field-title">
            <span>Judul Pelatihan</span>
            <input
              type="text"
              className="xps-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="mis. Pelatihan Kaizen Dasar"
            />
          </label>
          <label className="xps-field">
            <span>Kategori</span>
            <select
              className="xps-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TrainingCategory })}
            >
              {TRAINING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </label>
          <label className="xps-field">
            <span>Durasi (menit)</span>
            <input
              type="number"
              min="1"
              className="xps-input xps-num-input"
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
            />
          </label>
          <label className="xps-field">
            <span>Status</span>
            <select
              className="xps-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TrainingStatus })}
            >
              {TRAINING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </label>
          <label className="xps-field">
            <span>Update Terakhir</span>
            <input
              type="date"
              className="xps-input"
              value={form.lastUpdate}
              onChange={(e) => setForm({ ...form, lastUpdate: e.target.value })}
            />
          </label>
          <div className="xps-actions">
            <button type="button" className="xw-btn xw-btn--primary" onClick={handleAdd}>
              Tambah
            </button>
          </div>
        </div>
        {error && (
          <p className="xps-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="xw-panel">
        <h2 className="xw-panel__title">Training Modul</h2>
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
                {custom.length > 0 && <th className="xps-th-num">Aksi</th>}
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
                  {custom.length > 0 && (
                    <td className="xps-num">
                      {custom.some((c) => c.code === t.code) && (
                        <button type="button" className="xw-btn xps-del-btn" onClick={() => handleDelete(t.code)}>
                          Hapus
                        </button>
                      )}
                    </td>
                  )}
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
        .xps-input-panel {
          margin: 8px;
        }
        .xps-input-body {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 8px;
          padding: 8px;
        }
        .xps-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .xps-field span {
          font-weight: bold;
        }
        .xps-field-title {
          flex: 1;
          min-width: 220px;
        }
        .xps-num-input {
          width: 100px;
        }
        .xps-input {
          border: 1px solid #a0a0a0;
          padding: 3px 6px;
          font: inherit;
          background: #fff;
        }
        .xps-actions {
          display: flex;
          gap: 6px;
        }
        .xps-error {
          margin: 0;
          padding: 0 8px 8px;
          color: #b71c1c;
          font-weight: bold;
        }
        .xps-del-btn {
          min-width: 0;
          padding: 1px 8px;
          height: auto;
        }
      `}</style>
    </main>
  );
}
