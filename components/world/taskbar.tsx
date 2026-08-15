"use client";

import { useEffect, useState, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "./winxp-icons";

export default function Taskbar({
  windows,
  activeId,
  startOpen,
  onToggleStart,
  onWindowButton,
  onLaunch,
}: {
  windows: { id: string; title: string; minimized: boolean }[];
  activeId: string | null;
  startOpen: boolean;
  onToggleStart: () => void;
  onWindowButton: (id: string) => void;
  onLaunch: (id: string) => void;
}): ReactNode {
  return (
    <div className="xtb-bar" role="toolbar" aria-label="Taskbar">
      <button
        type="button"
        className={`xtb-start ${startOpen ? "xtb-start--open" : ""}`}
        aria-label="Menu Start"
        aria-haspopup="menu"
        aria-expanded={startOpen}
        onClick={onToggleStart}
      >
        <Orb />
        <span className="xtb-start__label">start</span>
      </button>

      <div className="xtb-quick" role="group" aria-label="Quick Launch">
        {(
          [
            ["internet-explorer", "Internet Explorer"],
            ["minesweeper", "Minesweeper"],
            ["calculator", "Calculator"],
            ["my-computer", "My Computer"],
          ] as const
        ).map(([id, title]) => (
          <button
            key={id}
            type="button"
            className="xtb-quick__btn"
            title={title}
            aria-label={`Buka ${title}`}
            onClick={() => onLaunch(id)}
          >
            <WinXpIcon name={id} size={16} />
          </button>
        ))}
      </div>

      <div className="xtb-windows" role="group" aria-label="Jendela terbuka">
        {windows.map((win) => {
          const active = !win.minimized && activeId === win.id;
          return (
            <button
              key={win.id}
              type="button"
              className={`xtb-task ${active ? "xtb-task--active" : ""} ${win.minimized ? "xtb-task--min" : ""}`}
              title={win.title}
              aria-label={`${win.title} - ${win.minimized ? "diminimalkan" : "terbuka"}`}
              onClick={() => onWindowButton(win.id)}
            >
              <span className="xtb-task__icon" aria-hidden>
                <WinXpIcon name={TASK_ICON[win.id] ?? "file"} size={16} />
              </span>
              <span className="xtb-task__label">{win.title}</span>
            </button>
          );
        })}
      </div>

      <div className="xtb-spacer" aria-hidden />

      <div className="xtb-tray" role="group" aria-label="System tray">
        <span className="xtb-tray__icon" title="Local Area Connection (Connected)" aria-hidden>
          <TraySvg kind="lan" />
        </span>
        <span className="xtb-tray__icon" title="Volume" aria-hidden>
          <TraySvg kind="volume" />
        </span>
        <span className="xtb-tray__icon" title="GAS Electronic Security" aria-hidden>
          <TraySvg kind="shield" />
        </span>
        <span className="xtb-tray__sep" aria-hidden />
        <Clock />
      </div>

      <style jsx>{`
        .xtb-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          height: 30px;
          z-index: 9000;
          display: flex;
          align-items: stretch;
          padding: 0 2px;
          background: linear-gradient(to bottom, #3d7abb 0%, #2159a8 10%, #2b63aa 38%, #24569f 82%, #1b3f7d 100%);
          border-top: 1px solid #6ba1d1;
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          user-select: none;
        }

        /* ---- Start button ---- */
        .xtb-start {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          margin-top: 3px;
          padding: 0 13px 0 6px;
          border: none;
          border-radius: 0 9px 9px 0;
          background: linear-gradient(to bottom, #a7d177 0%, #79b545 8%, #4e9a26 45%, #2c7a12 80%, #0e5a04 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), inset 0 -1px 0 rgba(0, 40, 0, 0.55);
          cursor: pointer;
          outline: none;
        }
        .xtb-start:hover {
          filter: brightness(1.08);
        }
        .xtb-start--open {
          filter: brightness(0.92);
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(0, 40, 0, 0.55);
        }
        .xtb-start__label {
          color: #ffffff;
          font-weight: bold;
          font-size: 12px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 1px rgba(0, 40, 0, 0.8);
        }

        /* ---- Quick launch ---- */
        .xtb-quick {
          display: flex;
          align-items: center;
          gap: 1px;
          margin-left: 3px;
          padding-right: 6px;
          border-right: 1px solid rgba(0, 0, 0, 0.35);
          box-shadow: 1px 0 0 rgba(255, 255, 255, 0.18);
        }
        .xtb-quick__btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          outline: none;
        }
        .xtb-quick__btn:hover {
          border-color: #9ec9ec;
          border-radius: 2px;
          background: linear-gradient(to bottom, #4c8ad1, #3167b4);
        }

        /* ---- Window buttons ---- */
        .xtb-windows {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-left: 4px;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }
        .xtb-task {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 22px;
          min-width: 0;
          max-width: 160px;
          flex: 0 1 120px;
          padding: 0 6px;
          border: 1px solid #12396d;
          border-radius: 3px;
          background: linear-gradient(to bottom, #3e82c9 0%, #2f69b5 50%, #2560af 100%);
          color: #dbe9f7;
          font: inherit;
          text-align: left;
          cursor: pointer;
          outline: none;
        }
        .xtb-task:hover {
          filter: brightness(1.12);
        }
        .xtb-task--min {
          background: linear-gradient(to bottom, #6fa8d9 0%, #4f8ccb 50%, #4683c2 100%);
          color: #eaf4fc;
        }
        .xtb-task--active {
          background: linear-gradient(to bottom, #1c4a8e 0%, #1e50a0 50%, #1b4a99 100%);
          color: #ffffff;
          box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.55), inset 0 -1px 0 rgba(255, 255, 255, 0.12);
        }
        .xtb-task__icon {
          flex: none;
          display: flex;
        }
        .xtb-task__label {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
        }

        /* ---- Spacer + tray ---- */
        .xtb-spacer {
          flex: 0 0 8px;
        }
        .xtb-tray {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 0 4px;
          border-left: 1px solid #1a4a8f;
          box-shadow: -1px 0 0 rgba(255, 255, 255, 0.18);
        }
        .xtb-tray__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 22px;
          cursor: default;
        }
        .xtb-tray__sep {
          width: 1px;
          height: 16px;
          margin: 0 2px;
          background: rgba(0, 0, 0, 0.35);
          box-shadow: 1px 0 0 rgba(255, 255, 255, 0.18);
        }
        .xtb-clock {
          display: flex;
          align-items: center;
          height: 22px;
          padding: 0 8px 0 6px;
          border: none;
          background: transparent;
          color: #ffffff;
          font: inherit;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
          cursor: default;
        }
      `}</style>
    </div>
  );
}

const TASK_ICON: Record<string, WinXpIconName> = {
  "my-computer": "my-computer",
  "my-documents": "my-documents",
  notepad: "notepad",
  calculator: "calculator",
  minesweeper: "minesweeper",
  "command-prompt": "command-prompt",
  "recycle-bin": "recycle-bin",
  "internet-explorer": "internet-explorer",
  about: "help",
};

/* ---- Green XP orb (inline SVG, glossy) ---- */
function Orb(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="xtb-orb-g" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#d6f5b0" />
          <stop offset="0.4" stopColor="#79c33f" />
          <stop offset="0.8" stopColor="#2c7a12" />
          <stop offset="1" stopColor="#0c5204" />
        </radialGradient>
        <radialGradient id="xtb-orb-s" cx="0.4" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="9" cy="9" r="8" fill="url(#xtb-orb-g)" stroke="#0a3d04" strokeWidth="1" />
      <path
        d="M3 9 a6 6 0 0 1 12 0"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="6.6" cy="5.6" r="3" fill="url(#xtb-orb-s)" />
    </svg>
  );
}

