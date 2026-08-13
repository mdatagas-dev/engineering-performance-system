"use client";

import { useState, type ReactNode } from "react";
import Win95Icon from "../win95-icons";

const BIN_ITEMS = [
  { name: "LAPORAN_LAMA.txt", tip: "Laporan 1997. Sepertinya penting, tapi di-recycle karena 'basi'." },
  { name: "SETUP_1998.EXE", tip: "Setup yang tak pernah selesai diinstal. Mengenaskan." },
  { name: "SURAT_CINTA.txt", tip: "Surat cinta untuk mesin 07. Jangan dibaca. Benar-benar jangan." },
];

export function RecycleBinApp(): ReactNode {
  const [items, setItems] = useState(BIN_ITEMS);
  const [confirming, setConfirming] = useState(false);

  const empty = () => {
    setItems([]);
    setConfirming(false);
  };

  return (
    <div className="win95-app win95-bin">
      <div className="win95-menubar" role="menubar">
        {["File", "Edit", "View", "Help"].map((m) => (
          <button key={m} type="button" className="win95-menubar__item" onClick={(e) => e.stopPropagation()}>
            {m}
          </button>
        ))}
      </div>
      <div className="win95-pane win95-bin__body">
        {items.length > 0 ? (
          <div className="win95-listview">
            {items.map((it) => (
              <div key={it.name} className="win95-listview__item" title={it.tip}>
                <span className="win95-listview__icon">
                  <Win95Icon name="recycle-bin" size={16} />
                </span>
                <span className="win95-listview__name">{it.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="win95-bin__empty">Recycle Bin is empty</p>
        )}
      </div>
      <div className="win95-bin__actions">
        {confirming ? (
          <>
            <span className="win95-bin__ask">Kosongkan Recycle Bin?</span>
            <button type="button" className="win95-btn" onClick={empty}>
              Ya
            </button>
            <button type="button" className="win95-btn" onClick={() => setConfirming(false)}>
              Tidak
            </button>
          </>
        ) : (
          <button
            type="button"
            className="win95-btn"
            onClick={() => setConfirming(true)}
            disabled={items.length === 0}
          >
            Empty Recycle Bin
          </button>
        )}
      </div>
      <div className="win95-statusbar">
        <span className="win95-statusbar__cell">
          {items.length === 0 ? "0 object(s)" : `${items.length} object(s)`}
        </span>
      </div>
    </div>
  );
}
