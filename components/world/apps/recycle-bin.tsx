"use client";

import { useEffect, useState, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "../winxp-icons";

type BinItem = { id: string; label: string; icon?: string };

const MOCK_ITEMS: BinItem[] = [
  { id: "mock-1", label: "LAPORAN_LAMA.txt" },
  { id: "mock-2", label: "SETUP_1998.EXE" },
  { id: "mock-3", label: "SURAT_CINTA.txt" },
];

const ICON_NAMES = new Set<WinXpIconName>([
  "my-computer",
  "my-documents",
  "recycle-bin",
  "notepad",
  "calculator",
  "command-prompt",
  "minesweeper",
  "game-house",
  "internet-explorer",
  "network-places",
  "control-panel",
  "gas-pms",
  "document-center",
  "production",
  "quality",
  "engineering",
  "maintenance",
  "folder",
  "folder-open",
  "file",
  "drive",
  "shared-documents",
  "windows-flag",
  "run",
  "help",
  "search",
  "shutdown",
]);

const hash = (s: string): number =>
  s.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const itemIcon = (it: BinItem): WinXpIconName =>
  it.icon && ICON_NAMES.has(it.icon as WinXpIconName)
    ? (it.icon as WinXpIconName)
    : "recycle-bin";

const itemType = (label: string): string =>
  label.toLowerCase().endsWith(".txt")
    ? "Text Document"
    : label.toLowerCase().endsWith(".exe")
      ? "Application"
      : "File";

const itemSize = (id: string): string => {
  const bytes = (hash(id) % 9000) + 2048;
  return `${(bytes / 1024).toFixed(2)} KB`;
};

const itemDate = (id: string): string => {
  const day = (hash(id + ":d") % 14) + 1;
  const hour = hash(id + ":t") % 24;
  const minute = hash(id + ":m") % 60;
  return `8/${day}/2026 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export function RecycleBinApp({
  deleted,
  onRestore,
  onEmpty,
}: {
  deleted?: { id: string; label: string; icon?: string }[];
  onRestore?: (id: string) => void;
  onEmpty?: () => void;
}): ReactNode {
  const [internal, setInternal] = useState<BinItem[]>(MOCK_ITEMS);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [propsId, setPropsId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const controlled = typeof deleted !== "undefined" && deleted.length > 0;
  const source = controlled ? deleted : internal;
  const items = source.filter((i) => !removed.has(i.id));

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const drop = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    setInternal((prev) => prev.filter((i) => i.id !== id));
  };

  const restore = (id: string) => {
    onRestore?.(id);
    setRemoved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setInternal((prev) => prev.filter((i) => i.id !== id));
    setMenu(null);
    setStatus("Dipulihkan");
  };

  const empty = () => {
    onEmpty?.();
    setInternal([]);
    setRemoved(new Set());
    setConfirming(false);
    setStatus("Recycle Bin kosong");
  };

  const propItem = items.find((i) => i.id === propsId) ?? null;

  return (
    <div
      className="xpa-rb-app"
      onMouseDown={() => setMenu(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMenu(null);
          setConfirming(false);
          setPropsId(null);
        }
      }}
    >
      <div className="xpa-rb-toolbar" role="toolbar" aria-label="Recycle Bin toolbar">
        <button
          type="button"
          className="xpa-rb-btn"
          onClick={() => setConfirming(true)}
          disabled={items.length === 0}
        >
          Empty Recycle Bin
        </button>
      </div>

      <div className="xpa-rb-list">
        {items.length === 0 ? (
          <p className="xpa-rb-empty">Recycle Bin kosong</p>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="xpa-rb-row"
              role="button"
              tabIndex={0}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, id: it.id });
              }}
            >
              <span className="xpa-rb-row__icon">
                <WinXpIcon name={itemIcon(it)} size={16} />
              </span>
              <span className="xpa-rb-row__name">{it.label}</span>
              <span className="xpa-rb-row__date">{itemDate(it.id)}</span>
              <button
                type="button"
                className="xpa-rb-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  restore(it.id);
                }}
              >
                Restore
              </button>
            </div>
          ))
        )}
      </div>

      <div className="xpa-rb-status">
        <span className="xpa-rb-status__cell">
          {items.length === 0 ? "0 object(s)" : `${items.length} object(s)`}
        </span>
        {status && <span className="xpa-rb-status__cell xpa-rb-status__cell--msg">{status}</span>}
      </div>

      {menu && (
        <div
          className="xpa-rb-menu"
          role="menu"
          aria-label="Menu item Recycle Bin"
          style={{ left: menu.x, top: menu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button type="button" role="menuitem" className="xpa-rb-menu__item" onClick={() => restore(menu.id)}>
            Restore
          </button>
          <button
            type="button"
            role="menuitem"
            className="xpa-rb-menu__item"
            onClick={() => {
              setPropsId(menu.id);
              setMenu(null);
            }}
          >
            Properties
          </button>
          <button
            type="button"
            role="menuitem"
            className="xpa-rb-menu__item"
            onClick={() => {
              drop(menu.id);
              setMenu(null);
              setStatus("Item dihapus permanen");
            }}
          >
            Delete Permanently
          </button>
        </div>
      )}

      {confirming && (
        <div className="xpa-rb-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-rb-dialog" role="dialog" aria-modal="true" aria-label="Empty Recycle Bin">
            <div className="xpa-rb-dialog__title">
              <WinXpIcon name="recycle-bin" size={16} />
              <span>Empty Recycle Bin</span>
            </div>
            <div className="xpa-rb-dialog__body">
              <WinXpIcon name="recycle-bin" size={32} />
              <p className="xpa-rb-dialog__text">
                Apakah Anda yakin ingin menghapus semua {items.length} item ini?
              </p>
            </div>
            <div className="xpa-rb-dialog__actions">
              <button type="button" className="xpa-rb-btn" onClick={empty}>
                Ya
              </button>
              <button type="button" className="xpa-rb-btn" onClick={() => setConfirming(false)}>
                Tidak
              </button>
            </div>
          </div>
        </div>
      )}

      {propItem && (
        <div className="xpa-rb-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-rb-dialog" role="dialog" aria-modal="true" aria-label={`Properti ${propItem.label}`}>
            <div className="xpa-rb-dialog__title">
              <WinXpIcon name="recycle-bin" size={16} />
              <span>{propItem.label} Properties</span>
            </div>
            <div className="xpa-rb-dialog__body">
              <WinXpIcon name={itemIcon(propItem)} size={32} />
              <dl className="xpa-rb-prop">
                <dt>Name:</dt>
                <dd>{propItem.label}</dd>
                <dt>Type:</dt>
                <dd>{itemType(propItem.label)}</dd>
                <dt>Size:</dt>
                <dd>{itemSize(propItem.id)}</dd>
                <dt>Deleted:</dt>
                <dd>{itemDate(propItem.id)}</dd>
              </dl>
            </div>
            <div className="xpa-rb-dialog__actions">
              <button type="button" className="xpa-rb-btn" onClick={() => setPropsId(null)}>
                OK
              </button>
              <button type="button" className="xpa-rb-btn" onClick={() => setPropsId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .xpa-rb-app {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ece9d8;
          color: #000;
          font-family: Tahoma, Arial, sans-serif;
          font-size: 11px;
          user-select: none;
        }
        .xpa-rb-toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px;
          border-bottom: 1px solid #aca899;
          background: #ece9d8;
          flex: none;
        }
        .xpa-rb-btn {
          font-family: Tahoma, Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #ece9d8;
          border: 1px solid #003c74;
          border-radius: 3px;
          padding: 2px 8px;
          cursor: default;
        }
        .xpa-rb-btn:active:not(:disabled) {
          border-color: #e5978d #f1dbdb #f1dbdb #e5978d;
          background: #ffe4e1;
        }
        .xpa-rb-btn:disabled {
          color: #aca899;
          border-color: #d6d0c4;
        }
        .xpa-rb-list {
          flex: 1;
          overflow: auto;
          background: #fff;
          border: 1px solid #aca899;
          border-radius: 3px;
          margin: 4px;
          padding: 2px;
        }
        .xpa-rb-empty {
          margin: 24px;
          text-align: center;
          color: #404040;
          font-size: 12px;
        }
        .xpa-rb-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 4px;
          border: 1px solid transparent;
        }
        .xpa-rb-row:hover {
          background: #e8f0fe;
        }
        .xpa-rb-row__icon {
          display: flex;
          flex: none;
        }
        .xpa-rb-row__name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .xpa-rb-row__date {
          flex: none;
          color: #404040;
        }
        .xpa-rb-status {
          display: flex;
          gap: 12px;
          padding: 3px 6px;
          border-top: 1px solid #aca899;
          background: #ece9d8;
          flex: none;
        }
        .xpa-rb-status__cell--msg {
          color: #0a51a0;
        }
        .xpa-rb-menu {
          position: fixed;
          z-index: 100;
          min-width: 160px;
          background: #fff;
          border: 1px solid #aca899;
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.25);
          padding: 2px;
        }
        .xpa-rb-menu__item {
          display: block;
          width: 100%;
          text-align: left;
          font-family: Tahoma, Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #fff;
          border: none;
          padding: 3px 12px;
          cursor: default;
        }
        .xpa-rb-menu__item:hover {
          background: #0a51a0;
          color: #fff;
        }
        .xpa-rb-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.35);
          z-index: 200;
        }
        .xpa-rb-dialog {
          width: 380px;
          background: #ece9d8;
          border: 1px solid #003c74;
          border-radius: 4px;
          box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.4);
          font-family: Tahoma, Arial, sans-serif;
          font-size: 11px;
        }
        .xpa-rb-dialog__title {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          background: linear-gradient(90deg, #0054e3, #2f8fff);
          color: #fff;
          font-weight: bold;
          border-radius: 3px 3px 0 0;
        }
        .xpa-rb-dialog__body {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px;
        }
        .xpa-rb-dialog__text {
          margin: 0;
          line-height: 1.5;
        }
        .xpa-rb-prop {
          margin: 0;
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 4px 8px;
        }
        .xpa-rb-prop dt {
          font-weight: bold;
        }
        .xpa-rb-prop dd {
          margin: 0;
        }
        .xpa-rb-dialog__actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 8px 12px 12px;
        }
      `}</style>
    </div>
  );
}
