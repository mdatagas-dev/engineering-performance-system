"use client";

import { useState, type ReactNode } from "react";
import WinXpIcon from "../winxp-icons";
import "../../../app/winxp-apps.css";

type Loc = "root" | "workgroup";

const COMPUTERS = [
  { name: "EPS-SRV-01", role: "Server produksi (file & print)", latency: 12 },
  { name: "EPS-SRV-02", role: "Server QA dan database", latency: 18 },
  { name: "SERVER-AREA-1", role: "Server area pengelasan", latency: 24 },
];

const CRUMBS: { loc: Loc; label: string }[] = [
  { loc: "root", label: "My Network Places" },
  { loc: "workgroup", label: "Microsoft Windows Network" },
];

export function NetworkPlacesApp(): ReactNode {
  const [loc, setLoc] = useState<Loc>("root");
  const [selected, setSelected] = useState<string | null>(null);
  const [conn, setConn] = useState<string | null>(null);

  const addr =
    loc === "root"
      ? "My Network Places"
      : "\\\\EPS-WORKGROUP";

  return (
    <div className="xpa-app" onMouseDown={() => setSelected(null)}>
      <div className="xpa-addr">
        <span className="xpa-addr__label">Address</span>
        <input className="xpa-addr__input" value={addr} readOnly spellCheck={false} aria-label="Alamat jaringan" />
        <button type="button" className="xpa-btn xpa-addr__go" onClick={() => setLoc("root")}>
          Go
        </button>
      </div>
      <div className="xpa-crumb">
        {CRUMBS.map((c, i) => (
          <span key={c.loc} style={{ display: "contents" }}>
            {i > 0 && <span className="xpa-crumb__sep" aria-hidden> &gt; </span>}
            <button
              type="button"
              className="xpa-crumb__btn"
              onClick={() => setLoc(c.loc)}
            >
              {c.label}
            </button>
          </span>
        ))}
        {loc === "workgroup" && (
          <>
            <span className="xpa-crumb__sep" aria-hidden>
              {" "}
              &gt;{" "}
            </span>
            <span className="xpa-crumb__current">EPS-WORKGROUP</span>
          </>
        )}
      </div>
      <div className="xpa-pane">
        <div className="xpa-np__list">
          {loc === "root" ? (
            <button
              type="button"
              className={`xpa-np__item ${selected === "EPS-WORKGROUP" ? "xpa-np__item--selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelected("EPS-WORKGROUP");
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setLoc("workgroup");
              }}
            >
              <WinXpIcon name="folder" size={24} />
              <span className="xpa-np__name">EPS-WORKGROUP</span>
              <span className="xpa-np__desc">Grup kerja pabrik</span>
            </button>
          ) : (
            COMPUTERS.map((c) => (
              <button
                key={c.name}
                type="button"
                className={`xpa-np__item ${selected === c.name ? "xpa-np__item--selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(c.name);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setConn(c.name);
                }}
              >
                <WinXpIcon name="my-computer" size={24} />
                <span className="xpa-np__name">{c.name}</span>
                <span className="xpa-np__desc">{c.role}</span>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="xpa-status">
        <span className="xpa-status__cell">{loc === "root" ? 1 : COMPUTERS.length} object(s)</span>
        <span className="xpa-status__cell xpa-status__cell--right">
          {loc === "root" ? "Microsoft Windows Network" : "EPS-WORKGROUP"}
        </span>
      </div>
      {conn && (
        <div
          className="xpa-dialog"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setConn(null);
          }}
        >
          <div className="xpa-dialog__box" role="dialog" aria-modal="true" aria-label={`Terhubung ke ${conn}`}>
            <div className="xpa-dialog__title">
              <WinXpIcon name="network-places" size={16} />
              Terhubung ke {conn}
            </div>
            <div className="xpa-dialog__body">
              <div className="xpa-conn">
                <span className="xpa-conn__icon xpa-np__conn-icon">
                  <WinXpIcon name="my-computer" size={40} />
                </span>
                <div>
                  <div>
                    Status: <span className="xpa-conn__status">OK</span>
                  </div>
                  <div className="xpa-conn__meta">
                    Koneksi ke {conn} berhasil (simulasi).
                  </div>
                </div>
              </div>
              <div className="xpa-conn__meta">
                Latency: {COMPUTERS.find((c) => c.name === conn)?.latency ?? "-"} ms (mock)
                <br />
                Tipe koneksi: LAN 100 Mbps
              </div>
              <div className="xpa-dialog__actions">
                <button type="button" className="xpa-btn" onClick={() => setConn(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .xpa-np__conn-icon,
        :global(.xpa-conn__icon) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          line-height: 0;
          flex: none;
          filter: drop-shadow(1px 1px 0 rgba(0, 0, 0, 0.25));
        }
      `}</style>
    </div>
  );
}
