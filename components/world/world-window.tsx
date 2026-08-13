"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type WindowPos = { x: number; y: number; w: number; h: number };

type Props = {
  id: string;
  title: string;
  icon: string;
  pos: WindowPos;
  focused: boolean;
  closing: boolean;
  minimized?: boolean;
  terminal?: boolean;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  children: ReactNode;
};

// Jendela terapung: bisa diseret (drag titlebar), fokus saat diklik, tutup
// dengan animasi. Posisi awal via prop (dihitung orkestrator agar tidak
// bertumpuk). Drag memakai pointer events + transform? — posisi absolut px
// supaya konsisten dengan stacking di desktop.
export default function WorldWindow({ title, icon, pos, focused, closing, minimized, terminal, onFocus, onMinimize, onClose, children }: Props) {
  const [xy, setXY] = useState({ x: pos.x, y: pos.y });
  const [size] = useState({ w: pos.w, h: pos.h });
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      setXY({
        x: Math.min(Math.max(4, e.clientX - drag.current.dx), window.innerWidth - 80),
        y: Math.min(Math.max(4, e.clientY - drag.current.dy), window.innerHeight - 60),
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

  return (
    <div
      className={`world-window ${terminal ? "world-window--terminal" : ""} ${focused ? "world-window--focused" : ""} ${
        closing ? "world-window--close" : "world-window--open"
      }`}
      style={{
        left: xy.x,
        top: xy.y,
        width: size.w,
        height: size.h,
        display: minimized ? "none" : undefined,
      }}
      onPointerDown={onFocus}
      role="dialog"
      aria-label={title}
    >
      <div
        className="world-window__titlebar"
        onPointerDown={(e) => {
          drag.current = { dx: e.clientX - xy.x, dy: e.clientY - xy.y };
        }}
      >
        <span className="world-window__glyph" aria-hidden>
          {icon}
        </span>
        <span className="world-window__title">{title}</span>
        <button
          type="button"
          className="world-window__btn"
          aria-label={`Minimalkan ${title}`}
          onClick={onMinimize}
        >
          –
        </button>
        <button
          type="button"
          className="world-window__btn world-window__btn--close"
          aria-label={`Tutup ${title}`}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <div className="world-window__body">{children}</div>
    </div>
  );
}
