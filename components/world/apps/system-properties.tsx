"use client";

import { useEffect, useState, type ReactNode } from "react";

const TABS = ["General", "Performance", "Device Manager"] as const;
type Tab = (typeof TABS)[number];

const DEVICES = ["Computer", "Disk drives", "Display adapters", "Keyboard", "Monitor", "Mouse", "Ports (COM & LPT)"];

export function SystemPropertiesApp(): ReactNode {
  const [tab, setTab] = useState<Tab>("General");
  const [ram, setRam] = useState(0);

  useEffect(() => {
    if (tab !== "General") return;
    const t = setInterval(() => setRam((r) => Math.min(64, r + 4)), 90);
    return () => clearInterval(t);
  }, [tab]);

  return (
    <div className="win95-app win95-sysprops">
      <div className="win95-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`win95-tab ${tab === t ? "win95-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="win95-tabpanel" role="tabpanel">
        {tab === "General" && (
          <div className="win95-sysprops__general">
            <div className="win95-sysprops__icon" aria-hidden>
              <div className="win95-sysprops__screen" />
              <div className="win95-sysprops__stand" />
            </div>
            <div className="win95-sysprops__text">
              <p className="win95-sysprops__name">GAS ELECTRONIC OS</p>
              <p className="win95-sysprops__ver">Version 95.0 (THE WORLD Build)</p>
              <div className="win95-sysprops__line" />
              <p>Registered to:</p>
              <p className="win95-sysprops__bold">GAS ELECTRONIC</p>
              <div className="win95-sysprops__line" />
              <p>
                Computer: <span className="win95-sysprops__bold">GAS-ELECTRONIC-95</span>
              </p>
              <p>
                CPU: <span className="win95-sysprops__bold">Pentium 95 MHz (simulated)</span>
              </p>
              <div className="win95-sysprops__ram-row">
                <span>RAM:</span>
                <div className="win95-sysprops__ram">
                  <div className="win95-sysprops__ram-fill" style={{ width: `${(ram / 64) * 100}%` }} />
                </div>
                <span className="win95-sysprops__ram-text">{ram.toFixed(0)} MB</span>
              </div>
            </div>
          </div>
        )}
        {tab === "Performance" && (
          <div className="win95-sysprops__simple">
            <p>Performance:</p>
            <p className="win95-sysprops__indent">
              Memory: <span className="win95-sysprops__bold">{ram.toFixed(0)}.0 MB of RAM</span>
            </p>
            <div className="win95-sysprops__line" />
            <p>System resources: <span className="win95-sysprops__bold">87% free</span></p>
            <p className="win95-sysprops__dim">Kinerja dunia optimal. Simulasi memakai khayalan murni.</p>
          </div>
        )}
        {tab === "Device Manager" && (
          <div className="win95-sysprops__simple">
            <p>View devices by type:</p>
            <div className="win95-listview win95-listview--compact">
              {DEVICES.map((d) => (
                <div key={d} className="win95-listview__item">
                  <span className="win95-listview__icon">🖥</span>
                  <span className="win95-listview__name">{d}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="win95-sysprops__actions">
        <button type="button" className="win95-btn" onClick={() => undefined}>
          OK
        </button>
      </div>
    </div>
  );
}
