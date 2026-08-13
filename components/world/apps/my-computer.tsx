"use client";

import { useState, type ReactNode } from "react";
import Win95Icon from "../win95-icons";

type Props = { onOpenNotepad: (name: string, content: string) => void };

type Item = { kind: "drive" | "folder" | "file"; name: string; sub?: string; content?: string };

const ROOT: Item[] = [
  { kind: "drive", name: "C:", sub: "System" },
  { kind: "drive", name: "D:", sub: "Data" },
  { kind: "folder", name: "Program Files" },
  { kind: "folder", name: "Windows" },
  { kind: "folder", name: "Arsip Produksi" },
];

const FOLDER_FILES: Record<string, Item[]> = {
  "Program Files": [
    { kind: "file", name: "README.TXT", content: "SELAMAT DATANG DI PROGRAM FILES GAS ELECTRONIC OS.\n\nSemua berkas di folder ini berfungsi. Hampir.\n\nPetunjuk: rahasia terbesar tidak ada di sini — coba My Documents, buka RAHASIA_DUNIA.TXT." },
    { kind: "file", name: "GE_DIAGNOSTIK.TXT", content: "DIAGNOSTIK INTERNAL v95.0\nCPU: Pentium 95 MHz (simulasi)\nRAM: 64 MB\nDisk: tak terbatas (khayalan)\nStatus: SEMUA OK\n\nCatatan sistem: mesin 07 di Arsip Produksi menyimpan log aneh. Malam hari ia menulis sendiri." },
  ],
  Windows: [
    { kind: "file", name: "BOOTLOG.TXT", content: "Loading GAS ELECTRONIC OS ...\nMenguji memori: 64 MB OK\nMemuat kernel dunia ...\nMenghubungkan terminal ...\nMemunculkan desktop ...\n\nSELAMAT DATANG DI THE WORLD." },
    { kind: "file", name: "SISTEM.TXT", content: "Ini bukan Windows. Ini THE WORLD.\n\nTerminal di desktop tahu banyak hal. Buka COMMAND PROMPT dan ketik: help" },
  ],
  "Arsip Produksi": [
    { kind: "file", name: "LAPORAN_Q3.TXT", content: "LAPORAN PRODUKSI Q3 2026\nUnit diproduksi: 12.847\nEfisiensi lini: 94%\nDowntime: 6%\n\nCatatan QA: lini 2 hemat energi 3% tanpa alasan jelas. Tim menyebutnya 'kerja keras para hantu'." },
    { kind: "file", name: "MESIN_07.TXT", content: "LOG MESIN 07\n03:00 idle\n03:00 lonjakan energi tanpa perintah\n03:01 normal kembali\nPesan log tersembunyi: 'kamu sedang membaca ini. sebaiknya ketik konami di terminal.'" },
  ],
};

export function MyComputerApp({ onOpenNotepad }: Props): ReactNode {
  const [path, setPath] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const current = path[path.length - 1] ?? null;
  const items = current ? (FOLDER_FILES[current] ?? []) : ROOT;

  const open = (it: Item) => {
    if (it.kind === "file") {
      onOpenNotepad(it.name, it.content ?? "");
    } else {
      setPath((p) => [...p, it.name]);
      setSelected(null);
    }
  };

  const back = () => {
    setPath((p) => p.slice(0, -1));
    setSelected(null);
  };

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
        <button type="button" className="win95-toolbar__btn" onClick={back} disabled={path.length === 0}>
          ← Back
        </button>
        <button type="button" className="win95-toolbar__btn" onClick={(e) => e.stopPropagation()}>
          Up
        </button>
        <button type="button" className="win95-toolbar__btn" onClick={(e) => e.stopPropagation()}>
          Folder
        </button>
      </div>
      <div className="win95-addressbar">
        <span className="win95-addressbar__label">Address</span>
        <span className="win95-addressbar__value">{current ? `My Computer\\${current}` : "My Computer"}</span>
      </div>
      <div className="win95-pane win95-explorer__body">
        <div className="win95-icon-grid">
          {items.map((it) => (
            <div
              key={it.name}
              className={`win95-icon ${selected === it.name ? "win95-icon--selected" : ""}`}
              onClick={(e) => { e.stopPropagation(); setSelected(it.name); }}
              onDoubleClick={(e) => { e.stopPropagation(); open(it); }}
            >
              <span className="win95-icon__glyph">
                <Win95Icon
                  name={it.kind === "drive" ? "drive" : it.kind === "folder" ? "folder" : "file"}
                  size={20}
                />
              </span>
              <span className="win95-icon__label">
                {it.kind === "drive" ? `${it.name} (${it.sub})` : it.name}
              </span>
            </div>
          ))}
        </div>
        {current && items.length === 0 && (
          <p className="win95-explorer__empty">Folder ini kosong — 0 object(s).</p>
        )}
      </div>
      <div className="win95-statusbar">
        <span className="win95-statusbar__cell">{items.length} object(s)</span>
        <span className="win95-statusbar__cell win95-statusbar__cell--right">My Computer</span>
      </div>
    </div>
  );
}
