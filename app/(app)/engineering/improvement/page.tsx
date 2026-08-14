"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  addItem,
  improvementSeed,
  loadCollection,
  removeItem,
  type Improvement,
  type ImprovementStatus,
} from "@/lib/mocks/engineering";

const STATUS_CLS: Record<ImprovementStatus, string> = {
  IDEA: "xpe-badge xpe-gray",
  PLANNED: "xpe-badge xpe-blue",
  DONE: "xpe-badge xpe-green",
};

const IMPROVEMENT_STATUS: readonly ImprovementStatus[] = ["IDEA", "PLANNED", "DONE"];

type ImprovementForm = {
  code: string;
  title: string;
  area: string;
  category: string;
  status: ImprovementStatus;
  date: string;
  owner: string;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): ImprovementForm => ({
  code: "",
  title: "",
  area: "",
  category: "",
  status: "IDEA",
  date: today(),
  owner: "",
});

const REQUIRED: Array<[keyof ImprovementForm, string]> = [
  ["code", "Kode"],
  ["title", "Judul"],
  ["area", "Area"],
  ["category", "Kategori"],
  ["owner", "Pemilik"],
];

export default function ImprovementPage() {
  const session = useSessionGuard("dashboard.view");
  const [improvements, setImprovements] = useState<readonly Improvement[] | null>(null);
  const [category, setCategory] = useState("");
  const [form, setForm] = useState<ImprovementForm>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.resolve(loadCollection("improvements", improvementSeed)).then((items) => {
      if (alive) setImprovements(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Set((improvements ?? []).map((i) => i.category))].sort(),
    [improvements]
  );

  const rows = useMemo(() => {
    if (!improvements) return null;
    if (!category) return improvements;
    return improvements.filter((i) => i.category === category);
  }, [improvements, category]);

  function handleAdd() {
    const missing = REQUIRED.filter(([k]) => !form[k].trim());
    if (missing.length > 0) {
      setError(`Lengkapi bidang wajib: ${missing.map(([, l]) => l).join(", ")}`);
      return;
    }
    setError("");
    setImprovements(addItem("improvements", { ...form }));
    setForm(emptyForm());
  }

  function handleReset() {
    setForm(emptyForm());
    setError("");
  }

  function handleRemove(code: string) {
    setImprovements(removeItem<Improvement>("improvements", code));
  }

  if (!session || !improvements || !rows) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = improvements.length;
  const planned = improvements.filter((i) => i.status === "PLANNED").length;
  const done = improvements.filter((i) => i.status === "DONE").length;

  return (
    <main className="xpe-page">
      <section className="xw-panel">
        <div className="xpe-titlebar">
          <h3 className="xw-panel__title">Improvement</h3>
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Cetak
          </button>
        </div>

        <div className="xpe-kpi-row">
          <div className="xw-kpi">
            <span className="xw-kpi__label">Total Ide</span>
            <span className="xw-kpi__value">{total}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Terencana (PLANNED)</span>
            <span className="xw-kpi__value">{planned}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Selesai (DONE)</span>
            <span className="xw-kpi__value">{done}</span>
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
              <span>Area</span>
              <input
                type="text"
                className="xpe-input"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Kategori</span>
              <input
                type="text"
                className="xpe-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Status</span>
              <select
                className="xpe-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ImprovementStatus })}
              >
                {IMPROVEMENT_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="xpe-field">
              <span>Tanggal</span>
              <input
                type="date"
                className="xpe-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Pemilik</span>
              <input
                type="text"
                className="xpe-input"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
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
          <label className="xpe-filter-label" htmlFor="xpe-category">
            Kategori
          </label>
          <select
            id="xpe-category"
            className="xpe-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="xpe-count">{rows.length} baris</span>
        </div>

        <div className="xpe-pad">
          <table className="xw-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Judul</th>
                <th>Area</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Pemilik</th>
                <th className="xpe-th-act">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.code}>
                  <td>{i.code}</td>
                  <td>{i.title}</td>
                  <td>{i.area}</td>
                  <td>{i.category}</td>
                  <td>
                    <span className={STATUS_CLS[i.status]}>{i.status}</span>
                  </td>
                  <td>{i.date}</td>
                  <td>{i.owner}</td>
                  <td>
                    <button type="button" className="xw-btn xpe-del" onClick={() => handleRemove(i.code)}>
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
        .xpe-filter-label {
          font-weight: bold;
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
        .xpe-blue {
          background: #cfe3ff;
          color: #17408d;
          border-color: #6f94d6;
        }
        .xpe-green {
          background: #c8e6c9;
          color: #1b5e20;
          border-color: #66a06a;
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
