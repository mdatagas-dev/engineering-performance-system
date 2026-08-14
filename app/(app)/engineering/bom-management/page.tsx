"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import {
  addItem,
  bomSeed,
  loadCollection,
  removeItem,
  type BomStatus,
  type Bom,
} from "@/lib/mocks/engineering";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#2e7d32",
  DRAFT: "#3165c4",
  OBSOLETE: "#757575",
};

const BOM_STATUS: readonly BomStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];

type BomForm = {
  code: string;
  product: string;
  partCount: string;
  revision: string;
  status: BomStatus;
  lastUpdate: string;
};

const today = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): BomForm => ({
  code: "",
  product: "",
  partCount: "0",
  revision: "1",
  status: "DRAFT",
  lastUpdate: today(),
});

const REQUIRED: Array<[keyof BomForm, string]> = [
  ["code", "Kode"],
  ["product", "Produk"],
];

export default function BomManagementPage() {
  const session = useSessionGuard("dashboard.view");
  const [boms, setBoms] = useState<readonly Bom[] | null>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<BomForm>(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.resolve(loadCollection("boms", bomSeed)).then((items) => {
      if (alive) setBoms(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => {
    if (!boms) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return boms;
    return boms.filter(
      (b) =>
        b.code.toLowerCase().includes(q) ||
        b.product.toLowerCase().includes(q)
    );
  }, [boms, filter]);

  function handleAdd() {
    const missing = REQUIRED.filter(([k]) => !form[k].trim());
    if (missing.length > 0) {
      setError(`Lengkapi bidang wajib: ${missing.map(([, l]) => l).join(", ")}`);
      return;
    }
    setError("");
    const item: Bom = {
      code: form.code.trim(),
      product: form.product.trim(),
      partCount: Number(form.partCount) || 0,
      revision: Number(form.revision) || 1,
      status: form.status,
      lastUpdate: form.lastUpdate,
    };
    setBoms(addItem("boms", item));
    setForm(emptyForm());
  }

  function handleReset() {
    setForm(emptyForm());
    setError("");
  }

  function handleRemove(code: string) {
    setBoms(removeItem<Bom>("boms", code));
  }

  if (!session || !boms || !rows) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const total = boms.length;
  const avgRevision = (boms.reduce((a, b) => a + b.revision, 0) / total).toFixed(2);
  const active = boms.filter((b) => b.status === "ACTIVE").length;

  return (
    <main className="xpe-page">
      <section className="xw-panel">
        <div className="xpe-titlebar">
          <h3 className="xw-panel__title">BOM Management</h3>
          <button type="button" className="xw-btn" onClick={() => window.print()}>
            Cetak
          </button>
        </div>

        <div className="xpe-kpi-row">
          <div className="xw-kpi">
            <span className="xw-kpi__label">Total BOM</span>
            <span className="xw-kpi__value">{total}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">Rata-rata Revisi</span>
            <span className="xw-kpi__value">{avgRevision}</span>
          </div>
          <div className="xw-kpi">
            <span className="xw-kpi__label">BOM Aktif</span>
            <span className="xw-kpi__value">{active}</span>
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
            <label className="xpe-field">
              <span>Produk</span>
              <input
                type="text"
                className="xpe-input"
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Jumlah Part</span>
              <input
                type="number"
                min="0"
                className="xpe-input xpe-num-input"
                value={form.partCount}
                onChange={(e) => setForm({ ...form, partCount: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Revisi</span>
              <input
                type="number"
                min="1"
                className="xpe-input xpe-num-input"
                value={form.revision}
                onChange={(e) => setForm({ ...form, revision: e.target.value })}
              />
            </label>
            <label className="xpe-field">
              <span>Status</span>
              <select
                className="xpe-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BomStatus })}
              >
                {BOM_STATUS.map((s) => (
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
            placeholder="Filter kode / produk..."
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
                <th>Produk</th>
                <th className="xpe-th-num">Jumlah Part</th>
                <th className="xpe-th-num">Revisi</th>
                <th>Status</th>
                <th>Update Terakhir</th>
                <th className="xpe-th-act">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.code}>
                  <td>{b.code}</td>
                  <td>{b.product}</td>
                  <td className="xpe-num">{b.partCount.toLocaleString("id-ID")}</td>
                  <td className="xpe-num">{b.revision}</td>
                  <td>
                    <span className="xpe-status">
                      <span className="xpe-dot" style={{ background: STATUS_COLOR[b.status] ?? "#888" }} />
                      {b.status}
                    </span>
                  </td>
                  <td>{b.lastUpdate}</td>
                  <td>
                    <button type="button" className="xw-btn xpe-del" onClick={() => handleRemove(b.code)}>
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
        .xpe-num-input {
          width: 90px;
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
        .xpe-th-num {
          text-align: right;
        }
        .xpe-th-act {
          width: 1%;
          white-space: nowrap;
        }
        .xpe-num {
          text-align: right;
          font-variant-numeric: tabular-nums;
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
