"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type WinSize = { w: number; h: number };
export type WinPos = { x: number; y: number };

export type WindowShellProps = {
  id: string;
  title: string;
  icon: ReactNode;
  focused: boolean;
  minimized: boolean;
  maximized: boolean;
  closing: boolean;
  z: number;
  initialPos: WinPos;
  initialSize: WinSize;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximizeToggle: () => void;
  onClose: () => void;
  children: ReactNode;
};

const MIN_W = 240;
const MIN_H = 160;
const TASKBAR = 34;
const CLOSE_MS = 120;
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;

type DragState =
  | { kind: "move"; dx: number; dy: number }
  | { kind: "resize"; dir: string; sx: number; sy: number; pos: WinPos; size: WinSize };

export default function WindowShell(props: WindowShellProps) {
  const {
    id,
    title,
    icon,
    focused,
    minimized,
    maximized,
    closing,
    z,
    initialPos,
    initialSize,
    onFocus,
    onMinimize,
    onMaximizeToggle,
    onClose,
    children,
  } = props;

  const [pos, setPos] = useState<WinPos>(initialPos);
  const [size, setSize] = useState<WinSize>(initialSize);
  const [localClosing, setLocalClosing] = useState(false);
  const drag = useRef<DragState | null>(null);
  const prevGeom = useRef<{ pos: WinPos; size: WinSize } | null>(null);
  const wasMaximized = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 640;

  useLayoutEffect(() => {
    if (maximized && !wasMaximized.current) {
      prevGeom.current = { pos, size };
      wasMaximized.current = true;
    } else if (!maximized && wasMaximized.current) {
      if (prevGeom.current) {
        setPos(prevGeom.current.pos);
        setSize(prevGeom.current.size);
      }
      wasMaximized.current = false;
    }
  }, [maximized, pos, size]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight - TASKBAR;
      if (d.kind === "move") {
        setPos({
          x: Math.min(Math.max(0, e.clientX - d.dx), Math.max(0, vw - 24)),
          y: Math.min(Math.max(0, e.clientY - d.dy), Math.max(0, vh - 24)),
        });
        return;
      }
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      let { x, y } = d.pos;
      let w = d.size.w;
      let h = d.size.h;
      if (d.dir.includes("e")) w = d.size.w + dx;
      if (d.dir.includes("s")) h = d.size.h + dy;
      if (d.dir.includes("w")) {
        w = d.size.w - dx;
        x = d.pos.x + dx;
      }
      if (d.dir.includes("n")) {
        h = d.size.h - dy;
        y = d.pos.y + dy;
      }
      w = Math.max(MIN_W, w);
      h = Math.max(MIN_H, h);
      if (d.dir.includes("w")) x = Math.min(Math.max(0, x), d.pos.x + d.size.w - MIN_W);
      if (d.dir.includes("n")) y = Math.min(Math.max(0, y), d.pos.y + d.size.h - MIN_H);
      setPos({ x, y });
      setSize({ w: Math.min(w, vw - x), h: Math.min(h, vh - y) });
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const startMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized || isMobile() || e.button !== 0) return;
    drag.current = { kind: "move", dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const startResize = (dir: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (maximized || isMobile()) return;
    e.preventDefault();
    stop(e);
    drag.current = { kind: "resize", dir, sx: e.clientX, sy: e.clientY, pos, size };
  };

  const handleClose = () => {
    if (closeTimer.current) return;
    setLocalClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onClose();
    }, CLOSE_MS);
  };

  const cls = [
    "win95-window",
    focused ? "win95-window--focused" : "",
    maximized ? "win95-window--maximized" : "",
    minimized ? "win95-window--minimized" : "",
    closing || localClosing ? "win95-window--closing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style: CSSProperties = maximized
    ? { zIndex: z }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: z };

  return (
    <div id={id} className={cls} role="dialog" aria-label={title} style={style} onPointerDown={onFocus}>
      <div
        className="win95-window__titlebar"
        onPointerDown={startMove}
        onDoubleClick={onMaximizeToggle}
      >
        <span className="win95-window__icon" aria-hidden>
          {icon}
        </span>
        <span className="win95-window__title">{title}</span>
        <button
          type="button"
          className="win95-window__btn win95-window__btn--min"
          aria-label="Minimize"
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={onMinimize}
        >
          _
        </button>
        <button
          type="button"
          className="win95-window__btn win95-window__btn--max"
          aria-label="Maximize"
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={onMaximizeToggle}
        >
          ▢
        </button>
        <button
          type="button"
          className="win95-window__btn win95-window__btn--close"
          aria-label="Close"
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={handleClose}
        >
          ✕
        </button>
      </div>
      <div className="win95-window__body">{children}</div>
      {!maximized &&
        HANDLES.map((h) => (
          <div
            key={h}
            className={`win95-resize-handle win95-resize-handle--${h}`}
            onPointerDown={startResize(h)}
          />
        ))}
    </div>
  );
}
