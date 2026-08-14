"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  addItem,
  changeRequestSeed,
  loadCollection,
  removeItem,
  type ChangeRequest,
  type CrPriority,
  type CrStatus,
} from "@/lib/mocks/engineering";

const STATUS_CLS: Record<CrStatus, string> = {
  OPEN: "xpe-badge xpe-blue",
  "IN REVIEW": "xpe-badge xpe-amber",
  APPROVED: "xpe-badge xpe-green",
  REJECTED: "xpe-badge xpe-red",
};

const PRIORITY_CLS: Record<CrPriority, string> = {
  LOW: "xpe-badge xpe-gray",
  MEDIUM: "xpe-badge xpe-amber",
  HIGH: "xpe-badge xpe-red",
};

const CR_STATUS: readonly CrStatus[] = ["OPEN", "IN REVIEW", "APPROVED", "REJECTED"];
const CR_PRIORITY: readonly CrPriority[] = ["LOW", "MEDIUM", "HIGH"];

type CrForm = {
  code: string;
  title: string;
  requester: string;
  date: string;
  status: CrStatus;
  priority: CrPriority;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): CrForm => ({
  code: "",
  title: "",
  requester: "",
  date: today(),
  status: "OPEN",
  priority: "MEDIUM",
});

const REQUIRED: Array<[keyof CrForm, string]> = [
  ["code", "Kode"],
  ["title", "Judul"],
  ["requester", "Pemohon"],
];

export default function ChangeRequestPage() {
  const session = useSessionGuard("dashboard.view");
  const [crs, setCrs] = useState<readonly ChangeRequest[] | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<CrForm>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.resolve(loadCollection("changeRequests", changeRequestSeed)).then((items) => {
      if (alive) setCrs(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!crs) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return crs;
    return crs.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.requester.toLowerCase().includes(q)
    );
  }, [crs, filter]);

  function handleAdd() {
    const missing = REQUIRED.filter(([k]) => !form[k].trim());
    if (missing.length > 0) {
      setError(`Lengkapi bidang wajib: ${missing.map(([, l]) => l).join(", ")}`);
      return;
    }
    setError("");
    setCrs(addItem("changeRequests", { ...form }));
    setForm(emptyForm());
  }

  function handleReset() {
    setForm(emptyForm());
    setError("");
  }

  function handleRemove(code: string) {
    setCrs(removeItem<ChangeRequest>("changeRequests", code));
  }

  if (!session || !crs || !rows) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = crs.length;
  const open = crs.filter((c) => c.status === "OPEN").length;
  const approved = crs.filter((c) => c.status === "APPROVED").length;

  return (
    <main className="xpe-page">
      <section className="xw-panel">
        <div className="xpe-titlebar">
          <h3 className="xw-panel__title">Change Request</h3>
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Cetak
          </button>
        </div>

        <div className="xpe-kpi-row">
          <div className="xw-kpi">
            <span className="xw-kpi__label">Total CR</span>
            <span className="xw-kpi__value">{total}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Terbuka (OPEN)</span>
            <span className="xw-kpi__value">{open}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Disetujui (APPROVED)</span>
            <span className="xw-kpi__value">{approved}</span>
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
              <span>Pemohon</span>
              <input
                type="text"
                className="xpe-input"
                value={form.requester}
                onChange={(e) => setForm({ ...form, requester: e.target.value })}
              />
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
              <span>Prioritas</span>
              <select
                className="xpe-input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as CrPriority })}
              >
                {CR_PRIORITY.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="xpe-field">
              <span>Status</span>
              <select
                className="xpe-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CrStatus })}
              >
                {CR_STATUS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
            placeholder="Filter kode / judul / pemohon..."
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
                <th>Pemohon</th>
                <th>Tanggal</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th className="xpe-th-act">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.code}>
                  <td>{c.code}</td>
                  <td>{c.title}</td>
                  <td>{c.requester}</td>
                  <td>{c.date}</td>
                  <td>
                    <span className={PRIORITY_CLS[c.priority]}>{c.priority}</span>
                  </td>
                  <td>
                    <span className={STATUS_CLS[c.status]}>{c.status}</span>
                  </td>
                  <td>
                    <button type="button" className="xw-btn xpe-del" onClick={() => handleRemove(c.code)}>
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
        .xpe-blue {
          background: #cfe3ff;
          color: #17408d;
          border-color: #6f94d6;
        }
        .xpe-amber {
          background: #ffdf80;
          color: #4d3800;
          border-color: #c8a13a;
        }
        .xpe-green {
          background: #c8e6c9;
          color: #1b5e20;
          border-color: #66a06a;
        }
        .xpe-red {
          background: #ffcdd2;
          color: #b71c1c;
          border-color: #d98a8f;
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
