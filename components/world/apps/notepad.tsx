"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { file?: { name: string; content: string }; onClose?: () => void };
type MenuId = "file" | "edit" | "format" | "view" | "help";
type Dlg = "about" | "find" | "open" | null;
type DocFile = { name: string; content: string };

const KEY_CUR = "eps_notepad_file";
const KEY_DOC = "eps_notepad_file_";
const SIZES = [8, 10, 12, 14, 18, 24];
const MOCK_FILES: DocFile[] = [
  { name: "Catatan.txt", content: "Ini file contoh.\nBuka file lain dari menu File > Open.\n" },
  { name: "Readme.txt", content: "Engineering Proses v2\nGaya Windows XP.\n" },
  { name: "Todo.txt", content: "[ ] QA notepad\n[ ] Test save\n[ ] Test find\n" },
];

export function NotepadApp({ file, onClose }: Props): ReactNode {
  const [text, setText] = useState(file?.content ?? "");
  const [name, setName] = useState(file?.name ?? "Untitled");
  const [pos, setPos] = useState({ line: 1, col: 1 });
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [wrap, setWrap] = useState(true);
  const [fontSize, setFontSize] = useState(12);
  const [showStatus, setShowStatus] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [hasSel, setHasSel] = useState(false);
  const [findQ, setFindQ] = useState("");
  const [findMsg, setFindMsg] = useState<string | null>(null);
  const [openList, setOpenList] = useState<DocFile[]>([]);
  const [selName, setSelName] = useState<string | null>(null);
  const [savedText, setSavedText] = useState(file?.content ?? "");
  const [past, setPast] = useState<string[]>([]);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef(file?.content ?? "");
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (msgTimer.current) clearTimeout(msgTimer.current);
    },
    []
  );

  const dirty = text !== savedText;

  const toast = (m: string) => {
    setMsg(m);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 2400);
  };

  const refresh = () => {
    const el = taRef.current;
    if (!el) return;
    const sel = el.selectionStart;
    const before = textRef.current.slice(0, sel);
    setPos({ line: before.split("\n").length, col: sel - before.lastIndexOf("\n") });
    setHasSel(el.selectionStart !== el.selectionEnd);
  };

  const pushText = (nv: string) => {
    setPast((p) => [...p.slice(-99), textRef.current]);
    textRef.current = nv;
    setText(nv);
  };

  const onChange = (v: string) => {
    if (v !== textRef.current) pushText(v);
    refresh();
  };

  const undo = () => {
    const prev = past[past.length - 1];
    if (prev === undefined) return;
    setPast((p) => p.slice(0, -1));
    textRef.current = prev;
    setText(prev);
    const el = taRef.current;
    requestAnimationFrame(() => {
      el?.focus();
      const end = textRef.current.length;
      el?.setSelectionRange(end, end);
      refresh();
    });
  };

  const exec = (c: string) => {
    const el = taRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(c);
    if (el.value !== textRef.current) pushText(el.value);
    refresh();
  };

  const insertAtCursor = (ins: string) => {
    const el = taRef.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const nv = textRef.current.slice(0, s) + ins + textRef.current.slice(e);
    if (nv === textRef.current) return;
    pushText(nv);
    const caret = s + ins.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
      refresh();
    });
  };

  const insertTimeDate = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    insertAtCursor(`${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`);
  };

  const persist = (nm: string) => {
    try {
      localStorage.setItem(KEY_CUR, JSON.stringify({ name: nm, content: textRef.current }));
      if (nm !== "Untitled") localStorage.setItem(KEY_DOC + nm, textRef.current);
      setSavedText(textRef.current);
      toast("Tersimpan: " + nm);
    } catch {
      toast("Gagal menyimpan ke penyimpanan lokal");
    }
  };

  const onSave = () => {
    if (name === "Untitled") onSaveAs();
    else persist(name);
  };

  const onSaveAs = () => {
    const n = window.prompt("Simpan sebagai:", name === "Untitled" ? "Untitled.txt" : name);
    if (n && n.trim()) {
      setName(n.trim());
      persist(n.trim());
    }
  };

  const onNew = () => {
    if (dirty && !window.confirm("Perubahan belum disimpan. Lanjutkan?")) return;
    setPast([]);
    textRef.current = "";
    setSavedText("");
    setText("");
    setName("Untitled");
    toast("Dokumen baru");
  };

  const onCloseDoc = () => {
    if (dirty && !window.confirm("Perubahan belum disimpan. Lanjutkan?")) return;
    onClose?.();
  };

  const openPicker = () => {
    if (dirty && !window.confirm("Perubahan belum disimpan. Lanjutkan?")) return;
    const out: DocFile[] = [];
    if (file) out.push({ name: file.name, content: file.content });
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(KEY_DOC)) {
          const c = localStorage.getItem(k);
          if (c != null && !out.some((o) => o.name === k.slice(KEY_DOC.length))) {
            out.push({ name: k.slice(KEY_DOC.length), content: c });
          }
        }
      }
    } catch {
      /* abaikan penyimpanan korup */
    }
    for (const m of MOCK_FILES) if (!out.some((o) => o.name === m.name)) out.push(m);
    setOpenList(out);
    setSelName(out[0]?.name ?? null);
    setDlg("open");
  };

  const doOpenFile = (f: DocFile) => {
    setPast([]);
    textRef.current = f.content;
    setSavedText(f.content);
    setText(f.content);
    setName(f.name);
    setDlg(null);
    toast("Membuka " + f.name);
  };

  const doFind = () => {
    const el = taRef.current;
    if (!el || !findQ) return;
    const hay = textRef.current;
    const from = el.selectionEnd;
    let at = hay.indexOf(findQ, from);
    if (at === -1) at = hay.indexOf(findQ);
    if (at === -1) {
      setFindMsg("Tidak ditemukan");
      return;
    }
    el.focus();
    el.setSelectionRange(at, at + findQ.length);
    setFindMsg("Ditemukan");
    refresh();
  };

  const selFile = openList.find((f) => f.name === selName) ?? null;

  return (
    <div
      className="xpa-np-app"
      onMouseDown={() => setMenu(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setMenu(null);
          setDlg(null);
        }
      }}
    >
      <div className="xpa-np-menubar" role="menubar">
        <MenuBtn label="File" open={menu === "file"} onToggle={() => setMenu(menu === "file" ? null : "file")}>
          <button type="button" className="xpa-np-menu__item" onClick={() => { onNew(); setMenu(null); }}>
            New
          </button>
          <button type="button" className="xpa-np-menu__item" onClick={() => { openPicker(); setMenu(null); }}>
            Open...
          </button>
          <div className="xpa-np-menu__sep" />
          <button type="button" className="xpa-np-menu__item" onClick={() => { onSave(); setMenu(null); }}>
            Save
          </button>
          <button type="button" className="xpa-np-menu__item" onClick={() => { onSaveAs(); setMenu(null); }}>
            Save As...
          </button>
          <div className="xpa-np-menu__sep" />
          <button type="button" className="xpa-np-menu__item" onClick={() => { onCloseDoc(); setMenu(null); }}>
            Close
          </button>
        </MenuBtn>
        <MenuBtn label="Edit" open={menu === "edit"} onToggle={() => setMenu(menu === "edit" ? null : "edit")}>
          <button type="button" className="xpa-np-menu__item" disabled={past.length === 0} onClick={() => { undo(); setMenu(null); }}>
            Undo
          </button>
          <div className="xpa-np-menu__sep" />
          <button type="button" className="xpa-np-menu__item" disabled={!hasSel} onClick={() => { exec("cut"); setMenu(null); }}>
            Cut
          </button>
          <button type="button" className="xpa-np-menu__item" disabled={!hasSel} onClick={() => { exec("copy"); setMenu(null); }}>
            Copy
          </button>
          <button type="button" className="xpa-np-menu__item" onClick={() => { exec("paste"); setMenu(null); }}>
            Paste
          </button>
          <button type="button" className="xpa-np-menu__item" disabled={!hasSel} onClick={() => { exec("delete"); setMenu(null); }}>
            Delete
          </button>
          <div className="xpa-np-menu__sep" />
          <button type="button" className="xpa-np-menu__item" onClick={() => { exec("selectAll"); setMenu(null); }}>
            Select All
          </button>
          <button type="button" className="xpa-np-menu__item" onClick={() => { insertTimeDate(); setMenu(null); }}>
            Time/Date
          </button>
          <div className="xpa-np-menu__sep" />
          <button type="button" className="xpa-np-menu__item" onClick={() => { setFindQ(""); setFindMsg(null); setDlg("find"); setMenu(null); }}>
            Find...
          </button>
        </MenuBtn>
        <MenuBtn label="Format" open={menu === "format"} onToggle={() => setMenu(menu === "format" ? null : "format")}>
          <button type="button" className="xpa-np-menu__item" onClick={() => { setWrap((w) => !w); setMenu(null); }}>
            <span className="xpa-np-menu__check">{wrap ? "*" : " "}</span>
            <span>Word Wrap</span>
          </button>
          <div className="xpa-np-menu__sep" />
          {SIZES.map((s) => (
            <button key={s} type="button" className="xpa-np-menu__item" onClick={() => { setFontSize(s); setMenu(null); }}>
              <span className="xpa-np-menu__check">{s === fontSize ? "*" : " "}</span>
              <span>{s} pt</span>
            </button>
          ))}
        </MenuBtn>
        <MenuBtn label="View" open={menu === "view"} onToggle={() => setMenu(menu === "view" ? null : "view")}>
          <button type="button" className="xpa-np-menu__item" onClick={() => { setShowStatus((v) => !v); setMenu(null); }}>
            <span className="xpa-np-menu__check">{showStatus ? "*" : " "}</span>
            <span>Status Bar</span>
          </button>
        </MenuBtn>
        <MenuBtn label="Help" open={menu === "help"} onToggle={() => setMenu(menu === "help" ? null : "help")}>
          <button type="button" className="xpa-np-menu__item" onClick={() => { setDlg("about"); setMenu(null); }}>
            About Notepad
          </button>
        </MenuBtn>
      </div>
      <div className="xpa-np-title">{name} - Notepad</div>
      <textarea
        ref={taRef}
        className={`xpa-np-edit ${wrap ? "" : "xpa-np-edit--nowrap"}`}
        style={{ fontSize: `${fontSize}px` }}
        value={text}
        wrap={wrap ? "soft" : "off"}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={refresh}
        onClick={refresh}
        onSelect={refresh}
        onKeyDown={(e) => {
          if (e.key === "F5") {
            e.preventDefault();
            insertTimeDate();
          }
        }}
        spellCheck={false}
        autoFocus
        aria-label="Isi notepad"
      />
      {showStatus && (
        <div className="xpa-np-status">
          <span className="xpa-np-status__cell">Ln {pos.line}, Col {pos.col}</span>
          {msg && <span className="xpa-np-status__msg">{msg}</span>}
          <span className="xpa-np-status__cell xpa-np-status__cell--right">char: {text.length}</span>
        </div>
      )}

      {dlg === "find" && (
        <XpDlg title="Cari" onClose={() => setDlg(null)}>
          <div className="xpa-np-dlg__row">
            <label htmlFor="xpa-np-find">Cari:</label>
            <input
              id="xpa-np-find"
              className="xpa-np-dlg__input"
              autoFocus
              value={findQ}
              onChange={(e) => {
                setFindQ(e.target.value);
                setFindMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doFind();
                }
              }}
            />
          </div>
          <div className="xpa-np-dlg__row">
            <button type="button" className="xpa-np-btn" onClick={doFind}>
              Cari Berikutnya
            </button>
            <button type="button" className="xpa-np-btn" onClick={() => setDlg(null)}>
              Batal
            </button>
          </div>
          <div className="xpa-np-dlg__msg">{findMsg}</div>
        </XpDlg>
      )}

      {dlg === "open" && (
        <XpDlg title="Buka" onClose={() => setDlg(null)}>
          <div className="xpa-np-dlg__list" role="listbox" aria-label="Pilih file">
            {openList.map((f) => (
              <button
                key={f.name}
                type="button"
                role="option"
                aria-selected={selName === f.name}
                className={`xpa-np-dlg__file ${selName === f.name ? "xpa-np-dlg__file--sel" : ""}`}
                onClick={() => setSelName(f.name)}
                onDoubleClick={() => doOpenFile(f)}
              >
                {f.name}
              </button>
            ))}
          </div>
          <div className="xpa-np-dlg__row">
            <button type="button" className="xpa-np-btn" disabled={!selFile} onClick={() => selFile && doOpenFile(selFile)}>
              Buka
            </button>
            <button type="button" className="xpa-np-btn" onClick={() => setDlg(null)}>
              Batal
            </button>
          </div>
        </XpDlg>
      )}

      {dlg === "about" && (
        <XpDlg title="Tentang Notepad" onClose={() => setDlg(null)}>
          <div className="xpa-np-dlg__about">
            <div className="xpa-np-dlg__about-title">Windows Notepad XP</div>
            <div>Versi 1.0</div>
            <div>Bagian dari Engineering Proses v2.</div>
          </div>
          <div className="xpa-np-dlg__row">
            <button type="button" className="xpa-np-btn" onClick={() => setDlg(null)}>
              OK
            </button>
          </div>
        </XpDlg>
      )}

      <style jsx>{`
        .xpa-np-app {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ece9d8;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
          position: relative;
          overflow: hidden;
        }
        .xpa-np-app button,
        .xpa-np-app input {
          font-family: inherit;
          font-size: 11px;
        }
        .xpa-np-menubar {
          display: flex;
          align-items: stretch;
          flex: none;
          background: #ece9d8;
          border-bottom: 1px solid #aca899;
          box-shadow: inset 0 1px 0 #fff;
          padding: 1px 2px;
        }
        .xpa-np-menubar__wrap {
          position: relative;
          flex: none;
        }
        .xpa-np-menubar__item {
          color: #000;
          background: transparent;
          border: none;
          padding: 3px 9px;
          cursor: default;
          white-space: nowrap;
        }
        .xpa-np-menubar__item:hover,
        .xpa-np-menubar__item--open {
          background: #316ac5;
          color: #fff;
        }
        .xpa-np-menu {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 80;
          min-width: 180px;
          background: #fff;
          border: 1px solid #aca899;
          box-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
          padding: 2px 0;
          display: flex;
          flex-direction: column;
        }
        .xpa-np-menu__item {
          display: flex;
          align-items: center;
          gap: 6px;
          text-align: left;
          color: #000;
          background: transparent;
          border: none;
          padding: 4px 12px 4px 6px;
          cursor: default;
          white-space: nowrap;
        }
        .xpa-np-menu__item:hover:not(:disabled),
        .xpa-np-menu__item--active {
          background: #316ac5;
          color: #fff;
        }
        .xpa-np-menu__item:disabled {
          color: #9a9a9a;
        }
        .xpa-np-menu__check {
          width: 10px;
          flex: none;
        }
        .xpa-np-menu__sep {
          height: 1px;
          background: #e0dfd7;
          margin: 3px 6px;
        }
        .xpa-np-title {
          padding: 2px 4px;
          color: #404040;
          flex: none;
        }
        .xpa-np-edit {
          flex: 1;
          width: 100%;
          min-height: 0;
          resize: none;
          background: #fff;
          color: #000;
          font-family: "Courier New", monospace;
          line-height: 1.35;
          border: 1px inset #aca899;
          margin: 0 4px;
          padding: 4px 6px;
        }
        .xpa-np-edit--nowrap {
          white-space: pre;
          overflow-x: auto;
        }
        .xpa-np-status {
          display: flex;
          align-items: center;
          gap: 2px;
          flex: none;
          padding: 3px 5px;
          margin-top: 4px;
          border-top: 1px solid #aca899;
          border-bottom: 1px solid #fff;
          background: #ece9d8;
        }
        .xpa-np-status__cell {
          padding: 0 7px;
          border: 1px solid;
          border-top-color: #aca899;
          border-left-color: #aca899;
          border-right-color: #fff;
          border-bottom-color: #fff;
        }
        .xpa-np-status__cell--right {
          margin-left: auto;
        }
        .xpa-np-status__msg {
          color: #000;
          margin-left: 6px;
        }
        .xpa-np-dlg {
          position: absolute;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.25);
        }
        .xpa-np-dlg__box {
          width: 340px;
          max-width: 92%;
          background: #ece9d8;
          border: 1px solid #0831d9;
          box-shadow: 3px 3px 8px rgba(0, 0, 0, 0.4);
        }
        .xpa-np-dlg__title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(90deg, #0831d9, #3963d6);
          color: #fff;
          font-weight: bold;
          padding: 3px 4px 3px 8px;
        }
        .xpa-np-dlg__x {
          color: #fff;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 0 4px;
        }
        .xpa-np-dlg__body {
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .xpa-np-dlg__row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .xpa-np-dlg__input {
          flex: 1;
          border: 1px solid #7f9db9;
          background: #fff;
          padding: 3px 4px;
        }
        .xpa-np-btn {
          min-width: 70px;
          background: #ece9d8;
          border: 1px solid;
          border-color: #fff #aca899 #aca899 #fff;
          padding: 3px 10px;
          cursor: pointer;
        }
        .xpa-np-btn:active {
          border-color: #aca899 #fff #fff #aca899;
        }
        .xpa-np-btn:disabled {
          color: #9a9a9a;
        }
        .xpa-np-dlg__list {
          border: 1px solid #7f9db9;
          background: #fff;
          height: 150px;
          overflow: auto;
        }
        .xpa-np-dlg__file {
          display: block;
          width: 100%;
          text-align: left;
          padding: 2px 6px;
          cursor: default;
          border: none;
          background: transparent;
        }
        .xpa-np-dlg__file--sel {
          background: #316ac5;
          color: #fff;
        }
        .xpa-np-dlg__msg {
          color: #404040;
          min-height: 14px;
        }
        .xpa-np-dlg__about {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .xpa-np-dlg__about-title {
          font-weight: bold;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}

function MenuBtn({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="xpa-np-menubar__wrap" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`xpa-np-menubar__item ${open ? "xpa-np-menubar__item--open" : ""}`}
        onClick={onToggle}
      >
        {label}
      </button>
      {open && <div className="xpa-np-menu">{children}</div>}
    </div>
  );
}

function XpDlg({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="xpa-np-dlg" onMouseDown={(e) => e.stopPropagation()}>
      <div className="xpa-np-dlg__box" role="dialog" aria-label={title}>
        <div className="xpa-np-dlg__title">
          <span>{title}</span>
          <button type="button" className="xpa-np-dlg__x" onClick={onClose} aria-label="Tutup">
            X
          </button>
        </div>
        <div className="xpa-np-dlg__body">{children}</div>
      </div>
    </div>
  );
}
