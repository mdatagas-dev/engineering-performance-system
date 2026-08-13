"use client";

import { useState, type ReactNode } from "react";

type Props = { onOpenNotepad: (name: string, content: string) => void };

type DocFile = { name: string; content: string };

const DOC_FILES: DocFile[] = [
  {
    name: "README.txt",
    content: "SELAMAT DATANG DI MY DOCUMENTS — ARSIP PRIBADI DUNIA.\n\nBerkas di sini bukan sembarang berkas. Setiap file menyimpan potongan cerita GAS ELECTRONIC OS.\n\nYang sabar membaca semuanya akan memahami dunia ini. Yang penasaran akan menemukan lebih banyak.\n\nBaca sampai tuntas. RAHASIA_DUNIA.txt menantimu.",
  },
  {
    name: "RENCANA_Q3.txt",
    content: "RENCANA PRODUKSI Q3 2026\n========================\nTarget: 12.000 unit\nShift: 3 (pagi, sore, malam)\nPrioritas: lini 1-3, mesin 07 (pemeliharaan)\n\nCatatan: malam hari lini menyala lebih terang. Tidak ada yang mengaku menyalakannya.\n\nPesan tambahan: jika kamu baca ini, dunia sudah memperhatikanmu.",
  },
  {
    name: "RAHASIA_DUNIA.txt",
    content: "RAHASIA DUNIA — BACA DENGAN SEKSAMA\n====================================\n\nDunia ini menyimpan tiga kunci. Temukan semuanya, dan kamu resmi jadi PENGAMAT sejati.\n\nKUNCI 1 — KODE KUNO\nDi keyboard, tekan berurutan: ↑ ↑ ↓ ↓ ← → ← → B A\n(Konami code. Beberapa jendela akan memperhatikan.)\n\nKUNCI 2 — LOGO YANG LAPAR PERHATIAN\nLogo GAS ELECTRONIC di pojok bawah desktop suka diklik. Klik tiga kali berturut-turut.\n\nKUNCI 3 — TERMINAL PELIT BICARA\nCOMMAND PROMPT menyembunyikan perintah. Ketik: secret  ... lalu coba: konami\n\nYang menemukan ketiganya berhak masuk lewat ACCESS TERMINAL kapan pun.",
  },
  {
    name: "LEGACY_NOTES.txt",
    content: "CATATAN WARISAN — GAS ELECTRONIC, 1998\n========================================\n\n'Kami membangun mesin, tapi mesin mulai membangun cerita.'\n'Setiap unit yang lahir membawa satu detak. Dunia ini mencatat semuanya.'\n\n'Jika kamu membaca ini jauh di masa depan: teruskan. Dunia akan menjaga penjaganya.'\n\n— GAS, pendiri",
  },
  {
    name: "PROTOKOL_AKSES.txt",
    content: "PROTOKOL AKSES — LEVEL 0 SAMPAI 3\n==================================\n\nLEVEL 0: TAMU\n  Terminal terbatas. Dunia terlihat dangkal.\n\nLEVEL 1: PENJELAJAH\n  Membuka My Computer, menjelajah folder.\n\nLEVEL 2: PEMBACA\n  Menemukan dan membaca berkas rahasia.\n\nLEVEL 3: PENGAMAT\n  Mengetahui konami code, rahasia logo, dan perintah tersembunyi terminal.\n\nCara naik level: buktikan kamu tahu kode kuno. Ketik konami di terminal.",
  },
];

export function DocumentsApp({ onOpenNotepad }: Props): ReactNode {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="win95-app win95-explorer" onMouseDown={() => setSelected(null)}>
      <div className="win95-menubar" role="menubar">
        {["File", "Edit", "View", "Help"].map((m) => (
          <button key={m} type="button" className="win95-menubar__item" onClick={(e) => e.stopPropagation()}>
            {m}
          </button>
        ))}
      </div>
      <div className="win95-toolbar" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="win95-toolbar__btn" onClick={(e) => e.stopPropagation()}>
          Open
        </button>
        <button type="button" className="win95-toolbar__btn" onClick={(e) => e.stopPropagation()}>
          Print
        </button>
        <button type="button" className="win95-toolbar__btn" onClick={(e) => e.stopPropagation()}>
          Delete
        </button>
      </div>
      <div className="win95-addressbar">
        <span className="win95-addressbar__label">Address</span>
        <span className="win95-addressbar__value">My Documents</span>
      </div>
      <div className="win95-pane win95-explorer__body">
        <div className="win95-listview">
          {DOC_FILES.map((f) => (
            <div
              key={f.name}
              className={`win95-listview__item ${selected === f.name ? "win95-listview__item--selected" : ""}`}
              onClick={(e) => { e.stopPropagation(); setSelected(f.name); }}
              onDoubleClick={(e) => { e.stopPropagation(); onOpenNotepad(f.name, f.content); }}
            >
              <span className="win95-listview__icon">📄</span>
              <span className="win95-listview__name">{f.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="win95-statusbar">
        <span className="win95-statusbar__cell">{DOC_FILES.length} object(s)</span>
        <span className="win95-statusbar__cell win95-statusbar__cell--right">My Documents</span>
      </div>
    </div>
  );
}
