"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "../winxp-icons";
import { NotepadApp } from "./notepad";
import "../../../app/winxp-apps.css";

type Kind = "drive" | "folder" | "file" | "computer";

type Item = { kind: Kind; name: string; icon: WinXpIconName; content?: string; sub?: string };

type FsItem = { kind: Kind; name: string; icon: WinXpIconName; content?: string; sub?: string };

const ROOT: FsItem[] = [
  { kind: "drive", name: "Local Disk (C:)", icon: "drive" },
  { kind: "folder", name: "Shared Documents", icon: "shared-documents" },
  { kind: "folder", name: "My Documents", icon: "my-documents" },
  { kind: "folder", name: "Control Panel", icon: "control-panel" },
  { kind: "folder", name: "Network Places", icon: "network-places" },
];

const FOLDERS: Record<string, FsItem[]> = {
  "Local Disk (C:)": [
    { kind: "folder", name: "Program Files", icon: "folder" },
    { kind: "folder", name: "Windows", icon: "folder" },
    { kind: "folder", name: "Arsip Produksi", icon: "folder" },
    { kind: "file", name: "README.TXT", icon: "file", content: "SELAMAT DATANG DI PROGRAM FILES GAS ELECTRONIC OS.\n\nSemua berkas di folder ini berfungsi. Hampir.\n\nPetunjuk: rahasia terbesar tidak ada di sini - coba My Documents, buka RAHASIA_DUNIA.TXT." },
    { kind: "file", name: "GE_DIAGNOSTIK.TXT", icon: "file", content: "DIAGNOSTIK INTERNAL v1.0\nCPU: Pentium IV 2.4 GHz (simulasi)\nRAM: 512 MB\nDisk: tak terbatas (khayalan)\nStatus: SEMUA OK\n\nCatatan sistem: mesin 07 di Arsip Produksi menyimpan log aneh. Malam hari ia menulis sendiri." },
  ],
  "Program Files": [
    { kind: "file", name: "EPS_CONSOLE.TXT", icon: "file", content: "EPS CONSOLE v1.0\nModul aktif: Production, Engineering, Quality, Support.\n\nKonsol membaca data dari server EPS-SRV-01. Jika data kosong, cek koneksi jaringan." },
    { kind: "file", name: "CATATAN_INSTALL.TXT", icon: "file", content: "CATATAN INSTALLASI\nSemua aplikasi intranet terpasang dengan benar.\nTidak ada file yang rusak.\nBenar-benar." },
  ],
  Windows: [
    { kind: "file", name: "BOOTLOG.TXT", icon: "file", content: "Loading GAS ELECTRONIC OS ...\nMenguji memori: 512 MB OK\nMemuat kernel dunia ...\nMenghubungkan terminal ...\nMemunculkan desktop ...\n\nSELAMAT DATANG DI THE WORLD." },
    { kind: "file", name: "SISTEM.TXT", icon: "file", content: "Ini bukan Windows. Ini THE WORLD.\n\nTerminal di desktop tahu banyak hal. Buka COMMAND PROMPT dan ketik: help" },
  ],
  "Arsip Produksi": [
    { kind: "file", name: "LAPORAN_Q3.TXT", icon: "file", content: "LAPORAN PRODUKSI Q3 2026\nUnit diproduksi: 12.847\nEfisiensi lini: 94%\nDowntime: 6%\n\nCatatan QA: lini 2 hemat energi 3% tanpa alasan jelas. Tim menyebutnya 'kerja keras para hantu'." },
    { kind: "file", name: "MESIN_07.TXT", icon: "file", content: "LOG MESIN 07\n03:00 idle\n03:00 lonjakan energi tanpa perintah\n03:01 normal kembali\nPesan log tersembunyi: 'kamu sedang membaca ini. sebaiknya ketik konami di terminal.'" },
  ],
  "Shared Documents": [
    { kind: "folder", name: "Shared Music", icon: "folder" },
    { kind: "folder", name: "Shared Pictures", icon: "folder" },
    { kind: "file", name: "PENGUMUMAN.TXT", icon: "file", content: "PENGUMUMAN PABRIK\n\nSeluruh karyawan diminta hadir tepat waktu di shift pagi.\nSeragam dan alat pelindung wajib dipakai di area produksi.\n\nTerima kasih,\nManajemen GAS ELECTRONIC" },
  ],
  "Shared Music": [
    { kind: "file", name: "LAGU_MESIN.TXT", icon: "file", content: "PLAYLIST GEDUNG MESIN\n1. Motor listrik - Hum 60 Hz\n2. Kompresor - Dentuman pelan\n3. Konveyor - Klik ritmis\n\nSiapa bilang pabrik tidak punya musik?" },
  ],
  "Shared Pictures": [
    { kind: "file", name: "FOTO_AREA1.TXT", icon: "file", content: "FOTO AREA 1 - PERAKITAN\nSebuah foto teks. Area 1 selalu rapi.\nTidak ada yang aneh di foto ini.\nKecuali bayangan tanpa sumber di pojok kiri." },
  ],
  "My Documents": [
    { kind: "folder", name: "Laporan", icon: "folder" },
    { kind: "folder", name: "Foto Pabrik", icon: "folder" },
    { kind: "file", name: "CATATAN.TXT", icon: "file", content: "CATATAN PRIBADI\n\nGagasan untuk meningkatkan efisiensi lini 2:\n- Audit sensor suhu tiap 2 jam\n- Kalibrasi mesin 07\n- Tanya ke tim hantu apakah mereka butuh kopi" },
    { kind: "file", name: "RAHASIA_DUNIA.TXT", icon: "file", content: "RAHASIA DUNIA\n\nSemua yang Anda ketahui tentang sistem ini salah.\nCoba ketik 'help' di Command Prompt untuk petunjuk selanjutnya." },
  ],
  "Laporan": [
    { kind: "file", name: "HASIL_QA.TXT", icon: "file", content: "HASIL QA BULAN INI\nDefect rate: 0,9%\nSkor DQ: 94\nInspeksi: 100% lulus.\n\nMesin 07 lolos lagi. Aneh, tapi kami tidak bertanya." },
  ],
  "Foto Pabrik": [
    { kind: "file", name: "GEDUNG_UTAMA.TXT", icon: "file", content: "GEDUNG UTAMA - TEKS FOTO\nBangunan kokoh berdiri sejak 1998.\nTiang antena di atap kadang menyala di malam hari tanpa alasan." },
  ],
  "Control Panel": [
    { kind: "file", name: "TAMBAH_PROGRAM.TXT", icon: "control-panel", content: "ADD OR REMOVE PROGRAMS\n\nBuka aplikasi Control Panel untuk menambah atau menghapus program.\nJangan hapus EPS Console. Ini penting. Serius." },
    { kind: "file", name: "TANGGAL_JAM.TXT", icon: "control-panel", content: "DATE AND TIME\n\nJam sistem: ikut zona WIB.\nMesin 07 memiliki jam sendiri. Jam itu berjalan mundur. Jangan tanya kenapa." },
    { kind: "file", name: "TAMPILAN.TXT", icon: "control-panel", content: "DISPLAY PROPERTIES\n\nResolusi default 1024 x 768.\nLayar 07 kadang menampilkan wajah. Bisa diubah lewat Control Panel, tapi wajahnya tetap." },
    { kind: "file", name: "SISTEM.TXT", icon: "control-panel", content: "SYSTEM PROPERTIES\n\nMicrosoft Windows XP Professional\nGAS ELECTRONIC Edition\nService Pack 2\n\nTidak ada kerusakan sistem. Ulangi: tidak ada." },
    { kind: "file", name: "JARINGAN.TXT", icon: "control-panel", content: "NETWORK CONNECTIONS\n\nKoneksi LAN: Aktif.\nKoneksi ke EPS-SRV-01: Aktif.\nSinyal dari lantai 3: Tidak dikenal. Tapi tetap aktif." },
    { kind: "file", name: "AKUN.TXT", icon: "control-panel", content: "USER ACCOUNTS\n\nAdministrator\nOperator Lini 1\nTim QA\n\nPengguna keempat tidak terdaftar, tetapi pernah login. Jam 03:00." },
  ],
  "Network Places": [
    { kind: "folder", name: "EPS-WORKGROUP", icon: "network-places" },
  ],
  "EPS-WORKGROUP": [
    { kind: "computer", name: "EPS-SRV-01", icon: "my-computer", sub: "Server produksi" },
    { kind: "computer", name: "EPS-SRV-02", icon: "my-computer", sub: "Server QA" },
    { kind: "computer", name: "SERVER-AREA-1", icon: "my-computer", sub: "Server pengelasan" },
  ],
};

