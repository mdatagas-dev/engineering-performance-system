"use client";

import { useState, type ReactNode } from "react";
import Win95Icon from "../win95-icons";

type Props = { onOpenNotepad: (name: string, content: string) => void };

type DocFile = { name: string; content: string };

const DOC_FILES: DocFile[] = [
  {
    name: "README.txt",
    content: "SELAMAT DATANG DI MY DOCUMENTS - ARSIP PRIBADI DUNIA.\n\nBerkas di sini bukan sembarang berkas. Setiap file menyimpan potongan cerita GAS ELECTRONIC OS.\n\nYang sabar membaca semuanya akan memahami dunia ini. Yang penasaran akan menemukan lebih banyak.\n\nBaca sampai tuntas. RAHASIA_DUNIA.txt menantimu.",
  },
  {
    name: "RENCANA_Q3.txt",
    content: "RENCANA PRODUKSI Q3 2026\n========================\nTarget: 12.000 unit\nShift: 3 (pagi, sore, malam)\nPrioritas: lini 1-3, mesin 07 (pemeliharaan)\n\nCatatan: malam hari lini menyala lebih terang. Tidak ada yang mengaku menyalakannya.\n\nPesan tambahan: jika kamu baca ini, dunia sudah memperhatikanmu.",
  },
  {
    name: "RAHASIA_DUNIA.txt",
    content: "RAHASIA DUNIA - BACA DENGAN SEKSAMA\n====================================\n\nDunia ini menyimpan tiga kunci. Temukan semuanya, dan kamu resmi jadi PENGAMAT sejati.\n\nKUNCI 1 - KODE KUNO\nDi keyboard, tekan berurutan: Atas Atas Bawah Bawah Kiri Kanan Kiri Kanan B A\n(Konami code. Beberapa jendela akan memperhatikan.)\n\nKUNCI 2 - LOGO YANG LAPAR PERHATIAN\nLogo GAS ELECTRONIC di pojok bawah desktop suka diklik. Klik tiga kali berturut-turut.\n\nKUNCI 3 - TERMINAL PELIT BICARA\nCOMMAND PROMPT menyembunyikan perintah. Ketik: secret  ... lalu coba: konami\n\nYang menemukan ketiganya berhak masuk lewat ACCESS TERMINAL kapan pun.",
  },
  {
    name: "LEGACY_NOTES.txt",
    content: "CATATAN WARISAN - GAS ELECTRONIC, 1998\n========================================\n\n'Kami membangun mesin, tapi mesin mulai membangun cerita.'\n'Setiap unit yang lahir membawa satu detak. Dunia ini mencatat semuanya.'\n\n'Jika kamu membaca ini jauh di masa depan: teruskan. Dunia akan menjaga penjaganya.'\n\n- GAS, pendiri",
  },
  {
    name: "PROTOKOL_AKSES.txt",
    content: "PROTOKOL AKSES - LEVEL 0 SAMPAI 3\n==================================\n\nLEVEL 0: TAMU\n  Terminal terbatas. Dunia terlihat dangkal.\n\nLEVEL 1: PENJELAJAH\n  Membuka My Computer, menjelajah folder.\n\nLEVEL 2: PEMBACA\n  Menemukan dan membaca berkas rahasia.\n\nLEVEL 3: PENGAMAT\n  Mengetahui konami code, rahasia logo, dan perintah tersembunyi terminal.\n\nCara naik level: buktikan kamu tahu kode kuno. Ketik konami di terminal.",
  },
];

