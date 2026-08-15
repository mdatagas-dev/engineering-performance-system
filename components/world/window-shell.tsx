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
const TASKBAR = 30;
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
      setSize({
        w: Math.max(MIN_W, Math.min(w, vw - x)),
        h: Math.max(MIN_H, Math.min(h, vh - y)),
      });
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
    "xws-window",
    focused ? "xws-window--focused" : "",
    maximized ? "xws-window--maximized" : "",
    minimized ? "xws-window--minimized" : "",
    closing || localClosing ? "xws-window--closing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style: CSSProperties = maximized
    ? { zIndex: z }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h, zIndex: z };

  return (
    <div id={id} className={cls} role="dialog" aria-label={title} style={style} onPointerDown={onFocus}>
      <div
        className="xws-window__titlebar"
        onPointerDown={startMove}
        onDoubleClick={onMaximizeToggle}
      >
        <span className="xws-window__icon" aria-hidden>
          {icon}
        </span>
        <span className="xws-window__title">{title}</span>
        <button
          type="button"
          className="xws-window__btn xws-window__btn--min"
          aria-label="Minimize"
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={() => {
            onFocus();
            onMinimize();
          }}
        >
          <span className="xws-glyph xws-glyph--min" aria-hidden />
        </button>
        <button
          type="button"
          className="xws-window__btn xws-window__btn--max"
          aria-label={maximized ? "Restore" : "Maximize"}
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={() => {
            onFocus();
            onMaximizeToggle();
          }}
        >
          <span
            className={`xws-glyph ${maximized ? "xws-glyph--restore" : "xws-glyph--max"}`}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className="xws-window__btn xws-window__btn--close"
          aria-label="Close"
          onPointerDown={stop}
          onDoubleClick={stop}
          onClick={() => {
            onFocus();
            handleClose();
          }}
        >
          <span className="xws-glyph xws-glyph--close" aria-hidden>
            ×
          </span>
        </button>
      </div>
      <div className="xws-window__body">{children}</div>
      {!maximized &&
        HANDLES.map((h) => (
          <div
            key={h}
            className={`xws-resize-handle xws-resize-handle--${h}`}
            onPointerDown={startResize(h)}
          />
        ))}
      <style jsx>{`
        .xws-window {
          position: absolute;
          display: flex;
          flex-direction: column;
          background: #ece9d8;
          border: 1px solid #7f9db9;
          box-shadow: 0 0 0 1px #0a246a, 2px 2px 2px rgba(0, 0, 0, 0.35);
          font-family: Tahoma, "MS Sans Serif", sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          animation: xws-open 120ms ease-out;
        }

        .xws-window--focused {
          box-shadow: 0 0 0 1px #0a246a, 2px 2px 2px rgba(0, 0, 0, 0.35);
        }

        .xws-window--maximized {
          left: 0 !important;
          top: 0 !important;
          width: 100vw !important;
          height: calc(100vh - 30px) !important;
          border: 1px solid #0a246a;
          box-shadow: none;
        }

        .xws-window--minimized {
          display: none;
        }

        .xws-window--closing {
          animation: xws-close 120ms ease-in forwards;
          pointer-events: none;
        }

        @keyframes xws-open {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes xws-close {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .xws-window__titlebar {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 26px;
          padding: 0 3px;
          flex: none;
          touch-action: none;
          cursor: default;
          border: 1px solid;
          border-color: #7f9db9 #0a246a #0a246a #0a246a;
          border-radius: 3px 3px 0 0;
          border-bottom-width: 0;
          background: linear-gradient(90deg, #d5dae5, #b9c3da);
          background-image: linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)),
            linear-gradient(90deg, #d5dae5, #b9c3da);
          background-size: 100% 50%, 100% 100%;
          background-repeat: no-repeat;
          box-shadow: inset 0 -1px 0 #0a246a;
          color: #6d6d6d;
          font-weight: 700;
        }

        .xws-window--focused .xws-window__titlebar {
          color: #fff;
          background-image: linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.45)),
            linear-gradient(90deg, #3f8ee8, #245edb 55%, #0a246a);
          background-size: 100% 50%, 100% 100%;
          background-repeat: no-repeat;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 -1px 0 #0a246a;
        }

        .xws-window__icon {
          width: 16px;
          height: 16px;
          flex: none;
          margin: 0 3px 0 1px;
          font-size: 12px;
          line-height: 16px;
          text-align: center;
        }

        .xws-window__title {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-left: 2px;
          line-height: 26px;
        }

        .xws-window__btn {
          width: 21px;
          height: 21px;
          flex: none;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-family: Tahoma, "MS Sans Serif", sans-serif;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          color: #000;
          background: #ece9d8;
          border: 1px solid;
          border-color: #fff #aca899 #aca899 #fff;
          cursor: default;
          touch-action: none;
        }

        .xws-window__btn:active {
          border-color: #aca899 #fff #fff #aca899;
        }

        .xws-window__btn:active .xws-glyph {
          transform: translate(1px, 1px);
        }

        .xws-window__btn:focus-visible {
          outline: 1px dashed #000;
          outline-offset: 1px;
        }

        .xws-window__btn--close:hover {
          background: #e81123;
          border-color: #f5b9b9 #9c0006 #9c0006 #f5b9b9;
        }

        .xws-window__btn--close:hover .xws-glyph--close {
          color: #fff;
        }

        .xws-glyph {
          display: block;
          box-sizing: border-box;
        }

        .xws-glyph--min {
          width: 9px;
          height: 2px;
          background: #000;
          border: 1px solid #fff;
          border-top-color: transparent;
          border-left-color: transparent;
        }

        .xws-glyph--max {
          width: 9px;
          height: 9px;
          border: 1px solid #fff;
          border-bottom-color: #000;
          border-right-color: #000;
        }

        .xws-glyph--restore {
          position: relative;
          width: 11px;
          height: 11px;
        }

        .xws-glyph--restore::before {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          width: 7px;
          height: 7px;
          box-sizing: border-box;
          background: #ece9d8;
          border: 1px solid;
          border-color: #000 #000 #fff #fff;
        }

        .xws-glyph--restore::after {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 7px;
          height: 7px;
          box-sizing: border-box;
          background: #ece9d8;
          border: 1px solid;
          border-color: #fff #fff #000 #000;
        }

        .xws-glyph--close {
          color: #000;
          font-size: 12px;
        }

        .xws-window__body {
          flex: 1;
          overflow: auto;
          margin: 4px 3px 3px;
          background: #ece9d8;
          border: 1px solid;
          border-color: #aca899 #fff #fff #aca899;
        }

        .xws-window__body::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }

        .xws-window__body::-webkit-scrollbar-track {
          background: #ece9d8;
          border: 1px solid;
          border-top-color: #aca899;
          border-left-color: #aca899;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }

        .xws-window__body::-webkit-scrollbar-thumb {
          background: #ece9d8;
          border: 1px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #aca899;
          border-right-color: #aca899;
          box-shadow: 1px 1px 0 #aca899;
        }

        .xws-window__body::-webkit-scrollbar-button {
          display: none;
        }

        .xws-window__body {
          scrollbar-width: thin;
          scrollbar-color: #aca899 #ece9d8;
        }

        .xws-resize-handle {
          position: absolute;
          z-index: 10;
          touch-action: none;
        }

        .xws-resize-handle--n {
          top: 0;
          left: 6px;
          right: 6px;
          height: 6px;
          cursor: n-resize;
        }

        .xws-resize-handle--s {
          bottom: 0;
          left: 6px;
          right: 6px;
          height: 6px;
          cursor: s-resize;
        }

        .xws-resize-handle--e {
          right: 0;
          top: 6px;
          bottom: 6px;
          width: 6px;
          cursor: e-resize;
        }

        .xws-resize-handle--w {
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 6px;
          cursor: w-resize;
        }

        .xws-resize-handle--ne {
          top: 0;
          right: 0;
          width: 8px;
          height: 8px;
          cursor: ne-resize;
        }

        .xws-resize-handle--nw {
          top: 0;
          left: 0;
          width: 8px;
          height: 8px;
          cursor: nw-resize;
        }

        .xws-resize-handle--se {
          bottom: 0;
          right: 0;
          width: 8px;
          height: 8px;
          cursor: se-resize;
        }

        .xws-resize-handle--sw {
          bottom: 0;
          left: 0;
          width: 8px;
          height: 8px;
          cursor: sw-resize;
        }

        @media (max-width: 639px) {
          .xws-window {
            left: 2px !important;
            top: 2px !important;
            width: calc(100vw - 4px) !important;
            height: calc(100vh - 30px) !important;
          }

          .xws-window--maximized {
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: calc(100vh - 30px) !important;
          }

          .xws-resize-handle {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .xws-window,
          .xws-window--closing {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
