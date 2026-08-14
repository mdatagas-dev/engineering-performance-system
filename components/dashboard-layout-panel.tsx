"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "eps_dash_kpi_order";
const LAYOUT_NAME = "default";

type Props = {
  kpiLabels: string[];
  currentOrder: string[];
  onReorder(order: string[]): void;
};

type SavedLayout = {
  layout: { kpiOrder?: unknown } | null;
};

function readStoredOrder(raw: unknown): string[] | null {
  if (typeof raw !== "object" || raw === null) return null;
  const order = (raw as { kpiOrder?: unknown }).kpiOrder;
  return Array.isArray(order) ? order.filter((k): k is string => typeof k === "string") : null;
}

export default function DashboardLayoutPanel({ kpiLabels, currentOrder, onReorder }: Props) {
  const [order, setOrder] = useState<string[]>(() =>
    currentOrder.length === kpiLabels.length ? [...currentOrder] : [...kpiLabels]
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let stored: string[] | null = null;
      try {
        const res = await fetch("/api/dashboard/layout?layoutType=DASHBOARD");
        if (res.ok) {
          const body = (await res.json()) as { layout: SavedLayout | null };
          stored = readStoredOrder(body.layout?.layout);
        }
      } catch {
        stored = null;
      }
      if (!stored) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          stored = raw ? readStoredOrder({ kpiOrder: JSON.parse(raw) }) : null;
        } catch {
          stored = null;
        }
      }
      if (cancelled) return;
      const next = stored && stored.length === kpiLabels.length ? stored : [...kpiLabels];
      setOrder(next);
      onReorder(next);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: { kpiOrder: order },
          layoutType: "DASHBOARD",
          name: LAYOUT_NAME,
        }),
      });
      if (res.ok) {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        } catch {
          // localStorage penuh/tidak tersedia — abaikan, simpan server sudah cukup.
        }
        onReorder(order);
        setSaved(true);
      } else {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        } catch {
          // abaikan
        }
        onReorder(order);
        setSaved(true);
      }
    } catch {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
      } catch {
        // abaikan
      }
      onReorder(order);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dlp-panel">
      <div className="dlp-title">Dashboard KPI Order</div>
      <ul className="dlp-list">
        {order.map((label, i) => (
          <li key={label} className="dlp-row">
            <span className="dlp-index">{i + 1}</span>
            <span className="dlp-label">{label}</span>
            <button
              type="button"
              className="dlp-btn"
              aria-label={`Move ${label} up`}
              disabled={i === 0 || busy}
              onClick={() => move(i, -1)}
            >
              Up
            </button>
            <button
              type="button"
              className="dlp-btn"
              aria-label={`Move ${label} down`}
              disabled={i === order.length - 1 || busy}
              onClick={() => move(i, 1)}
            >
              Down
            </button>
          </li>
        ))}
      </ul>
      <div className="dlp-actions">
        <button type="button" className="dlp-btn dlp-btn--primary" disabled={busy} onClick={handleSave}>
          {busy ? "Saving..." : "Save"}
        </button>
        {saved && <span className="dlp-saved">Saved</span>}
      </div>
      <style jsx>{`
        .dlp-panel {
          border: 1px solid #919b9c;
          background: #ffffff;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
          width: 280px;
        }
        .dlp-title {
          background: linear-gradient(to bottom, #3165c4, #0a246a);
          color: #ffffff;
          padding: 4px 8px;
          font-weight: bold;
          letter-spacing: 0.02em;
        }
        .dlp-list {
          list-style: none;
          margin: 0;
          padding: 4px;
        }
        .dlp-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 4px;
        }
        .dlp-row + .dlp-row {
          border-top: 1px solid #e4e1d8;
        }
        .dlp-index {
          width: 18px;
          color: #555;
          font-weight: bold;
        }
        .dlp-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dlp-btn {
          border: 1px solid #919b9c;
          border-radius: 0;
          background: #f2f0ea;
          color: inherit;
          font: inherit;
          padding: 2px 8px;
          cursor: pointer;
        }
        .dlp-btn:hover:not(:disabled) {
          background: #ffffff;
        }
        .dlp-btn:active:not(:disabled) {
          border-color: #555;
        }
        .dlp-btn:disabled {
          color: #aaa;
          cursor: default;
        }
        .dlp-btn--primary {
          background: linear-gradient(to bottom, #3165c4, #0a246a);
          color: #ffffff;
          font-weight: bold;
        }
        .dlp-btn--primary:hover:not(:disabled) {
          background: linear-gradient(to bottom, #3f7ed6, #16308a);
        }
        .dlp-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-top: 1px solid #919b9c;
          background: #ece9d8;
        }
        .dlp-saved {
          color: #2e7d32;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
