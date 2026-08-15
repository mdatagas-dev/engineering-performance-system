"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import WindowShell from "./window-shell";
import WinXpIcon, { type WinXpIconName } from "./winxp-icons";
import Taskbar from "./taskbar";
import StartMenu from "./start-menu";
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
import { InternetExplorerApp } from "./apps/internet-explorer";
import { ControlPanelApp } from "./apps/control-panel";
import { NetworkPlacesApp } from "./apps/network-places";
import { GameHouseApp } from "./apps/game-house";

type WinId =
  | "my-computer"
  | "my-documents"
  | "recycle-bin"
  | "notepad"
  | "calculator"
  | "command-prompt"
  | "minesweeper"
  | "game-house"
  | "internet-explorer"
  | "control-panel"
  | "network-places"
  | "about"
  | "access-terminal"
  | "system-properties";

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

type WinMeta = { title: string; icon: WinXpIconName; w: number; h: number };

const APP_META: Record<WinId, WinMeta> = {
  "my-computer": { title: "My Computer", icon: "my-computer", w: 560, h: 400 },
  "my-documents": { title: "My Documents", icon: "my-documents", w: 540, h: 400 },
  "recycle-bin": { title: "Recycle Bin", icon: "recycle-bin", w: 520, h: 400 },
  notepad: { title: "Notepad", icon: "notepad", w: 480, h: 420 },
  calculator: { title: "Calculator", icon: "calculator", w: 300, h: 340 },
  "command-prompt": { title: "Command Prompt", icon: "command-prompt", w: 620, h: 420 },
  minesweeper: { title: "Minesweeper", icon: "minesweeper", w: 280, h: 400 },
  "game-house": { title: "Game House", icon: "game-house", w: 460, h: 420 },
  "internet-explorer": { title: "Internet Explorer", icon: "internet-explorer", w: 640, h: 460 },
  "control-panel": { title: "Control Panel", icon: "control-panel", w: 560, h: 420 },
  "network-places": { title: "Network Places", icon: "network-places", w: 540, h: 400 },
  about: { title: "About GE-XP", icon: "help", w: 430, h: 330 },
  "access-terminal": { title: "ACCESS TERMINAL", icon: "command-prompt", w: 460, h: 380 },
  "system-properties": { title: "System Properties", icon: "control-panel", w: 460, h: 440 },
};

type IconKind =
  | { type: "app"; win: WinId }
  | { type: "shortcut" }
  | { type: "none"; itemType: "folder" | "text" | "shortcut" };

type IconEntry = { id: string; label: string; icon: WinXpIconName; kind: IconKind };

const BASE_ICONS: IconEntry[] = [
  { id: "internet-explorer", label: "Internet Explorer", icon: "internet-explorer", kind: { type: "app", win: "internet-explorer" } },
  { id: "minesweeper", label: "Minesweeper", icon: "minesweeper", kind: { type: "app", win: "minesweeper" } },
  { id: "my-computer", label: "My Computer", icon: "my-computer", kind: { type: "app", win: "my-computer" } },
  { id: "notepad", label: "Notepad", icon: "notepad", kind: { type: "app", win: "notepad" } },
  { id: "recycle-bin", label: "Recycle Bin", icon: "recycle-bin", kind: { type: "app", win: "recycle-bin" } },
  { id: "calculator", label: "Calculator", icon: "calculator", kind: { type: "app", win: "calculator" } },
  { id: "command-prompt", label: "Command Prompt", icon: "command-prompt", kind: { type: "app", win: "command-prompt" } },
  { id: "game-house", label: "Game House", icon: "game-house", kind: { type: "app", win: "game-house" } },
  { id: "my-documents", label: "My Documents", icon: "my-documents", kind: { type: "app", win: "my-documents" } },
  { id: "network-places", label: "Network Places", icon: "network-places", kind: { type: "app", win: "network-places" } },
  { id: "control-panel", label: "Control Panel", icon: "control-panel", kind: { type: "app", win: "control-panel" } },
  { id: "document-center", label: "Document Center", icon: "document-center", kind: { type: "shortcut" } },
];

