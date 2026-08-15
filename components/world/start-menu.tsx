"use client";

import { useState, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "./winxp-icons";

type Item = {
  label: string;
  icon: WinXpIconName;
  id?: string;
  disabled?: boolean;
  onPick?: () => void;
};

export default function StartMenu({
  open,
  onClose,
  onNavigate,
  onRun,
  onLogOff,
  onTurnOff,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onRun: () => void;
  onLogOff: () => void;
  onTurnOff: () => void;
  userName?: string;
}): ReactNode | null {
  const [progsOpen, setProgsOpen] = useState(false);

  if (!open) return null;

  const go = (id: string) => {
    onNavigate(id);
    onClose();
  };

  const rightColumn: Item[] = [
    { label: "My Documents", icon: "my-documents", id: "my-documents" },
    { label: "My Recent Documents", icon: "file", disabled: true },
    { label: "My Pictures", icon: "file", disabled: true },
    { label: "My Music", icon: "file", disabled: true },
    { label: "My Computer", icon: "my-computer", id: "my-computer" },
    { label: "Control Panel", icon: "control-panel", id: "control-panel" },
    { label: "Set Program Access and Defaults", icon: "file", disabled: true },
    { label: "Printers and Faxes", icon: "file", disabled: true },
    { label: "Help and Support", icon: "help", id: "about" },
  ];

  const progGroups: { header: string; items: Item[] }[] = [
    {
      header: "Accessories",
      items: [
        { label: "Notepad", icon: "notepad", id: "notepad" },
        { label: "Calculator", icon: "calculator", id: "calculator" },
        { label: "Command Prompt", icon: "command-prompt", id: "command-prompt" },
        { label: "Paint", icon: "file", disabled: true },
      ],
    },
    {
      header: "Games",
      items: [
        { label: "Minesweeper", icon: "minesweeper", id: "minesweeper" },
        { label: "Game House", icon: "game-house", id: "game-house" },
      ],
    },
    {
      header: "GAS Electronic",
      items: [
        { label: "GAS Electronic PMS", icon: "gas-pms", id: "gas-pms" },
        { label: "Document Center", icon: "document-center", id: "document-center" },
        { label: "Production", icon: "production", id: "production" },
        { label: "Quality", icon: "quality", id: "quality" },
        { label: "Engineering", icon: "engineering", id: "engineering" },
        { label: "Maintenance", icon: "maintenance", id: "maintenance" },
      ],
    },
  ];

  const initial = (userName ?? "User").trim().charAt(0).toUpperCase() || "U";
  const name = userName ?? "User";

  return (
    <div className="xsm-menu" role="menu" aria-label="Menu Start">
      <div className="xsm-banner">
        <span className="xsm-avatar" aria-hidden>
          {initial}
        </span>
        <span className="xsm-banner__name">{name}</span>
      </div>

      <div className="xsm-body">
        <div className="xsm-col xsm-col--left" role="group" aria-label="Pin">
          <button type="button" role="menuitem" className="xsm-pin" onClick={() => go("internet-explorer")}>
            <span className="xsm-pin__icon" aria-hidden>
              <WinXpIcon name="internet-explorer" size={32} />
            </span>
            <span className="xsm-pin__text">
              <span className="xsm-pin__label">Internet Explorer</span>
              <span className="xsm-pin__sub">Internet</span>
            </span>
          </button>
          <button type="button" role="menuitem" className="xsm-pin" onClick={() => go("internet-explorer")}>
            <span className="xsm-pin__icon" aria-hidden>
              <WinXpIcon name="internet-explorer" size={32} />
            </span>
            <span className="xsm-pin__text">
              <span className="xsm-pin__label">Outlook Express</span>
              <span className="xsm-pin__sub">E-mail</span>
            </span>
          </button>
        </div>

        <div className="xsm-col xsm-col--right" role="group" aria-label="Item menu">
          {rightColumn.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`xsm-item ${item.disabled ? "xsm-item--disabled" : ""}`}
              disabled={item.disabled}
              onClick={() => item.id && go(item.id)}
            >
              <span className="xsm-item__icon" aria-hidden>
                <WinXpIcon name={item.icon} size={16} />
              </span>
              <span className="xsm-item__label">{item.label}</span>
            </button>
          ))}
          <div className="xsm-sep" aria-hidden />
          <button
            type="button"
            role="menuitem"
            className="xsm-item xsm-item--disabled"
            disabled
          >
            <span className="xsm-item__icon" aria-hidden>
              <WinXpIcon name="search" size={16} />
            </span>
            <span className="xsm-item__label">Search</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="xsm-item"
            onClick={() => {
              onRun();
              onClose();
            }}
          >
            <span className="xsm-item__icon" aria-hidden>
              <WinXpIcon name="run" size={16} />
            </span>
            <span className="xsm-item__label">Run...</span>
          </button>
        </div>
      </div>

      <div className="xsm-footer">
        <div className="xsm-allprog" onMouseEnter={() => setProgsOpen(true)} onMouseLeave={() => setProgsOpen(false)}>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={progsOpen}
            className={`xsm-allprog__btn ${progsOpen ? "xsm-allprog__btn--open" : ""}`}
            onClick={() => setProgsOpen((v) => !v)}
          >
            <span className="xsm-allprog__icon" aria-hidden>
              <WinXpIcon name="folder-open" size={16} />
            </span>
            <span className="xsm-allprog__label">All Programs</span>
            <span className="xsm-allprog__arrow" aria-hidden>
              &gt;
            </span>
          </button>

          {progsOpen && (
            <div className="xsm-programs" role="menu" aria-label="All Programs">
              {progGroups.map((g) => (
                <div key={g.header}>
                  <div className="xsm-prog-header" aria-hidden>
                    {g.header}
                  </div>
                  {g.items.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      className={`xsm-item ${item.disabled ? "xsm-item--disabled" : ""}`}
                      disabled={item.disabled}
                      onClick={() => item.id && go(item.id)}
                    >
                      <span className="xsm-item__icon" aria-hidden>
                        <WinXpIcon name={item.icon} size={16} />
                      </span>
                      <span className="xsm-item__label">{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
              <button
                type="button"
                role="menuitem"
                className="xsm-item"
                onClick={() => go("internet-explorer")}
              >
                <span className="xsm-item__icon" aria-hidden>
                  <WinXpIcon name="internet-explorer" size={16} />
                </span>
                <span className="xsm-item__label">Internet Explorer</span>
              </button>
            </div>
          )}
        </div>

        <div className="xsm-power">
          <button type="button" className="xsm-power__btn" onClick={onLogOff}>
            <span className="xsm-power__icon" aria-hidden>
              <WinXpIcon name="shutdown" size={16} />
            </span>
            <span className="xsm-power__label">Log Off</span>
          </button>
          <button type="button" className="xsm-power__btn" onClick={onTurnOff}>
            <span className="xsm-power__icon" aria-hidden>
              <WinXpIcon name="shutdown" size={16} />
            </span>
            <span className="xsm-power__label">Turn Off Computer</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .xsm-menu {
          position: fixed;
          left: 0;
          bottom: 30px;
          z-index: 9500;
          width: 428px;
          background: #7db2e8;
          border-radius: 6px 6px 0 0;
          padding: 3px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(0, 30, 70, 0.5),
            inset 1px 0 0 rgba(255, 255, 255, 0.45), inset -1px 0 0 rgba(0, 30, 70, 0.35),
            0 3px 8px rgba(0, 0, 0, 0.5);
          font-family: Tahoma, "Segoe UI", Arial, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
          user-select: none;
        }

        /* ---- User banner ---- */
        .xsm-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 52px;
          padding: 4px 10px;
          background: linear-gradient(to bottom, #0f5aa8 0%, #1a6dbd 60%, #0f5aa8 100%);
          border: 1px solid #0b3d7d;
          border-bottom: none;
          border-radius: 3px 3px 0 0;
        }
        .xsm-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 28%, #ffffff, #cfe0f5 55%, #8fb4e0);
          color: #0f4a94;
          font-size: 17px;
          font-weight: bold;
          box-shadow: inset 0 -2px 3px rgba(0, 30, 70, 0.35), 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        .xsm-banner__name {
          color: #ffffff;
          font-weight: bold;
          font-size: 13px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
        }

        /* ---- Columns ---- */
        .xsm-body {
          display: flex;
          background: #7db2e8;
          padding-top: 2px;
        }
        .xsm-col--left {
          width: 172px;
          flex: none;
          padding: 2px;
        }
        .xsm-col--right {
          flex: 1;
          min-width: 0;
          padding: 2px 2px 4px;
        }

        .xsm-pin {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          height: 46px;
          margin-bottom: 2px;
          padding: 3px 6px;
          border: 1px solid transparent;
          background: transparent;
          text-align: left;
          cursor: pointer;
          outline: none;
        }
        .xsm-pin:hover {
          border-color: #316ac5;
          border-radius: 2px;
          background: #316ac5;
        }
        .xsm-pin__icon {
          flex: none;
        }
        .xsm-pin__text {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .xsm-pin__label {
          font-weight: bold;
          color: #123c72;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .xsm-pin__sub {
          font-size: 10px;
          color: #24557f;
        }
        .xsm-pin:hover .xsm-pin__label,
        .xsm-pin:hover .xsm-pin__sub {
          color: #ffffff;
        }

        .xsm-item {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          height: 22px;
          padding: 0 6px;
          border: 1px solid transparent;
          background: transparent;
          text-align: left;
          cursor: pointer;
          outline: none;
        }
        .xsm-item__icon {
          flex: none;
          display: flex;
        }
        .xsm-item__label {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .xsm-item:hover:not(:disabled) {
          background: #316ac5;
          color: #ffffff;
        }
        .xsm-item:disabled {
          color: #8aa4bd;
          cursor: default;
        }

        .xsm-sep {
          height: 1px;
          margin: 3px 4px;
          background: #4f7fb2;
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.45);
        }

        /* ---- Footer: All Programs + power ---- */
        .xsm-footer {
          display: flex;
          align-items: stretch;
          margin-top: 2px;
          border-top: 1px solid #4f7fb2;
          box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.45);
        }
        .xsm-allprog {
          position: relative;
          flex: 1;
          min-width: 0;
        }
        .xsm-allprog__btn {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          height: 30px;
          padding: 0 8px;
          border: 1px solid transparent;
          background: linear-gradient(to bottom, #b6e17a 0%, #8ccd4a 40%, #5cb02a 100%);
          color: #063b06;
          font-weight: bold;
          text-align: left;
          cursor: pointer;
          outline: none;
        }
        .xsm-allprog__btn:hover,
        .xsm-allprog__btn--open {
          background: linear-gradient(to bottom, #c6ee8e 0%, #9bd95c 40%, #6cc236 100%);
        }
        .xsm-allprog__icon {
          flex: none;
          display: flex;
        }
        .xsm-allprog__label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .xsm-allprog__arrow {
          color: #063b06;
          font-weight: bold;
        }

        .xsm-programs {
          position: absolute;
          left: calc(100% - 3px);
          bottom: 0;
          width: 200px;
          background: #7db2e8;
          border-radius: 4px;
          padding: 3px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 -1px 0 rgba(0, 30, 70, 0.5),
            inset 1px 0 0 rgba(255, 255, 255, 0.45), inset -1px 0 0 rgba(0, 30, 70, 0.35),
            0 3px 8px rgba(0, 0, 0, 0.5);
        }
        .xsm-prog-header {
          padding: 3px 8px 1px;
          color: #123c72;
          font-weight: bold;
        }

        .xsm-power {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px;
        }
        .xsm-power__btn {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 24px;
          padding: 0 9px;
          border: 1px solid #0b3d7d;
          border-radius: 2px;
          background: linear-gradient(to bottom, #f5b63d 0%, #e89a1a 50%, #d97f0e 100%);
          color: #4a2602;
          font-weight: bold;
          cursor: pointer;
          outline: none;
        }
        .xsm-power__btn:hover {
          filter: brightness(1.1);
        }
        .xsm-power__btn:active {
          filter: brightness(0.92);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .xsm-power__icon {
          flex: none;
          display: flex;
        }
      `}</style>
    </div>
  );
}