/* ---- Small system-tray pixel icons ---- */
function TraySvg({ kind }: { kind: "lan" | "volume" | "shield" }): ReactNode {
  if (kind === "lan") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <rect x="1" y="3" width="6" height="5" fill="#ffffff" />
        <rect x="1" y="3" width="6" height="1" fill="#c8e4f8" />
        <rect x="1" y="3" width="1" height="5" fill="#c8e4f8" />
        <rect x="3" y="9" width="2" height="2" fill="#ffffff" />
        <rect x="9" y="5" width="6" height="4" fill="#ffffff" />
        <rect x="9" y="5" width="6" height="1" fill="#c8e4f8" />
        <rect x="9" y="5" width="1" height="4" fill="#c8e4f8" />
        <rect x="10" y="10" width="2" height="2" fill="#ffffff" />
        <rect x="5" y="6" width="4" height="2" fill="#a4d3f0" />
      </svg>
    );
  }
  if (kind === "volume") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
        <rect x="1" y="6" width="3" height="4" fill="#ffffff" />
        <rect x="3" y="5" width="3" height="6" fill="#ffffff" />
        <rect x="5" y="3" width="3" height="10" fill="#ffffff" />
        <rect x="8" y="6" width="1" height="4" fill="#b8d8f4" />
        <rect x="9" y="5" width="1" height="6" fill="#9cc9ec" />
        <rect x="10" y="4" width="1" height="8" fill="#84bbe8" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <rect x="3" y="2" width="10" height="6" fill="#c93d3d" />
      <rect x="3" y="2" width="10" height="1" fill="#e88a8a" />
      <rect x="3" y="2" width="1" height="6" fill="#e88a8a" />
      <rect x="3" y="7" width="10" height="1" fill="#9e2a2a" />
      <rect x="5" y="4" width="6" height="3" fill="#f0c93d" />
      <rect x="6" y="5" width="4" height="2" fill="#0a4d9e" />
      <rect x="3" y="9" width="10" height="1" fill="#e8a33d" />
      <rect x="4" y="10" width="8" height="2" fill="#c93d3d" />
      <rect x="4" y="10" width="8" height="1" fill="#e88a8a" />
      <rect x="4" y="11" width="8" height="1" fill="#9e2a2a" />
    </svg>
  );
}

/* ---- Realtime clock, HH:MM + full date on hover ---- */
function Clock(): ReactNode {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <button
      type="button"
      className="xtb-clock"
      title={date}
      aria-label={`Jam - ${hh}:${mm}. ${date}`}
    >
      {`${hh}:${mm}`}
    </button>
  );
}
