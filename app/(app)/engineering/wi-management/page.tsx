"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import DemoBanner from "@/components/demo-banner";
import {

  addItem,
  loadCollection,
  removeItem,
  wisSeed,
  type WiStatus,
  type WorkInstruction,
} from "@/lib/mocks/engineering";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#2e7d32",
  DRAFT: "#3165c4",
  OBSOLETE: "#757575",
};

const WI_STATUS: readonly WiStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];

type WiForm = {
  code: string;
  title: string;
  model: string;
  revision: string;
  status: WiStatus;
  lastUpdate: string;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): WiForm => ({
  code: "",
  title: "",
  model: "",
  revision: "",
  status: "DRAFT",
  lastUpdate: today(),
});

const REQUIRED: Array<[keyof WiForm, string]> = [
  ["code", "Kode"],
  ["title", "Judul"],
  ["model", "Model"],
];

export default function WiManagementPage() {
  const session = useSessionGuard("dashboard.view");
  const [wis, setWis] = useState<readonly WorkInstruction[] | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<WiForm>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.resolve(loadCollection("wis", wisSeed)).then((items) => {
      if (alive) setWis(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!wis) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return wis;
    return wis.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.title.toLowerCase().includes(q) ||
        w.model.toLowerCase().includes(q)
    );
  }, [wis, filter]);

  function handleAdd() {
    const missing = REQUIRED.filter(([k]) => !form[k].trim());
    if (missing.length > 0) {
      setError(`Lengkapi bidang wajib: ${missing.map(([, l]) => l).join(", ")}`);
      return;
    }
    setError("");
    setWis(addItem("wis", { ...form }));
    setForm(emptyForm());
  }

  function handleReset() {
    setForm(emptyForm());
    setError("");
  }

  function handleRemove(code: string) {
    setWis(removeItem<WorkInstruction>("wis", code));
  }

  if (!session || !wis || !rows) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = wis.length;
  const active = wis.filter((w) => w.status === "ACTIVE").length;
  const draft = wis.filter((w) => w.status === "DRAFT").length;

  return (
    <main className="xpe-page">

      <DemoBanner note="Data berasal dari lib/mocks/engineering.ts." />
      <section className="xw-panel">
        <div className="xpe-titlebar">
          <h3 className="xw-panel__title">Work Instruction Management</h3>
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Cetak
          </button>
        </div>

        <div className="xpe-kpi-row">
          <div className="xw-kpi">
            <span className="xw-kpi__label">Total WI</span>
            <span className="xw-kpi__value">{total}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Aktif</span>
            <span className="xw-kpi__value">{active}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Draft</span>
            <span className="xw-kpi__value">{draft}</span>
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
              <span>Revisi</span>
              <input
                type="text"
                className="xpe-input"
                value={form.revision}
                onChange={(e) => setForm({ ...form, revision: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Status</span>
              <select
                className="xpe-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as WiStatus })}
              >
                {WI_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
                <th>Revisi</th>
                <th>Status</th>
                <th>Update Terakhir</th>
                <th className="xpe-th-act">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.code}>
                  <td>{w.code}</td>
                  <td>{w.title}</td>
                  <td>{w.model}</td>
                  <td>{w.revision}</td>
                  <td>
                    <span className="xpe-status">
                      <span className="xpe-dot" style={{ background: STATUS_COLOR[w.status] ?? "#888" }} />
                      {w.status}
                    </span>
                  </td>
                  <td>{w.lastUpdate}</td>
                  <td>
                    <button type="button" className="xw-btn xpe-del" onClick={() => handleRemove(w.code)}>
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
        .xpe-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-weight: bold;
        }
        .xpe-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.3);
          display: inline-block;
        }
      `}</style>
    </main>
  );
}
