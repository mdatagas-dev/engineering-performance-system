"use client";

import { useRef, useState, type ReactNode } from "react";

type Props = { file?: { name: string; content: string } };

export function NotepadApp({ file }: Props): ReactNode {
  const [text, setText] = useState(file?.content ?? "");
  const [pos, setPos] = useState({ line: 1, col: 1 });
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const updatePos = () => {
    const el = taRef.current;
    if (!el) return;
    const sel = el.selectionStart;
    const before = text.slice(0, sel);
    const line = before.split("\n").length;
    const col = before.length - before.lastIndexOf("\n");
    setPos({ line, col });
  };

  return (
    <div className="win95-app win95-notepad" onMouseDown={() => setMenu(null)}>
      <div className="win95-menubar" role="menubar">
        <MenuButton label="File" open={menu === "file"} onToggle={() => setMenu(menu === "file" ? null : "file")}>
          <button type="button" className="win95-menu__item" onClick={() => { setText(""); setMenu(null); }}>
            New
          </button>
          <button type="button" className="win95-menu__item" onClick={() => setMenu(null)}>
            Close
          </button>
        </MenuButton>
        <MenuButton label="Edit" open={menu === "edit"} onToggle={() => setMenu(menu === "edit" ? null : "edit")}>
          <button type="button" className="win95-menu__item win95-menu__item--disabled" disabled>
            Cut
          </button>
          <button type="button" className="win95-menu__item win95-menu__item--disabled" disabled>
            Copy
          </button>
          <button type="button" className="win95-menu__item win95-menu__item--disabled" disabled>
            Paste
          </button>
        </MenuButton>
        <MenuButton label="Help" open={menu === "help"} onToggle={() => setMenu(menu === "help" ? null : "help")}>
          <button type="button" className="win95-menu__item" onClick={() => setMenu(null)}>
            About Notepad
          </button>
        </MenuButton>
      </div>
      <div className="win95-notepad__title">{file?.name ?? "Untitled"} - Notepad</div>
      <textarea
        ref={taRef}
        className="win95-notepad__edit"
        value={text}
        onChange={(e) => { setText(e.target.value); updatePos(); }}
        onKeyUp={updatePos}
        onClick={updatePos}
        onSelect={updatePos}
        spellCheck={false}
        autoFocus
        aria-label="Isi notepad"
      />
      <div className="win95-statusbar">
        <span className="win95-statusbar__cell">Ln {pos.line}, Col {pos.col}</span>
        <span className="win95-statusbar__cell win95-statusbar__cell--right">char: {text.length}</span>
      </div>
    </div>
  );
}

function MenuButton({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="win95-menubar__wrap" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`win95-menubar__item ${open ? "win95-menubar__item--open" : ""}`}
        onClick={onToggle}
      >
        {label}
      </button>
      {open && <div className="win95-menu">{children}</div>}
    </div>
  );
}
