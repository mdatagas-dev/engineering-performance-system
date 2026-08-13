"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import WindowShell from "./window-shell";
import Win95Icon, { type Win95IconName } from "./win95-icons";
import { MyComputerApp } from "./apps/my-computer";
import { DocumentsApp } from "./apps/documents";
import { NotepadApp } from "./apps/notepad";
import { CalculatorApp } from "./apps/calculator";
import { MinesweeperApp } from "./apps/minesweeper";
import { CommandPromptApp } from "./apps/command-prompt";
import { SystemPropertiesApp } from "./apps/system-properties";
import { RecycleBinApp } from "./apps/recycle-bin";
import { AboutApp } from "./apps/about";
import { AccessTerminalApp } from "./apps/access-terminal";

type WinId =
  | "my-computer"
  | "my-documents"
  | "notepad"
  | "calculator"
  | "minesweeper"
  | "command-prompt"
  | "system-info"
  | "recycle-bin"
  | "about"
  | "access-terminal";

type NotepadFile = { name: string; content: string };

type WinState = {
  id: WinId;
  minimized: boolean;
  maximized: boolean;
  closing: boolean;
  z: number;
  initialPos: { x: number; y: number };
  initialSize: { w: number; h: number };
};

type ToastItem = { id: number; msg: string };

type WinMeta = { title: string; icon: Win95IconName; w: number; h: number };

const APP_META: Record<WinId, WinMeta> = {
  "my-computer": { title: "My Computer", icon: "my-computer", w: 560, h: 400 },
  "my-documents": { title: "My Documents", icon: "my-documents", w: 540, h: 400 },
  notepad: { title: "Notepad", icon: "notepad", w: 480, h: 420 },
  calculator: { title: "Calculator", icon: "calculator", w: 300, h: 340 },
  minesweeper: { title: "Minesweeper", icon: "minesweeper", w: 280, h: 400 },
  "command-prompt": { title: "Command Prompt", icon: "command-prompt", w: 620, h: 420 },
  "system-info": { title: "System Info", icon: "system-info", w: 460, h: 440 },
  "recycle-bin": { title: "Recycle Bin", icon: "recycle-bin", w: 520, h: 400 },
  about: { title: "About", icon: "about", w: 430, h: 330 },
  "access-terminal": { title: "ACCESS TERMINAL", icon: "access-terminal", w: 460, h: 380 },
};

const DESKTOP_ICONS: { id: WinId; label: string; icon: Win95IconName; accent?: boolean }[] = [
  { id: "my-computer", label: "My Computer", icon: "my-computer" },
  { id: "my-documents", label: "My Documents", icon: "my-documents" },
  { id: "notepad", label: "Notepad", icon: "notepad" },
  { id: "calculator", label: "Calculator", icon: "calculator" },
  { id: "minesweeper", label: "Minesweeper", icon: "minesweeper" },
  { id: "command-prompt", label: "Command Prompt", icon: "command-prompt" },
  { id: "system-info", label: "System Info", icon: "system-info" },
  { id: "recycle-bin", label: "Recycle Bin", icon: "recycle-bin" },
  { id: "access-terminal", label: "ACCESS TERMINAL", icon: "access-terminal", accent: true },
];

const SUB_PROGRAMS: { label: string; id: WinId }[] = [
  { label: "Notepad", id: "notepad" },
  { label: "Calculator", id: "calculator" },
  { label: "Minesweeper", id: "minesweeper" },
  { label: "Command Prompt", id: "command-prompt" },
  { label: "My Computer", id: "my-computer" },
];