const BOOT_STATUSES = ["Loading THE WORLD...", "Memeriksa drive...", "Memuat desktop XP..."];
const BUSINESS_IDS = new Set([
  "gas-pms",
  "document-center",
  "production",
  "quality",
  "engineering",
  "maintenance",
]);
const KONAMI = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a",
];
const POS_KEY = "eps_desktop_icons_pos_v2";
const GRID_ROWS = 9;
const GRID_W = 96;
const GRID_H = 110;

type CtxMenu = { x: number; y: number };
type IconCtxMenu = { id: string; x: number; y: number };
type ConfirmState = { kind: "delete" | "logoff" | "turnoff"; id?: string };
type SortBy = "name" | "size" | "type" | "modified";

export default function Desktop(): ReactNode {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [fading, setFading] = useState(false);
  const [bootStatus, setBootStatus] = useState(BOOT_STATUSES[0]);
  const bootDone = useRef(false);
  const [windows, setWindows] = useState<WinState[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notepadFile, setNotepadFile] = useState<NotepadFile | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [ctx, setCtx] = useState<CtxMenu | null>(null);
  const [iconCtx, setIconCtx] = useState<IconCtxMenu | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [bsod, setBsod] = useState(false);
  const [glitchKey, setGlitchKey] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [icons, setIcons] = useState<IconEntry[]>(BASE_ICONS);
  const [deleted, setDeleted] = useState<IconEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const [iconPos, setIconPos] = useState<Record<string, { x: number; y: number }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>;
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {
      /* abaikan data korup */
    }
    return {};
  });
  const [iconSize, setIconSize] = useState<"large" | "small">("large");
  const [autoArrange, setAutoArrange] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [refreshKey, setRefreshKey] = useState(0);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [propsTarget, setPropsTarget] = useState<string | null>(null);
  const [desktopProps, setDesktopProps] = useState(false);

  const zRef = useRef(10);
  const cascade = useRef(0);
  const toastId = useRef(0);
  const customId = useRef(0);
  const bsodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctxRef = useRef<HTMLDivElement | null>(null);
  const iconCtxRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<HTMLDivElement | null>(null);
  const taskbarRef = useRef<HTMLDivElement | null>(null);
  const runInput = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{ id: string; start: { x: number; y: number }; sx: number; sy: number; moved: boolean } | null>(null);
  const iconRefs = useRef(new Map<string, HTMLDivElement | null>());
  const suppressClick = useRef(false);
  const renameCancel = useRef(false);

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
  const goLoginReplace = useCallback(() => router.replace("/login"), [router]);

  /* ---- Window manager ---- */
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
      const y = Math.min(48 + off, Math.max(8, window.innerHeight - meta.h - 64));
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
    else if (skipped) toast("Boot dilompati - desktop siap.");
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration gate: konten interaktif hanya dirender di client
    setMounted(true);
  }, []);

  /* ---- Icon positions: localStorage (persist) ---- */
  useEffect(() => {
    // First load: susun icon rapi di kiri layar (grid deterministik, tidak
    // menumpuk). lazy useState tidak jalan ulang saat hydration, jadi diisi
    // lewat efek; posisi tetap bisa di-drag bebas setelahnya.
    if (Object.keys(iconPos).length === 0) {
      const next: Record<string, { x: number; y: number }> = {};
      BASE_ICONS.forEach((ic, i) => {
        const col = Math.floor(i / GRID_ROWS);
        const row = i % GRID_ROWS;
        next[ic.id] = { x: 8 + col * GRID_W, y: 8 + row * GRID_H };
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration: lazy useState tidak jalan ulang di client (halaman di-prerender)
      setIconPos(next);
    }
  }, [iconPos]);

  useEffect(() => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(iconPos));
    } catch {
      /* storage penuh / diblokir */
    }
  }, [iconPos]);

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
        setCtx(null);
        setIconCtx(null);
        setRunOpen(false);
        setRenameId(null);
        setConfirm(null);
        setPropsTarget(null);
        setDesktopProps(false);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) return;
      buff = [...buff, e.key.toLowerCase()].slice(-10);
      if (buff.join(",") === KONAMI.join(",")) {
        buff = [];
        glitchFx("KONAMI! Mode nostalgia aktif.");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bsod, showBsod, glitchFx]);

  /* ---- Icon drag (pointer capture di icon, move/up global) ---- */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nx = d.start.x + (e.clientX - d.sx);
      const ny = d.start.y + (e.clientY - d.sy);
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
      setIconPos((prev) => ({ ...prev, [d.id]: { x: Math.max(0, nx), y: Math.max(0, ny) } }));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (d.moved) suppressClick.current = true;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  /* ---- Tutup menu saat klik di luar ---- */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ctxRef.current && ctxRef.current.contains(t)) return;
      setCtx(null);
      if (iconCtxRef.current && iconCtxRef.current.contains(t)) return;
      setIconCtx(null);
      if (startRef.current && startRef.current.contains(t)) return;
      if (taskbarRef.current && taskbarRef.current.contains(t)) return;
      setStartOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (runOpen) {
      const t = setTimeout(() => runInput.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [runOpen]);

  /* ---- Icon helpers ---- */
  const gridPos = useCallback(
    (i: number) => {
      const col = Math.floor(i / GRID_ROWS);
      const row = i % GRID_ROWS;
      return { x: 8 + col * GRID_W, y: 8 + row * GRID_H };
    },
    []
  );

  const iconType = useCallback((ic: IconEntry) => {
    switch (ic.kind.type) {
      case "app":
        return "Aplikasi";
      case "shortcut":
        return "Pintasan";
      case "none":
        return ic.kind.itemType === "folder" ? "Folder" : ic.kind.itemType === "text" ? "Dokumen Teks" : "Pintasan";
    }
  }, []);

  const iconMeta = useCallback(
    (ic: IconEntry) => {
      const size = ((ic.label.length * 733) % 9000) + 512;
      const mod = new Date(2006, (ic.id.length * 7) % 12, ((ic.id.length * 3) % 27) + 1);
      return { size, mod };
    },
    []
  );

  const orderedIcons = useMemo(() => {
    const arr = [...icons];
    switch (sortBy) {
      case "name":
        arr.sort((a, b) => a.label.localeCompare(b.label, "id"));
        break;
      case "size": {
        const m = (x: IconEntry) => ((x.label.length * 733) % 9000) + 512;
        arr.sort((a, b) => m(b) - m(a));
        break;
      }
      case "type":
        arr.sort(
          (a, b) => iconType(a).localeCompare(iconType(b), "id") || a.label.localeCompare(b.label, "id")
        );
        break;
      case "modified": {
        const d = (x: IconEntry) => new Date(2006, (x.id.length * 7) % 12, ((x.id.length * 3) % 27) + 1).getTime();
        arr.sort((a, b) => d(b) - d(a));
        break;
      }
    }
    return arr;
  }, [icons, sortBy, iconType]);

  const handleIconsKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      const len = orderedIcons.length;
      if (len === 0) return;
      e.preventDefault();
      const cur = selected ? orderedIcons.findIndex((ic) => ic.id === selected) : -1;
      const base = cur === -1 ? 0 : cur;
      let idx = base;
      if (e.key === "ArrowRight") idx = Math.min(len - 1, base + GRID_ROWS);
      else if (e.key === "ArrowLeft") idx = Math.max(0, base - GRID_ROWS);
      else if (e.key === "ArrowDown" && base % GRID_ROWS < GRID_ROWS - 1) idx = base + 1;
      else if (e.key === "ArrowUp" && base % GRID_ROWS > 0) idx = base - 1;
      const next = orderedIcons[idx];
      setSelected(next.id);
      iconRefs.current.get(next.id)?.focus();
    },
    [orderedIcons, selected]
  );

  const openIcon = useCallback(
    (id: string) => {
      const ic = icons.find((x) => x.id === id);
      if (!ic) return;
      if (ic.kind.type === "app") openWin(ic.kind.win);
      else if (ic.kind.type === "shortcut") goLogin();
      else toast("Item ini belum bisa dibuka.");
    },
    [icons, openWin, goLogin, toast]
  );

  const restoreIcon = useCallback(
    (id: string) => {
      const item = deleted.find((x) => x.id === id);
      if (!item) return;
      setIcons((prev) => [...prev, item]);
      setDeleted((prev) => prev.filter((x) => x.id !== id));
    },
    [deleted]
  );

  const startIconDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string, i: number) => {
      if (e.button !== 0 || autoArrange) return;
      e.preventDefault();
      setSelected(id);
      const start = iconPos[id] ?? gridPos(i);
      dragRef.current = { id, start, sx: e.clientX, sy: e.clientY, moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [autoArrange, iconPos, gridPos]
  );

  const commitRename = (id: string, value: string) => {
    if (renameCancel.current) {
      renameCancel.current = false;
      setRenameId(null);
      return;
    }
    setIcons((prev) => prev.map((x) => (x.id === id ? { ...x, label: value.trim() || x.label } : x)));
    setRenameId(null);
  };

  const newIcon = (itemType: "folder" | "text" | "shortcut") => {
    const id = `custom-${++customId.current}`;
    const label =
      itemType === "folder" ? "Folder Baru" : itemType === "text" ? "Dokumen Teks Baru" : "Pintasan Baru";
    const icon: WinXpIconName = itemType === "folder" ? "folder" : itemType === "text" ? "file" : "run";
    setIcons((prev) => [...prev, { id, label, icon, kind: { type: "none", itemType } }]);
    setSelected(id);
    setCtx(null);
    toast("Item baru dibuat di desktop.");
  };

  const doRun = () => {
    const v = (runInput.current?.value ?? "").trim().toLowerCase();
    setRunOpen(false);
    switch (v) {
      case "calc":
      case "calculator":
        openWin("calculator");
        break;
      case "notepad":
        openWin("notepad");
        break;
      case "minesweeper":
        openWin("minesweeper");
        break;
      case "ie":
      case "internet":
        openWin("internet-explorer");
        break;
      case "cmd":
      case "command":
        openWin("command-prompt");
        break;
      case "mycomputer":
        openWin("my-computer");
        break;
      default:
        toast("Program tidak ditemukan.");
    }
  };

  const closeCtx = () => setCtx(null);

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
  const activeId = windows.find((w) => w.z === topZ && !w.minimized)?.id ?? null;

  const taskbarWindows = useMemo(
    () =>
      windows.map((w) => ({
        id: w.id,
        title: APP_META[w.id].title,
        minimized: w.minimized,
      })),
    [windows]
  );

  const handleToggleStart = useCallback(() => {
    setCtx(null);
    setIconCtx(null);
    setStartOpen((v) => !v);
  }, []);

  const handleWindowButton = useCallback(
    (id: string) => {
      setStartOpen(false);
      const win = windows.find((w) => w.id === id);
      if (!win) return;
      if (win.minimized || win.id !== activeId) openWin(win.id as WinId);
      else minimizeWin(win.id as WinId);
    },
    [windows, activeId, openWin, minimizeWin]
  );

  const handleLaunch = useCallback(
    (id: string) => {
      setStartOpen(false);
      if (id in APP_META) openWin(id as WinId);
      else if (icons.some((x) => x.id === id && x.kind.type === "shortcut")) goLogin();
      else toast("Aplikasi tidak ditemukan.");
    },
    [icons, openWin, goLogin, toast]
  );

  const handleNavigate = useCallback(
    (id: string) => {
      setStartOpen(false);
      if (id in APP_META) openWin(id as WinId);
      else if (BUSINESS_IDS.has(id)) goLogin();
      else if (icons.some((x) => x.id === id && x.kind.type === "shortcut")) goLogin();
      else toast("Item tidak ditemukan.");
    },
    [icons, openWin, goLogin, toast]
  );

  const renderBody = (id: WinId) => {
    switch (id) {
      case "my-computer":
        return <MyComputerApp />;
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
      case "system-properties":
        return <SystemPropertiesApp />;
      case "recycle-bin":
        return (
          <RecycleBinApp
            deleted={deleted}
            onRestore={restoreIcon}
            onEmpty={() => setDeleted([])}
          />
        );
      case "about":
        return <AboutApp onClose={() => closeWin("about")} />;
      case "access-terminal":
        return <AccessTerminalApp onLogin={goLogin} />;
      case "internet-explorer":
        return <InternetExplorerApp />;
      case "control-panel":
        return <ControlPanelApp />;
      case "network-places":
        return <NetworkPlacesApp />;
      case "game-house":
        return <GameHouseApp />;
    }
  };

  const confirmTarget = confirm?.id ? icons.find((x) => x.id === confirm.id) : null;
  const ctxIcon = iconCtx ? icons.find((x) => x.id === iconCtx.id) : null;
  const propsIcon = propsTarget ? icons.find((x) => x.id === propsTarget) : null;

  return (
    <div
      className="winxp-desktop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setStartOpen(false);
        setIconCtx(null);
        setCtx({ x: e.clientX, y: e.clientY });
      }}
    >
      <div className="winxp-wallpaper" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="winxp-wallpaper__img"
          src="/wallpaper-xp.jpg"
          alt=""
          draggable={false}
        />
      </div>

      {/* Interaktif desktop hanya dirender setelah mount di client (server
          hanya render wallpaper) agar tidak ada hydration mismatch (posisi
          icon acak, jam realtime, dll). */}
      {mounted && (
        <>
      {/* Desktop icons */}
      <div
        key={refreshKey}
        className={`winxp-icons ${autoArrange ? "winxp-icons--arrange" : ""}`}
        role="listbox"
        aria-label="Ikon desktop"
        onKeyDown={handleIconsKeyDown}
      >
        {orderedIcons.map((ic, i) => {
          const pos = iconPos[ic.id] ?? gridPos(i);
          const renaming = renameId === ic.id;
          return (
            <div
              key={ic.id}
              ref={(el) => {
                iconRefs.current.set(ic.id, el);
              }}
              role="option"
              tabIndex={0}
              className={`winxp-icon ${iconSize === "small" ? "winxp-icon--small" : ""} ${
                selected === ic.id ? "winxp-icon--selected" : ""
              }`}
              style={autoArrange ? undefined : { left: pos.x, top: pos.y }}
              aria-label={ic.label}
              aria-selected={selected === ic.id}
              title={`${ic.label} - klik dua kali untuk membuka`}
              onPointerDown={(e) => startIconDrag(e, ic.id, i)}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelected(ic.id);
              }}
              onDoubleClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                setSelected(null);
                openIcon(ic.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelected(ic.id);
                setCtx(null);
                setIconCtx({ id: ic.id, x: e.clientX, y: e.clientY });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSelected(null);
                  openIcon(ic.id);
                }
              }}
            >
              <span className="winxp-icon__glyph" aria-hidden>
                <WinXpIcon name={ic.icon} size={iconSize === "small" ? 32 : 48} />
              </span>
              {renaming ? (
                <input
                  className="winxp-icon__rename"
                  defaultValue={ic.label}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") {
                      renameCancel.current = true;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => commitRename(ic.id, e.target.value)}
                  aria-label={`Ganti nama ${ic.label}`}
                />
              ) : (
                <span className="winxp-icon__label">{ic.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Windows */}
      <div className="winxp-windows" onContextMenu={(e) => e.stopPropagation()}>
        {windows.map((win) => {
          const focused = win.z === topZ && !win.minimized;
          return (
            <WindowShell
              key={win.id}
              id={win.id}
              title={APP_META[win.id].title}
              icon={<WinXpIcon name={APP_META[win.id].icon} size={16} />}
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

      {/* Start menu */}
      <div ref={startRef}>
        <StartMenu
          open={startOpen}
          onClose={() => setStartOpen(false)}
          onNavigate={handleNavigate}
          onRun={() => {
            setStartOpen(false);
            setRunOpen(true);
          }}
          onLogOff={() => {
            setStartOpen(false);
            setConfirm({ kind: "logoff" });
          }}
          onTurnOff={() => {
            setStartOpen(false);
            setConfirm({ kind: "turnoff" });
          }}
          userName="Tamu"
        />
      </div>

      {/* Taskbar */}
      <div ref={taskbarRef} className="winxp-taskbar-anchor">
        <Taskbar
          windows={taskbarWindows}
          activeId={activeId}
          startOpen={startOpen}
          onToggleStart={handleToggleStart}
          onWindowButton={handleWindowButton}
          onLaunch={handleLaunch}
        />
      </div>
        </>
      )}

      {/* Desktop context menu */}
      {ctx && (
        <div
          ref={ctxRef}
          className="winxp-menu winxp-menu--ctx"
          role="menu"
          aria-label="Menu konteks desktop"
          style={{ left: Math.min(ctx.x, window.innerWidth - 210), top: Math.min(ctx.y, window.innerHeight - 260) }}
        >
          <MenuItem label="View" icon="folder-open">
            <MenuItem
              label="Large Icons"
              checked={iconSize === "large"}
              onSelect={() => {
                setIconSize("large");
                closeCtx();
              }}
            />
            <MenuItem
              label="Small Icons"
              checked={iconSize === "small"}
              onSelect={() => {
                setIconSize("small");
                closeCtx();
              }}
            />
            <div className="winxp-menu-sep" />
            <MenuItem
              label="Auto Arrange"
              checked={autoArrange}
              onSelect={() => {
                setAutoArrange((v) => !v);
                closeCtx();
              }}
            />
          </MenuItem>
          <MenuItem label="Sort By" icon="file">
            <MenuItem
              label="Name"
              checked={sortBy === "name"}
              onSelect={() => {
                setSortBy("name");
                closeCtx();
              }}
            />
            <MenuItem
              label="Size"
              checked={sortBy === "size"}
              onSelect={() => {
                setSortBy("size");
                closeCtx();
              }}
            />
            <MenuItem
              label="Type"
              checked={sortBy === "type"}
              onSelect={() => {
                setSortBy("type");
                closeCtx();
              }}
            />
            <MenuItem
              label="Modified"
              checked={sortBy === "modified"}
              onSelect={() => {
                setSortBy("modified");
                closeCtx();
              }}
            />
          </MenuItem>
          <div className="winxp-menu-sep" />
          <MenuItem
            label="Refresh"
            icon="search"
            onSelect={() => {
              setRefreshKey((k) => k + 1);
              closeCtx();
            }}
          />
          <MenuItem label="Paste" icon="file" onSelect={() => toast("Tidak ada item")} />
          <MenuItem label="Paste Shortcut" icon="file" onSelect={() => toast("Tidak ada item")} />
          <div className="winxp-menu-sep" />
          <MenuItem label="New" icon="folder">
            <MenuItem label="Folder" icon="folder" onSelect={() => newIcon("folder")} />
            <MenuItem label="Text Document" icon="file" onSelect={() => newIcon("text")} />
            <MenuItem label="Shortcut" icon="run" onSelect={() => newIcon("shortcut")} />
          </MenuItem>
          <div className="winxp-menu-sep" />
          <MenuItem
            label="Properties"
            icon="file"
            onSelect={() => {
              setDesktopProps(true);
              closeCtx();
            }}
          />
        </div>
      )}

      {/* Icon context menu */}
      {iconCtx && ctxIcon && (
        <div
          ref={iconCtxRef}
          className="winxp-menu winxp-menu--ctx"
          role="menu"
          aria-label={`Menu konteks ${ctxIcon.label}`}
          style={{ left: Math.min(iconCtx.x, window.innerWidth - 190), top: Math.min(iconCtx.y, window.innerHeight - 160) }}
        >
          <MenuItem
            label="Open"
            icon={ctxIcon.icon}
            onSelect={() => {
              setIconCtx(null);
              openIcon(iconCtx.id);
            }}
          />
          <MenuItem
            label="Rename"
            icon="file"
            onSelect={() => {
              setRenameId(iconCtx.id);
              setIconCtx(null);
            }}
          />
          <MenuItem
            label="Delete"
            icon="recycle-bin"
            onSelect={() => {
              setIconCtx(null);
              setConfirm({ kind: "delete", id: iconCtx.id });
            }}
          />
          <div className="winxp-menu-sep" />
          <MenuItem
            label="Properties"
            icon="file"
            onSelect={() => {
              setPropsTarget(iconCtx.id);
              setIconCtx(null);
            }}
          />
        </div>
      )}

      {/* Run dialog */}
      {runOpen && (
        <div className="winxp-overlay" onMouseDown={(e) => e.stopPropagation()}>
          <div className="winxp-dialog winxp-dialog--run" role="dialog" aria-modal="true" aria-label="Run">
            <div className="winxp-dialog__title">
              <span aria-hidden>
                <WinXpIcon name="run" size={16} />
              </span>
              Run
            </div>
            <div className="winxp-dialog__body">
              <div className="winxp-run__row">
                <span aria-hidden>
                  <WinXpIcon name="run" size={28} />
                </span>
                <p>
                  Ketik nama program, folder, dokumen, atau sumber Internet, lalu Windows akan
                  membukanya untuk Anda.
                </p>
              </div>
              <div className="winxp-run__field">
                <label htmlFor="xp-run-input">Open:</label>
                <input
                  id="xp-run-input"
                  ref={runInput}
                  type="text"
                  defaultValue="cmd"
                  aria-label="Perintah yang akan dijalankan"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doRun();
                    if (e.key === "Escape") setRunOpen(false);
                  }}
                />
              </div>
              <div className="winxp-dialog__actions">
                <button type="button" className="winxp-btn" onClick={doRun}>
                  OK
                </button>
                <button type="button" className="winxp-btn" onClick={() => setRunOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog (delete / logoff / turnoff) */}
      {confirm && (
        <XpDialog
          title={confirm.kind === "delete" ? "Confirm File Delete" : "Shut Down Windows"}
          icon={confirm.kind === "delete" ? "recycle-bin" : "shutdown"}
          okLabel={confirm.kind === "delete" ? "Yes" : "OK"}
          onOk={() => {
            const kind = confirm.kind;
            const id = confirm.id;
            setConfirm(null);
            if (kind === "delete") {
              const item = id ? icons.find((x) => x.id === id) : null;
              if (item) {
                setDeleted((prev) => [...prev, item]);
                setIcons((prev) => prev.filter((x) => x.id !== id));
              }
              toast(`${confirmTarget?.label ?? "Item"} dipindahkan ke Recycle Bin.`);
            } else {
              toast(kind === "logoff" ? "Sesi ditutup. Sampai jumpa." : "Windows sedang dimatikan...");
              setTimeout(() => goLoginReplace(), 700);
            }
          }}
          onCancel={() => setConfirm(null)}
        >
          {confirm.kind === "delete" ? (
            <p>
              Apakah Anda yakin ingin menghapus {`"${confirmTarget?.label ?? "item ini"}"`} dari
              desktop?
            </p>
          ) : confirm.kind === "logoff" ? (
            <p>Apakah Anda yakin ingin log off?</p>
          ) : (
            <p>Apakah Anda yakin ingin mematikan komputer?</p>
          )}
        </XpDialog>
      )}

      {/* Icon properties dialog */}
      {propsIcon && (
        <XpDialog
          title={`${propsIcon.label} Properties`}
          icon={propsIcon.icon}
          onOk={() => setPropsTarget(null)}
          onCancel={() => setPropsTarget(null)}
        >
          <div className="winxp-props">
            <span className="winxp-props__icon" aria-hidden>
              <WinXpIcon name={propsIcon.icon} size={40} />
            </span>
            <div className="winxp-props__rows">
              <p>
                <strong>{propsIcon.label}</strong>
              </p>
              <p>Type: {iconType(propsIcon)}</p>
              <p>Location: Desktop</p>
              <p>Size: {iconMeta(propsIcon).size} bytes</p>
              <p>Modified: {iconMeta(propsIcon).mod.toLocaleDateString("id-ID")}</p>
            </div>
          </div>
        </XpDialog>
      )}

      {/* Desktop properties dialog */}
      {desktopProps && (
        <XpDialog
          title="Display Properties"
          icon="control-panel"
          onOk={() => setDesktopProps(false)}
          onCancel={() => setDesktopProps(false)}
        >
          <div className="winxp-props">
            <span className="winxp-props__icon" aria-hidden>
              <WinXpIcon name="control-panel" size={40} />
            </span>
            <div className="winxp-props__rows">
              <p>Theme: Windows XP (Luna)</p>
              <p>Wallpaper: Bliss</p>
              <p>Screen resolution: 1024 x 768 pixels</p>
              <p>Font: Tahoma 11px</p>
              <p>GAS ELECTRONIC Engineering Production System</p>
            </div>
          </div>
        </XpDialog>
      )}

      {/* Toasts */}
      <div className="winxp-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="winxp-toast">
            {t.msg}
          </div>
        ))}
      </div>

      {/* Glitch flash */}
      {glitchKey > 0 && <div key={glitchKey} className="winxp-glitch" aria-hidden />}

      {/* BSOD */}
      {bsod && (
        <div className="winxp-bsod" role="alert" aria-label="Layar biru" onClick={() => setBsod(false)}>
          <div className="winxp-bsod__main">
            {`A fatal exception 0E has occurred at 0028:C0001E7F in VXD THEWORLD(01) + 00000F30.
The current application will be terminated.`}
          </div>
          <div className="winxp-bsod__msg">* THE WORLD is nostalgic.</div>
          <div className="winxp-bsod__hint">Press any key to continue</div>
        </div>
      )}

      {/* Boot overlay */}
      {!booted && (
        <div
          className={`winxp-boot ${fading ? "winxp-boot--fade" : ""}`}
          role="dialog"
          aria-label="Boot GE-XP"
          onClick={() => finishBoot(true)}
        >
          <div className="winxp-boot__logo" onClick={onLogoClick} title="GAS ELECTRONIC">
            GAS ELECTRONIC
          </div>
          <div className="winxp-boot__sub">Engineering Production System - Windows XP Edition</div>
          <div className="winxp-boot__track" aria-hidden>
            <div className="winxp-boot__bar" />
          </div>
          <div className="winxp-boot__status" role="status" aria-live="polite">
            {bootStatus}
          </div>
          <div className="winxp-boot__hint">klik untuk melewati boot...</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   XP context menu item (submenu hover-open, checkmarks, icons).
   ============================================================ */
function MenuItem({
  label,
  icon,
  checked,
  onSelect,
  children,
}: {
  label: string;
  icon?: WinXpIconName;
  checked?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
}): ReactNode {
  const [open, setOpen] = useState(false);

  if (children) {
    return (
      <div
        className={`winxp-menu-item winxp-menu-item--sub ${open ? "winxp-menu-item--open" : ""}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button type="button" role="menuitem" aria-haspopup="menu" onClick={() => setOpen((v) => !v)}>
          <span className="winxp-menu-item__icon" aria-hidden>
            {icon ? <WinXpIcon name={icon} size={16} /> : null}
          </span>
          <span className="winxp-menu-item__label">{label}</span>
          <span className="winxp-menu-item__arrow" aria-hidden />
        </button>
        {open && <div className="winxp-menu winxp-menu--sub" role="menu">{children}</div>}
      </div>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      className="winxp-menu-item"
      onClick={onSelect}
    >
      <span className="winxp-menu-item__icon" aria-hidden>
        {icon ? <WinXpIcon name={icon} size={16} /> : null}
      </span>
      <span className="winxp-menu-item__label">{label}</span>
      <span className="winxp-menu-item__check" aria-hidden>
        {checked ? <span className="winxp-menu-item__checkmark" /> : null}
      </span>
    </button>
  );
}

/* ============================================================
   XP-style inline modal dialog (bevel, title gradient, OK/Cancel).
   ============================================================ */
function XpDialog({
  title,
  icon,
  okLabel = "OK",
  onOk,
  onCancel,
  children,
}: {
  title: string;
  icon: WinXpIconName;
  okLabel?: string;
  onOk: () => void;
  onCancel: () => void;
  children: ReactNode;
}): ReactNode {
  const dlgRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef(onCancel);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const dlg = dlgRef.current;
    if (!dlg) return;
    const btns = Array.from(dlg.querySelectorAll<HTMLButtonElement>("button"));
    btns[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        cancelRef.current();
        return;
      }
      if (e.key !== "Tab" || btns.length === 0) return;
      const first = btns[0];
      const last = btns[btns.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dlg.addEventListener("keydown", onKey);
    return () => dlg.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="winxp-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div ref={dlgRef} className="winxp-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="winxp-dialog__title">
          <span aria-hidden>
            <WinXpIcon name={icon} size={16} />
          </span>
          {title}
        </div>
        <div className="winxp-dialog__body">
          <div className="winxp-dialog__content">{children}</div>
          <div className="winxp-dialog__actions">
            <button type="button" className="winxp-btn" onClick={onOk}>
              {okLabel}
            </button>
            <button type="button" className="winxp-btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
