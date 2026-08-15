"use client";

import { useEffect, useState, type ReactNode } from "react";
import WinXpIcon from "../winxp-icons";

const TABS = ["General", "Performance", "Device Manager"] as const;
type Tab = (typeof TABS)[number];

const DEVICES = ["Computer", "Disk drives", "Display adapters", "Keyboard", "Monitor", "Mouse", "Ports (COM & LPT)"];

export function SystemPropertiesApp(): ReactNode {
  const [tab, setTab] = useState<Tab>("General");
  const [ram, setRam] = useState(0);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (tab !== "General") return;
    const t = setInterval(() => setRam((r) => Math.min(64, r + 4)), 90);
    return () => clearInterval(t);
  }, [tab]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setApplied(false);
  };

  return (
    <div className="xpa-sys-app">
      <div className="xpa-sys-tabs" role="tablist" aria-label="System Properties">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`xpa-sys-tab ${tab === t ? "xpa-sys-tab--active" : ""}`}
            onClick={() => changeTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="xpa-sys-panel" role="tabpanel">
        {tab === "General" && (
          <div className="xpa-sys-general">
            <div className="xpa-sys-icon" aria-hidden>
              <WinXpIcon name="my-computer" size={48} />
            </div>
            <div className="xpa-sys-text">
              <p className="xpa-sys-name">GAS ELECTRONIC OS</p>
              <p className="xpa-sys-ver">Version 95.0 (THE WORLD Build)</p>
              <div className="xpa-sys-line" />
              <p>Registered to:</p>
              <p className="xpa-sys-bold">GAS ELECTRONIC</p>
              <div className="xpa-sys-line" />
              <p>
                Computer: <span className="xpa-sys-bold">GAS-ELECTRONIC-95</span>
              </p>
              <p>
                CPU: <span className="xpa-sys-bold">Pentium 95 MHz (simulated)</span>
              </p>
              <div className="xpa-sys-ram-row">
                <span>RAM:</span>
                <div className="xpa-sys-ram">
                  <div className="xpa-sys-ram-fill" style={{ width: `${(ram / 64) * 100}%` }} />
                </div>
                <span className="xpa-sys-ram-text">{ram.toFixed(0)} MB</span>
              </div>
            </div>
          </div>
        )}
        {tab === "Performance" && (
          <div className="xpa-sys-simple">
            <p>Performance:</p>
            <p className="xpa-sys-indent">
              Memory: <span className="xpa-sys-bold">{ram.toFixed(0)}.0 MB of RAM</span>
            </p>
            <div className="xpa-sys-line" />
            <p>
              System resources: <span className="xpa-sys-bold">87% free</span>
            </p>
            <p className="xpa-sys-dim">Kinerja dunia optimal. Simulasi memakai khayalan murni.</p>
          </div>
        )}
        {tab === "Device Manager" && (
          <div className="xpa-sys-simple">
            <p>View devices by type:</p>
            <div className="xpa-sys-list">
              {DEVICES.map((d) => (
                <div key={d} className="xpa-sys-list__item">
                  <span className="xpa-sys-list__icon">
                    <WinXpIcon name="my-computer" size={16} />
                  </span>
                  <span className="xpa-sys-list__name">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="xpa-sys-actions">
        <span className={`xpa-sys-msg ${applied ? "xpa-sys-msg--show" : ""}`}>Pengaturan diterapkan.</span>
        <button type="button" className="xpa-sys-btn" onClick={() => setApplied(true)}>
          OK
        </button>
      </div>
      <style jsx>{`
        .xpa-sys-app {
          position: relative;
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #ece9d8;
          font-family: Tahoma, Verdana, sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
          overflow: hidden;
        }
        .xpa-sys-tabs {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          padding: 8px 8px 0;
          background: #ece9d8;
          flex: none;
        }
        .xpa-sys-tab {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: linear-gradient(180deg, #f2f0e7 0%, #ece9d8 48%, #d9d3c4 100%);
          border: 1px solid #c7c3b6;
          border-bottom: none;
          border-radius: 3px 3px 0 0;
          padding: 4px 14px;
          cursor: default;
        }
        .xpa-sys-tab--active {
          background: #ece9d8;
          border-color: #7f9db9;
          font-weight: 700;
          position: relative;
          top: 1px;
          padding-bottom: 6px;
        }
        .xpa-sys-panel {
          flex: 1;
          min-height: 0;
          overflow: auto;
          margin: 0 8px;
          padding: 10px;
          background: #ece9d8;
          border: 1px solid #7f9db9;
          border-top: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
        }
        .xpa-sys-general {
          display: flex;
          gap: 12px;
        }
        .xpa-sys-icon {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          padding: 4px;
          border: 1px solid #c7c3b6;
          background: #fff;
        }
        .xpa-sys-text p {
          margin: 0 0 3px;
        }
        .xpa-sys-name {
          font-size: 13px;
          font-weight: 700;
          color: #0a246a;
        }
        .xpa-sys-ver {
          color: #404040;
        }
        .xpa-sys-line {
          height: 1px;
          background: #c7c3b6;
          margin: 8px 0;
        }
        .xpa-sys-bold {
          font-weight: 700;
        }
        .xpa-sys-ram-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .xpa-sys-ram {
          width: 180px;
          height: 13px;
          background: #fff;
          border: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
          overflow: hidden;
        }
        .xpa-sys-ram-fill {
          height: 100%;
          background: linear-gradient(180deg, #3f8ee8, #0a246a);
        }
        .xpa-sys-ram-text {
          color: #404040;
        }
        .xpa-sys-simple p {
          margin: 0 0 4px;
        }
        .xpa-sys-indent {
          padding-left: 12px;
        }
        .xpa-sys-dim {
          color: #404040;
        }
        .xpa-sys-list {
          margin-top: 6px;
          background: #fff;
          border: 1px solid #7f9db9;
          box-shadow: inset 1px 1px #b2c5db;
        }
        .xpa-sys-list__item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 6px;
          cursor: default;
        }
        .xpa-sys-list__item:hover {
          background: #e9f1fb;
        }
        .xpa-sys-list__icon {
          display: flex;
          align-items: center;
          line-height: 0;
        }
        .xpa-sys-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 8px;
          flex: none;
        }
        .xpa-sys-msg {
          color: #1e6b1e;
          font-weight: 700;
          visibility: hidden;
        }
        .xpa-sys-msg--show {
          visibility: visible;
        }
        .xpa-sys-btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: linear-gradient(180deg, #f2f0e7 0%, #ece9d8 48%, #d9d3c4 100%);
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
          padding: 3px 18px;
          cursor: default;
        }
        .xpa-sys-btn:hover {
          background: linear-gradient(180deg, #fdf6ee 0%, #f9e0a2 42%, #f0c664 92%, #ecb64b 100%);
        }
        .xpa-sys-btn:active {
          box-shadow: inset 1px 1px #b7b4a8;
          padding: 4px 17px 2px 19px;
        }
      `}</style>
    </div>
  );
}