export function DocumentsApp({ onOpenNotepad }: Props): ReactNode {
  const [files, setFiles] = useState<DocFile[]>(DOC_FILES);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewer, setViewer] = useState<DocFile | null>(null);

  const openSelected = () => {
    const f = files.find((x) => x.name === selected);
    if (f) setViewer(f);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setFiles((prev) => prev.filter((x) => x.name !== selected));
    setViewer((v) => (v && v.name === selected ? null : v));
    setSelected(null);
  };

  return (
    <div className="xpa-doc-app" onMouseDown={() => setSelected(null)}>
      <div className="xpa-doc-menubar" role="menubar" onMouseDown={(e) => e.stopPropagation()}>
        {["File", "Edit", "View", "Help"].map((m) => (
          <button key={m} type="button" className="xpa-doc-menubar__item" onClick={(e) => e.stopPropagation()}>
            {m}
          </button>
        ))}
      </div>
      <div className="xpa-doc-toolbar" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="xpa-doc-toolbar__btn" onClick={openSelected} disabled={!selected}>
          Open
        </button>
        <button type="button" className="xpa-doc-toolbar__btn" onClick={() => window.print()}>
          Print
        </button>
        <button type="button" className="xpa-doc-toolbar__btn" onClick={deleteSelected} disabled={!selected}>
          Delete
        </button>
      </div>
      <div className="xpa-doc-addressbar">
        <span className="xpa-doc-addressbar__label">Address</span>
        <span className="xpa-doc-addressbar__value">My Documents</span>
      </div>
      <div className="xpa-doc-pane">
        {files.map((f) => (
          <div
            key={f.name}
            className={`xpa-doc-list__item ${selected === f.name ? "xpa-doc-list__item--selected" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(f.name);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenNotepad(f.name, f.content);
            }}
          >
            <span className="xpa-doc-list__icon">
              <Win95Icon name="notepad" size={20} />
            </span>
            <span className="xpa-doc-list__name">{f.name}</span>
          </div>
        ))}
        {files.length === 0 && <p className="xpa-doc-list__empty">Folder kosong - 0 object(s).</p>}
      </div>
      <div className="xpa-doc-statusbar">
        <span className="xpa-doc-statusbar__cell">{files.length} object(s)</span>
        <span className="xpa-doc-statusbar__cell xpa-doc-statusbar__cell--right">My Documents</span>
      </div>
      {viewer && (
        <div className="xpa-doc-viewer" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-doc-viewer__box" role="dialog" aria-modal="true" aria-label={`Isi ${viewer.name}`}>
            <div className="xpa-doc-viewer__title">
              <Win95Icon name="notepad" size={16} />
              <span>{viewer.name} - Notepad</span>
            </div>
            <pre className="xpa-doc-viewer__body">{viewer.content}</pre>
            <div className="xpa-doc-viewer__actions">
              <button type="button" className="xpa-doc-btn" onClick={() => setViewer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .xpa-doc-app {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ece9d8;
          font-family: Tahoma, Verdana, sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
        }
        .xpa-doc-menubar {
          display: flex;
          gap: 1px;
          padding: 2px 3px 0;
          background: #ece9d8;
          border-bottom: 1px solid #c7c3b6;
          flex: none;
        }
        .xpa-doc-menubar__item {
          font: inherit;
          background: transparent;
          border: 1px solid transparent;
          padding: 2px 8px;
          cursor: default;
        }
        .xpa-doc-menubar__item:hover {
          border-color: #9cc5f5;
          background: #c6e0f8;
        }
        .xpa-doc-toolbar {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px 4px;
          background: #ece9d8;
          border-bottom: 1px solid #c7c3b6;
          flex: none;
        }
        .xpa-doc-toolbar__btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: linear-gradient(180deg, #f2f0e7 0%, #ece9d8 48%, #d9d3c4 100%);
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
          padding: 3px 12px;
          cursor: default;
        }
        .xpa-doc-toolbar__btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #fdf6ee 0%, #f9e0a2 42%, #f0c664 92%, #ecb64b 100%);
        }
        .xpa-doc-toolbar__btn:active:not(:disabled) {
          box-shadow: inset 1px 1px #b7b4a8;
          padding: 4px 11px 2px 13px;
        }
        .xpa-doc-toolbar__btn:disabled {
          border-color: #a5a29a;
          background: #ece9d8;
          box-shadow: inset 1px 1px #fff;
          color: #a5a29a;
        }
        .xpa-doc-addressbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 5px;
          background: #ece9d8;
          border-bottom: 1px solid #c7c3b6;
          flex: none;
        }
        .xpa-doc-addressbar__label {
          white-space: nowrap;
          flex: none;
        }
        .xpa-doc-addressbar__value {
          flex: 1;
          min-width: 0;
          background: #fff;
          border: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
          padding: 2px 5px;
        }
        .xpa-doc-pane {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
          padding: 4px;
        }
        .xpa-doc-list__item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px;
          cursor: default;
        }
        .xpa-doc-list__item:hover {
          background: #e9f1fb;
        }
        .xpa-doc-list__item--selected,
        .xpa-doc-list__item--selected:hover {
          background: #c6e0f8;
        }
        .xpa-doc-list__icon {
          display: flex;
          align-items: center;
          line-height: 0;
        }
        .xpa-doc-list__empty {
          padding: 12px;
          color: #404040;
          margin: 0;
        }
        .xpa-doc-statusbar {
          display: flex;
          align-items: stretch;
          gap: 2px;
          padding: 2px 4px;
          background: #ece9d8;
          border-top: 1px solid #c7c3b6;
          flex: none;
        }
        .xpa-doc-statusbar__cell {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid;
          border-color: #b7b4a8 #fff #fff #b7b4a8;
          padding: 1px 8px;
        }
        .xpa-doc-statusbar__cell--right {
          flex: none;
          max-width: 45%;
        }
        .xpa-doc-viewer {
          position: absolute;
          inset: 0;
          z-index: 50;
          background: rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .xpa-doc-viewer__box {
          width: 420px;
          max-width: 92%;
          max-height: 90%;
          background: #ece9d8;
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
          display: flex;
          flex-direction: column;
        }
        .xpa-doc-viewer__title {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 5px;
          background: linear-gradient(180deg, #3f8ee8 0%, #245edb 45%, #0a246a 100%);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
        }
        .xpa-doc-viewer__body {
          flex: 1;
          min-height: 0;
          overflow: auto;
          margin: 0;
          padding: 8px 10px;
          background: #fff;
          border: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
          font-family: "Lucida Console", monospace;
          font-size: 11px;
          white-space: pre-wrap;
          word-break: break-word;
          user-select: text;
          -webkit-user-select: text;
        }
        .xpa-doc-viewer__actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          padding: 8px;
          flex: none;
        }
        .xpa-doc-btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: linear-gradient(180deg, #f2f0e7 0%, #ece9d8 48%, #d9d3c4 100%);
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
          padding: 3px 12px;
          cursor: default;
        }
        .xpa-doc-btn:hover {
          background: linear-gradient(180deg, #fdf6ee 0%, #f9e0a2 42%, #f0c664 92%, #ecb64b 100%);
        }
        .xpa-doc-btn:active {
          box-shadow: inset 1px 1px #b7b4a8;
          padding: 4px 11px 2px 13px;
        }
      `}</style>
    </div>
  );
}
