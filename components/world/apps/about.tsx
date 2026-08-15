"use client";

import { useState, type ReactNode } from "react";
import Win95Icon from "../win95-icons";

type Props = { onClose: () => void };

const SYS_INFO = [
  "Computer: GAS-ELECTRONIC-95",
  "CPU: Pentium 95 MHz (simulated)",
  "RAM: 64 MB (khayalan murni)",
  "OS: GAS ELECTRONIC OS Build 1998",
];

export function AboutApp({ onClose }: Props): ReactNode {
  const [info, setInfo] = useState(false);

  return (
    <div className="xpa-ab-app">
      <div className="xpa-ab-main">
        <div className="xpa-ab-icon" aria-hidden>
          <Win95Icon name="about" size={48} />
        </div>
        <div className="xpa-ab-text win95-about__text">
          <p className="xpa-ab-name">GAS ELECTRONIC OS</p>
          <p className="xpa-ab-ver">Version 95.0 (Build 1998)</p>
          <p className="xpa-ab-copy">(c) 1998-2026 GAS ELECTRONIC</p>
          <p className="xpa-ab-line">
            Engineering Production System - THE WORLD. Satu OS yang hidup di
            dalam dunia arsip produksi.
          </p>
          <p className="xpa-ab-dim">
            Kinerja: khayalan murni. Stabilitas: legendaris.
          </p>
        </div>
      </div>
      <div className="xpa-ab-actions">
        <button type="button" className="xpa-ab-btn" onClick={onClose}>
          OK
        </button>
        <button type="button" className="xpa-ab-btn" onClick={() => setInfo(true)}>
          System Info...
        </button>
      </div>
      {info && (
        <div
          className="xpa-ab-dialog"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setInfo(false);
          }}
        >
          <div className="xpa-ab-dialog__box" role="dialog" aria-modal="true" aria-label="System Info">
            <div className="xpa-ab-dialog__title">
              <Win95Icon name="system-info" size={16} />
              System Info
            </div>
            <div className="xpa-ab-dialog__body">
              {SYS_INFO.map((line) => (
                <p key={line} className="xpa-ab-dialog__line">
                  {line}
                </p>
              ))}
            </div>
            <div className="xpa-ab-dialog__actions">
              <button type="button" className="xpa-ab-btn" onClick={() => setInfo(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .xpa-ab-app {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 14px;
          height: 100%;
          padding: 14px 16px;
          box-sizing: border-box;
          background: #ece9d8;
          font-family: Tahoma, Verdana, sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
          overflow: auto;
        }
        .xpa-ab-main {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .xpa-ab-icon {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          padding: 4px;
          border: 1px solid #c7c3b6;
          background: #fff;
        }
        .xpa-ab-text,
        .win95-about__text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          line-height: 1.35;
          color: #000;
          font-family: Tahoma, Verdana, sans-serif;
          font-size: 11px;
        }
        .xpa-ab-text p {
          margin: 0;
        }
        .xpa-ab-name {
          font-size: 13px;
          font-weight: 700;
          color: #0a246a;
        }
        .xpa-ab-ver {
          color: #404040;
        }
        .xpa-ab-copy {
          color: #404040;
        }
        .xpa-ab-line {
          margin-top: 6px !important;
        }
        .xpa-ab-dim {
          color: #404040;
        }
        .xpa-ab-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: auto;
          flex: none;
        }
        .xpa-ab-btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: linear-gradient(180deg, #f2f0e7 0%, #ece9d8 48%, #d9d3c4 100%);
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
          padding: 3px 12px;
          cursor: default;
          min-width: 84px;
        }
        .xpa-ab-btn:hover {
          background: linear-gradient(180deg, #fdf6ee 0%, #f9e0a2 42%, #f0c664 92%, #ecb64b 100%);
        }
        .xpa-ab-btn:active {
          box-shadow: inset 1px 1px #b7b4a8;
          padding: 4px 11px 2px 13px;
        }
        .xpa-ab-dialog {
          position: absolute;
          inset: 0;
          z-index: 50;
          background: rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .xpa-ab-dialog__box {
          width: 340px;
          max-width: 92%;
          background: #ece9d8;
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
        }
        .xpa-ab-dialog__title {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 5px;
          background: linear-gradient(180deg, #3f8ee8 0%, #245edb 45%, #0a246a 100%);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
        }
        .xpa-ab-dialog__body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .xpa-ab-dialog__line {
          margin: 0;
        }
        .xpa-ab-dialog__actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          padding: 0 12px 12px;
        }
      `}</style>
    </div>
  );
}