const NAV: { name: string; icon: WinXpIconName; children?: { name: string; icon: WinXpIconName }[] }[] = [
  { name: "Local Disk (C:)", icon: "drive" },
  { name: "Shared Documents", icon: "shared-documents", children: [{ name: "Shared Music", icon: "folder" }, { name: "Shared Pictures", icon: "folder" }] },
  { name: "My Documents", icon: "my-documents", children: [{ name: "Laporan", icon: "folder" }, { name: "Foto Pabrik", icon: "folder" }] },
  { name: "Control Panel", icon: "control-panel" },
  { name: "Network Places", icon: "network-places", children: [{ name: "EPS-WORKGROUP", icon: "network-places" }] },
];

function pathLabel(path: string[]): string {
  return path.length === 0 ? "My Computer" : `My Computer\\${path.join("\\")}`;
}

export function MyComputerApp(): ReactNode {
  const [path, setPath] = useState<string[]>([]);
  const [past, setPast] = useState<string[][]>([]);
  const [future, setFuture] = useState<string[][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [openFile, setOpenFile] = useState<Item | null>(null);
  const [conn, setConn] = useState<string | null>(null);
  const [addr, setAddr] = useState(pathLabel([]));

  const current = path[path.length - 1] ?? null;
  const items: FsItem[] = current ? (FOLDERS[current] ?? []) : ROOT;

  const navTo = (next: string[]) => {
    setPath(next);
    setPast((p) => [...p, path]);
    setFuture([]);
    setSelected(null);
    setOpenFile(null);
    setAddr(pathLabel(next));
  };

  const back = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, path]);
    setPath(prev);
    setSelected(null);
    setOpenFile(null);
    setAddr(pathLabel(prev));
  };

  const forward = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, path]);
    setPath(next);
    setSelected(null);
    setOpenFile(null);
    setAddr(pathLabel(next));
  };

  const up = () => {
    navTo(path.slice(0, -1));
  };

  const openItem = (it: FsItem) => {
    if (it.kind === "file") setOpenFile({ ...it, content: it.content ?? "" });
    else if (it.kind === "computer") setConn(it.name);
    else navTo([...path, it.name]);
  };

  const submitAddr = (e: FormEvent) => {
    e.preventDefault();
    const v = addr.trim();
    if (!v) return;
    if (v.toLowerCase().startsWith("c:")) {
      navTo(["Local Disk (C:)"]);
      return;
    }
    const hit = items.find((i) => i.name === v && i.kind === "folder");
    if (hit) navTo([...path, v]);
  };

  const crumbs = path.map((seg, i) => ({ seg, target: path.slice(0, i + 1) }));

  return (
    <div className="xpa-app" onMouseDown={() => setSelected(null)}>
      <div className="xpa-toolbar" role="toolbar">
        <button type="button" className="xpa-toolbtn" onClick={back} disabled={past.length === 0} title="Back">
          <WinXpIcon name="run" size={16} />
          <span className="xpa-toolbtn__label">Back</span>
        </button>
        <button type="button" className="xpa-toolbtn" onClick={forward} disabled={future.length === 0} title="Forward">
          <WinXpIcon name="run" size={16} />
          <span className="xpa-toolbtn__label">Forward</span>
        </button>
        <button type="button" className="xpa-toolbtn" onClick={up} disabled={path.length === 0} title="Up">
          <WinXpIcon name="folder-open" size={16} />
          <span className="xpa-toolbtn__label">Up</span>
        </button>
      </div>
      <form className="xpa-addr" onSubmit={submitAddr}>
        <span className="xpa-addr__label">Address</span>
        <input
          className="xpa-addr__input"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          spellCheck={false}
          aria-label="Alamat folder"
        />
        <button type="submit" className="xpa-btn xpa-addr__go">
          Go
        </button>
      </form>
      <div className="xpa-crumb" aria-label="Jalur folder">
        <button type="button" className="xpa-crumb__btn" onClick={() => navTo([])}>
          My Computer
        </button>
        {crumbs.map((c, i) => (
          <span key={c.seg} style={{ display: "contents" }}>
            <span className="xpa-crumb__sep" aria-hidden>
              {" "}
              &gt;{" "}
            </span>
            {i === crumbs.length - 1 ? (
              <span className="xpa-crumb__current">{c.seg}</span>
            ) : (
              <button type="button" className="xpa-crumb__btn" onClick={() => navTo(c.target)}>
                {c.seg}
              </button>
            )}
          </span>
        ))}
      </div>
      <div className="xpa-mc__body">
        <nav className="xpa-mc__nav" aria-label="Panel navigasi">
          <div className="xpa-mc__tree-label">Folders</div>
          {NAV.map((n) => (
            <div key={n.name}>
              <button
                type="button"
                className={`xpa-mc__tree-item ${path[0] === n.name || current === n.name ? "xpa-mc__tree-item--active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navTo([n.name]);
                }}
              >
                <WinXpIcon name={n.icon} size={16} />
                <span>{n.name}</span>
              </button>
              {n.children?.map((ch) => (
                <button
                  key={ch.name}
                  type="button"
                  className={`xpa-mc__tree-item ${current === ch.name ? "xpa-mc__tree-item--active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navTo([n.name, ch.name]);
                  }}
                >
                  <span className="xpa-mc__tree-indent" />
                  <WinXpIcon name={ch.icon} size={16} />
                  <span>{ch.name}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="xpa-mc__pane">
          {openFile ? (
            <div className="xpa-mc__notepad">
              <NotepadApp file={{ name: openFile.name, content: openFile.content ?? "" }} />
            </div>
          ) : (
            <div className="xpa-pane">
              <div className="xpa-grid">
                {items.map((it) => (
                  <button
                    key={it.name}
                    type="button"
                    className={`xpa-item ${selected === it.name ? "xpa-item--selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(it.name);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openItem(it);
                    }}
                  >
                    <span className="xpa-item__glyph xpa-mc__glyph">
                      <WinXpIcon name={it.icon} size={32} />
                    </span>
                    <span className="xpa-item__label">
                      {it.kind === "computer" && it.sub ? `${it.name} (${it.sub})` : it.name}
                    </span>
                  </button>
                ))}
              </div>
              {current && items.length === 0 && (
                <p style={{ padding: 12, color: "#404040" }}>Folder ini kosong - 0 object(s).</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="xpa-status">
        <span className="xpa-status__cell">{items.length} object(s)</span>
        <span className="xpa-status__cell xpa-status__cell--right">
          Free Space: 1.99 GB
        </span>
      </div>
      {conn && (
        <div
          className="xpa-dialog"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setConn(null);
          }}
        >
          <div className="xpa-dialog__box" role="dialog" aria-modal="true" aria-label={`Terhubung ke ${conn}`}>
            <div className="xpa-dialog__title">
              <WinXpIcon name="network-places" size={16} />
              Koneksi ke {conn}
            </div>
            <div className="xpa-dialog__body">
              <div className="xpa-conn">
                <span className="xpa-conn__icon xpa-mc__conn-icon">
                  <WinXpIcon name="my-computer" size={40} />
                </span>
                <div>
                  <div>
                    Status: <span className="xpa-conn__status">OK</span>
                  </div>
                  <div className="xpa-conn__meta">Terhubung ke {conn} (simulasi jaringan).</div>
                </div>
              </div>
              <div className="xpa-dialog__actions">
                <button type="button" className="xpa-btn" onClick={() => setConn(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .xpa-mc__glyph,
        :global(.xpa-item__glyph) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          line-height: 0;
          filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.25));
        }
        .xpa-mc__conn-icon,
        :global(.xpa-conn__icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          line-height: 0;
          flex: none;
          filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.25));
        }
      `}</style>
    </div>
  );
}
