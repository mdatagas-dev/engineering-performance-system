"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import DemoBanner from "@/components/demo-banner";
import {

  addItem,
  drawingSeed,
  loadCollection,
  removeItem,
  type DrawingType,
  type Drawing,
} from "@/lib/mocks/engineering";

const TYPE_LABEL: Record<string, string> = {
  ASSY: "Rakitan",
  PART: "Komponen",
  LAYOUT: "Layout",
};

const DRAWING_TYPES: readonly DrawingType[] = ["ASSY", "PART", "LAYOUT"];

type DrawingForm = {
  code: string;
  title: string;
  model: string;
  type: DrawingType;
  revision: string;
  lastUpdate: string;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): DrawingForm => ({
  code: "",
  title: "",
  model: "",
  type: "PART",
  revision: "",
  lastUpdate: today(),
});

const REQUIRED: Array<[keyof DrawingForm, string]> = [
  ["code", "Kode"],
  ["title", "Judul"],
  ["model", "Model"],
];

export default function DrawingManagementPage() {
  const session = useSessionGuard("dashboard.view");
  const [drawings, setDrawings] = useState<readonly Drawing[] | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<DrawingForm>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.resolve(loadCollection("drawings", drawingSeed)).then((items) => {
      if (alive) setDrawings(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!drawings) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return drawings;
    return drawings.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q)
    );
  }, [drawings, filter]);

  function handleAdd() {
    const missing = REQUIRED.filter(([k]) => !form[k].trim());
    if (missing.length > 0) {
      setError(`Lengkapi bidang wajib: ${missing.map(([, l]) => l).join(", ")}`);
      return;
    }
    setError("");
    setDrawings(addItem("drawings", { ...form }));
    setForm(emptyForm());
  }

  function handleReset() {
    setForm(emptyForm());
    setError("");
  }

  function handleRemove(code: string) {
    setDrawings(removeItem<Drawing>("drawings", code));
  }

  if (!session || !drawings || !rows) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = drawings.length;
  const assy = drawings.filter((d) => d.type === "ASSY").length;
  const part = drawings.filter((d) => d.type === "PART").length;

  return (
    <main className="xpe-page">

      <DemoBanner note="Data berasal dari lib/mocks/engineering.ts." />
      <section className="xw-panel">
        <div className="xpe-titlebar">
          <h3 className="xw-panel__title">Drawing Management</h3>
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Cetak
          </button>
        </div>

        <div className="xpe-kpi-row">
          <div className="xw-kpi">
            <span className="xw-kpi__label">Total Drawing</span>
            <span className="xw-kpi__value">{total}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Rakitan (ASSY)</span>
            <span className="xw-kpi__value">{assy}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Komponen (PART)</span>
            <span className="xw-kpi__value">{part}</span>
          </div>
        </div>

        <section className="xw-panel xpe-input-panel">
          <h4 className="xw-panel__title">Input Manual</h4>
          <div className="xpe-input-body">
            <label className="xpe-field">
              <span>Kode</span>
              <input
                type="text"
                className="xpe-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label className="xpe-field xpe-field--wide">
              <span>Judul</span>
              <input
                type="text"
                className="xpe-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Model</span>
              <input
                type="text"
                className="xpe-input"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Tipe</span>
              <select
                className="xpe-input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as DrawingType })}
              >
                {DRAWING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="xpe-field">
              <span>Revisi</span>
              <input
                type="text"
                className="xpe-input"
                value={form.revision}
                onChange={(e) => setForm({ ...form, revision: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Update Terakhir</span>
              <input
                type="date"
                className="xpe-input"
                value={form.lastUpdate}
                onChange={(e) => setForm({ ...form, lastUpdate: e.target.value })}
              />
            </label>
            <div className="xpe-actions">
              <button type="button" className="xw-btn xw-btn--primary" onClick={handleAdd}>
                Tambah
              </button>
              <button type="button" className="xw-btn" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
          {error && <p className="xpe-error">{error}</p>}
        </section>

        <div className="xpe-toolbar">
          <input
            type="text"
            className="xpe-input"
            placeholder="Filter kode / judul / model..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="xpe-count">{rows.length} baris</span>
        </div>

        <div className="xpe-pad">
          <table className="xw-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul</th>
                <th>Model</th>
                <th>Tipe</th>
                <th>Revisi</th>
                <th>Update Terakhir</th>
                <th className="xpe-th-act">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.code}>
                  <td>{d.code}</td>
                  <td>{d.title}</td>
                  <td>{d.model}</td>
                  <td>
                    <span className="xpe-badge xpe-gray">{TYPE_LABEL[d.type]}</span>
                  </td>
                  <td>{d.revision}</td>
                  <td>{d.lastUpdate}</td>
                  <td>
                    <button type="button" className="xw-btn xpe-del" onClick={() => handleRemove(d.code)}>
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .xpe-page {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
        }
        .xpe-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .xpe-titlebar h3 {
          flex: 1;
        }
        .xpe-kpi-row {
          display: flex;
          gap: 8px;
          padding: 8px 8px 0;
        }
        .xpe-input-panel {
          margin: 8px;
        }
        .xpe-input-body {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          gap: 8px;
          padding: 8px;
        }
        .xpe-field {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .xpe-field span {
          font-weight: bold;
        }
        .xpe-field--wide input {
          width: 240px;
        }
        .xpe-actions {
          display: flex;
          gap: 6px;
        }
        .xpe-error {
          margin: 0;
          padding: 0 8px 8px;
          color: #b71c1c;
          font-weight: bold;
        }
        .xpe-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
        }
        .xpe-input {
          border: 1px solid #a0a0a0;
          padding: 3px 6px;
          font: inherit;
          background: #fff;
        }
        .xpe-count {
          color: #555;
        }
        .xpe-pad {
          padding: 0 8px 8px;
        }
        .xpe-th-act {
          width: 1%;
          white-space: nowrap;
        }
        .xpe-del {
          padding: 1px 8px;
        }
        .xpe-badge {
          display: inline-block;
          padding: 0 6px;
          border: 1px solid;
          font-size: 10px;
          font-weight: bold;
          white-space: nowrap;
        }
        .xpe-gray {
          background: #e4e4e4;
          color: #333;
          border-color: #9e9e9e;
        }
      `}</style>
    </main>
  );
}