const BOOT_STATUSES = ["Loading THE WORLD...", "Memeriksa drive...", "Memuat desktop..."];
const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function Desktop(): ReactNode {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [fading, setFading] = useState(false);
  const [bootStatus, setBootStatus] = useState(BOOT_STATUSES[0]);
  const bootDone = useRef(false);
  const [windows, setWindows] = useState<WinState[]>([]);
  const [selected, setSelected] = useState<WinId | null>(null);
  const [notepadFile, setNotepadFile] = useState<NotepadFile | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [bsod, setBsod] = useState(false);
  const [glitchKey, setGlitchKey] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const zRef = useRef(10);
  const cascade = useRef(0);
  const toastId = useRef(0);
  const bsodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<HTMLDivElement | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const ctxRef = useRef<HTMLDivElement | null>(null);
  const runInput = useRef<HTMLInputElement | null>(null);

  const toast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);

  const glitchFx = useCallback((msg?: string) => {
    setGlitchKey((k) => k + 1);
    if (msg) toast(msg);
  }, [toast]);

  const showBsod = useCallback(() => {
    setBsod(true);
    if (bsodTimer.current) clearTimeout(bsodTimer.current);
    bsodTimer.current = setTimeout(() => setBsod(false), 2500);
  }, []);

  const goLogin = useCallback(() => router.push("/login"), [router]);

  const openWin = useCallback((id: WinId, file?: NotepadFile) => {
    if (file) setNotepadFile(file);
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === id);
      if (existing) {
        return prev.map((w) =>
          w.id === id ? { ...w, minimized: false, closing: false, z: ++zRef.current } : w
        );
      }
      const meta = APP_META[id];
      const off = (cascade.current++ % 7) * 24;
      const x = Math.min(96 + off, Math.max(8, window.innerWidth - meta.w - 12));
      const y = Math.min(48 + off, Math.max(8, window.innerHeight - meta.h - 52));
      return [
        ...prev,
        {
          id,
          minimized: false,
          maximized: false,
          closing: false,
          z: ++zRef.current,
          initialPos: { x, y },
          initialSize: { w: meta.w, h: meta.h },
        },
      ];
    });
  }, []);

  const openNotepad = useCallback(
    (name: string, content: string) => openWin("notepad", { name, content }),
    [openWin]
  );

  const closeWin = useCallback((id: WinId) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, closing: true } : w)));
    setTimeout(() => setWindows((prev) => prev.filter((w) => w.id !== id)), 160);
  }, []);

  const focusWin = useCallback((id: WinId) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, z: ++zRef.current } : w)));
  }, []);

  const minimizeWin = useCallback((id: WinId) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMaxWin = useCallback((id: WinId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, z: ++zRef.current } : w))
    );
  }, []);

  const finishBoot = useCallback((skipped: boolean, note?: string) => {
    if (bootDone.current) return;
    bootDone.current = true;
    setFading(true);
    setTimeout(() => setBooted(true), 300);
    if (note) toast(note);
    else if (skipped) toast("Boot dilompati — desktop siap.");
  }, [toast]);

  /* ---- Boot sequence ---- */
  useEffect(() => {
    let i = 0;
    const si = setInterval(() => {
      i = (i + 1) % BOOT_STATUSES.length;
      setBootStatus(BOOT_STATUSES[i]);
    }, 850);
    const t = setTimeout(() => finishBoot(false), 3000);
    return () => {
      clearInterval(si);
      clearTimeout(t);
    };
  }, [finishBoot]);

  /* ---- Global keys: Ctrl+Alt+Del BSOD, Konami, Escape ---- */
  useEffect(() => {
    let buff: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (bsod) {
        setBsod(false);
        return;
      }
      if (e.ctrlKey && e.altKey && e.key === "Delete") {
        e.preventDefault();
        showBsod();
        return;
      }
      if (e.key === "Escape") {
        setStartOpen(false);
        setCtxMenu(null);
        setRunOpen(false);
        return;
      }
      buff = [...buff, e.key.toLowerCase()].slice(-10);
      if (buff.join(",") === KONAMI.join(",")) {
        buff = [];
        glitchFx("KONAMI! Mode nostalgia aktif.");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bsod, showBsod, glitchFx]);

  /* ---- Close menus on outside click ---- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        startOpen &&
        startRef.current &&
        !startRef.current.contains(e.target as Node) &&
        startBtnRef.current &&
        !startBtnRef.current.contains(e.target as Node)
      ) {
        setStartOpen(false);
      }
      if (ctxMenu && ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [startOpen, ctxMenu]);

  useEffect(() => {
    if (runOpen) {
      const t = setTimeout(() => runInput.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [runOpen]);

  const startGo = (id: WinId) => {
    setStartOpen(false);
    openWin(id);
  };

  const startToast = (msg: string) => {
    setStartOpen(false);
    toast(msg);
  };

  const ctxAction = (action: "arrange" | "refresh" | "folder" | "props") => {
    setCtxMenu(null);
    if (action === "refresh") glitchFx("Desktop disegarkan.");
    else if (action === "folder") toast("Folder baru 'Folder Baru' dibuat di desktop. (tidak benar-benar)");
    else if (action === "arrange") toast("Ikon diatur rapi.");
    else openWin("system-info");
  };

  const doRun = () => {
    setRunOpen(false);
    openWin("command-prompt");
  };

  const bootClicks = useRef(0);
  const bootClickT = useRef(0);
  const onLogoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    bootClicks.current = now - bootClickT.current < 900 ? bootClicks.current + 1 : 1;
    bootClickT.current = now;
    if (bootClicks.current >= 3) {
      finishBoot(true, "GAS ELECTRONIC mengakui logo. Akselerasi boot!");
    }
  };

  const topZ = windows.reduce((m, w) => Math.max(m, w.z), 0);

  const renderBody = (id: WinId) => {
    switch (id) {
      case "my-computer":
        return <MyComputerApp onOpenNotepad={openNotepad} />;
      case "my-documents":
        return <DocumentsApp onOpenNotepad={openNotepad} />;
      case "notepad":
        return <NotepadApp file={notepadFile ?? undefined} />;
      case "calculator":
        return <CalculatorApp />;
      case "minesweeper":
        return <MinesweeperApp />;
      case "command-prompt":
        return <CommandPromptApp onLogin={goLogin} />;
      case "system-info":
        return <SystemPropertiesApp />;
      case "recycle-bin":
        return <RecycleBinApp />;
      case "about":
        return <AboutApp onClose={() => closeWin("about")} />;
      case "access-terminal":
        return <AccessTerminalApp onLogin={goLogin} />;
    }
  };

  return (
    <div
      className="win95-desktop win95-desktop--wallpaper"
      onContextMenu={(e) => {
        e.preventDefault();
        setStartOpen(false);
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
    >
      <div className="win95-windows" onContextMenu={(e) => e.stopPropagation()}>
        {windows.map((win) => {
          const focused = win.z === topZ && !win.minimized;
          return (
            <WindowShell
              key={win.id}
              id={win.id}
              title={APP_META[win.id].title}
              icon={<Win95Icon name={APP_META[win.id].icon} size={16} />}
              focused={focused}
              minimized={win.minimized}
              maximized={win.maximized}
              closing={win.closing}
              z={win.z}
              initialPos={win.initialPos}
              initialSize={win.initialSize}
              onFocus={() => focusWin(win.id)}
              onMinimize={() => minimizeWin(win.id)}
              onMaximizeToggle={() => toggleMaxWin(win.id)}
              onClose={() => closeWin(win.id)}
            >
              {renderBody(win.id)}
            </WindowShell>
          );
        })}
      </div>

      {/* Desktop icons */}
      <div className="win95-icons" role="listbox" aria-label="Ikon desktop">
        {DESKTOP_ICONS.map((ic) => (
          <button
            key={ic.id}
            type="button"
            role="option"
            aria-selected={selected === ic.id}
            aria-label={`Buka ${ic.label}`}
            title={`${ic.label} — klik dua kali untuk membuka`}
            className={`win95-icon ${selected === ic.id ? "win95-icon--selected" : ""} ${ic.accent ? "win95-icon--accent" : ""}`}
            onClick={() => setSelected(ic.id)}
            onDoubleClick={() => {
              setSelected(null);
              openWin(ic.id);
            }}
          >
            <span className="win95-icon__glyph" aria-hidden>
              <Win95Icon name={ic.icon} size={32} />
            </span>
            <span className="win95-icon__label">{ic.label}</span>
          </button>
        ))}
      </div>

      {/* Start menu */}
      {startOpen && (
        <div ref={startRef} className="win95-startmenu" role="menu" aria-label="Menu Start">
          <div className="win95-startmenu__rail" aria-hidden>
            <span className="win95-startmenu__rail-text">GE-OS</span>
          </div>
          <div className="win95-startmenu__list">
            <div className="win95-menu-item" role="menuitem" aria-haspopup="menu">
              <span aria-hidden>
                <Win95Icon name={APP_META["my-computer"].icon} size={16} />
              </span>
              Program
              <span className="win95-menu-item__arrow" aria-hidden>
                ▸
              </span>
              <div className="win95-submenu" role="menu" aria-label="Program">
                {SUB_PROGRAMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    className="win95-menu-item"
                    onClick={() => startGo(p.id)}
                  >
                    <span aria-hidden>
                      <Win95Icon name={APP_META[p.id].icon} size={16} />
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => startGo("my-documents")}>
              <span aria-hidden>
                <Win95Icon name={APP_META["my-documents"].icon} size={16} />
              </span>
              Documents
            </button>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => startGo("system-info")}>
              <span aria-hidden>
                <Win95Icon name={APP_META["system-info"].icon} size={16} />
              </span>
              Settings
            </button>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => startToast("Find: pencarian lokal tidak tersedia di GE-OS.")}>
              <span aria-hidden>⌖</span>
              Find…
            </button>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => startGo("about")}>
              <span aria-hidden>
                <Win95Icon name={APP_META.about.icon} size={16} />
              </span>
              Help
            </button>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => { setStartOpen(false); setRunOpen(true); }}>
              <span aria-hidden>▣</span>
              Run…
            </button>
            <div className="win95-menu-sep" aria-hidden />
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => startGo("access-terminal")}>
              <span aria-hidden>
                <Win95Icon name={APP_META["access-terminal"].icon} size={16} />
              </span>
              Log On GAS ELECTRONIC…
            </button>
            <button type="button" role="menuitem" className="win95-menu-item" onClick={() => { setStartOpen(false); showBsod(); }}>
              <span aria-hidden>◙</span>
              Shut Down…
            </button>
          </div>
        </div>
      )}

      {/* Desktop context menu */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="win95-contextmenu"
          role="menu"
          aria-label="Menu konteks desktop"
          style={{
            left: Math.min(ctxMenu.x, window.innerWidth - 190),
            top: Math.min(ctxMenu.y, window.innerHeight - 160),
          }}
        >
          <button type="button" role="menuitem" className="win95-menu-item" onClick={() => ctxAction("arrange")}>
            <span aria-hidden>◫</span>
            Arrange Icons
          </button>
          <button type="button" role="menuitem" className="win95-menu-item" onClick={() => ctxAction("refresh")}>
            <span aria-hidden>⟳</span>
            Refresh
          </button>
          <button type="button" role="menuitem" className="win95-menu-item" onClick={() => ctxAction("folder")}>
            <span aria-hidden>▣</span>
            New Folder
          </button>
          <div className="win95-menu-sep" aria-hidden />
          <button type="button" role="menuitem" className="win95-menu-item" onClick={() => ctxAction("props")}>
            <span aria-hidden>
              <Win95Icon name={APP_META["system-info"].icon} size={16} />
            </span>
            Properties
          </button>
        </div>
      )}

      {/* Run dialog */}
      {runOpen && (
        <div className="win95-run" role="dialog" aria-modal="true" aria-label="Run">
          <div className="win95-run__bar">
            <span aria-hidden>▤</span>
            Run
          </div>
          <div className="win95-run__body">
            <p>Ketik nama program, folder, dokumen, atau sumber Internet, lalu buka.</p>
            <div className="win95-run__field">
              <span>Open:</span>
              <input
                ref={runInput}
                type="text"
                className="win95-field"
                defaultValue="cmd"
                aria-label="Perintah yang akan dijalankan"
                onKeyDown={(e) => {
                  if (e.key === "Enter") doRun();
                  if (e.key === "Escape") setRunOpen(false);
                }}
              />
            </div>
            <div className="win95-run__btns">
              <button type="button" className="win95-btn" onClick={doRun}>
                OK
              </button>
              <button type="button" className="win95-btn" onClick={() => setRunOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="win95-taskbar" role="toolbar" aria-label="Taskbar">
        <div className="win95-taskbar__left">
          <button
            ref={startBtnRef}
            type="button"
            className={`win95-start-btn ${startOpen ? "win95-start-btn--down" : ""}`}
            aria-label="Menu Start"
            aria-haspopup="menu"
            aria-expanded={startOpen}
            onClick={() => setStartOpen((v) => !v)}
          >
            <Win95Icon name="windows-flag" size={16} />
            <span>Start</span>
          </button>
          <div className="win95-taskbar__tasks" role="group" aria-label="Jendela terbuka">
            {windows.map((win) => {
              const active = win.z === topZ && !win.minimized;
              return (
                <button
                  key={win.id}
                  type="button"
                  className={`win95-task ${active ? "win95-task--active" : ""}`}
                  title={APP_META[win.id].title}
                  aria-label={`${APP_META[win.id].title} — ${win.minimized ? "diminimalkan" : "terbuka"}`}
                  onClick={() => {
                    if (win.minimized || !active) openWin(win.id);
                    else minimizeWin(win.id);
                  }}
                >
                  <span aria-hidden>
                    <Win95Icon name={APP_META[win.id].icon} size={16} />
                  </span>
                  <span>{APP_META[win.id].title}</span>
                </button>
              );
            })}
          </div>
        </div>
        <WinClock />
      </div>

      {/* Toasts */}
      <div className="win95-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="win95-toast">
            {t.msg}
          </div>
        ))}
      </div>

      {/* Glitch flash */}
      {glitchKey > 0 && <div key={glitchKey} className="win95-glitch" aria-hidden />}

      {/* BSOD */}
      {bsod && (
        <div className="win95-bsod" role="alert" aria-label="Layar biru" onClick={() => setBsod(false)}>
          <div className="win95-bsod__main">
            {`A fatal exception 0E has occurred at 0028:C0001E7F in VXD THEWORLD(01) + 00000F30.
The current application will be terminated.`}
          </div>
          <div className="win95-bsod__msg">* THE WORLD is nostalgic.</div>
          <div className="win95-bsod__hint">Press any key to continue</div>
        </div>
      )}

      {/* Boot overlay */}
      {!booted && (
        <div
          className={`win95-boot ${fading ? "win95-boot--fade" : ""}`}
          role="dialog"
          aria-label="Boot GE-OS"
          onClick={() => finishBoot(true)}
        >
          <div className="win95-boot__logo" onClick={onLogoClick} title="GAS ELECTRONIC">
            GAS ELECTRONIC
          </div>
          <div className="win95-boot__sub">Engineering Production System · GE-OS v1.0</div>
          <div className="win95-boot__track" aria-hidden>
            <div className="win95-boot__bar" />
          </div>
          <div className="win95-boot__status" role="status" aria-live="polite">
            {bootStatus}
          </div>
          <div className="win95-boot__hint">klik untuk melewati boot…</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Taskbar clock + kalender (DBLCLICK jam → popup).
   ============================================================ */
function WinClock() {
  const [now, setNow] = useState(() => new Date());
  const [cal, setCal] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (cal && ref.current && !ref.current.contains(e.target as Node)) setCal(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCal(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [cal]);

  const time = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="win95-tray" ref={ref}>
      <span className="win95-tray__icon" title="Volume" aria-hidden>
        ◙
      </span>
      <button
        type="button"
        className="win95-clock"
        title="Klik dua kali: kalender"
        aria-label={`Jam — ${time}. Klik dua kali untuk membuka kalender`}
        onDoubleClick={() => setCal((v) => !v)}
      >
        {time}
      </button>
      {cal && (
        <div className="win95-calendar" role="dialog" aria-label={`Kalender ${monthName}`}>
          <div className="win95-calendar__title">{monthName}</div>
          <div className="win95-calendar__grid">
            {DOW.map((d) => (
              <div key={d} className="win95-calendar__dow">
                {d}
              </div>
            ))}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`b${i}`} className="win95-calendar__blank" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              return (
                <div key={d} className={`win95-calendar__day ${d === now.getDate() ? "win95-calendar__day--today" : ""}`}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
