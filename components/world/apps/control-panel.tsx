"use client";

import { useEffect, useState, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "../winxp-icons";
import "../../../app/winxp-apps.css";

type AppletKey = "add-remove" | "date-time" | "display" | "network" | "system" | "users";

const APPLETS: { id: AppletKey; label: string; icon: WinXpIconName }[] = [
  { id: "add-remove", label: "Add or Remove Programs", icon: "document-center" },
  { id: "date-time", label: "Date and Time", icon: "calculator" },
  { id: "display", label: "Display", icon: "control-panel" },
  { id: "network", label: "Network Connections", icon: "network-places" },
  { id: "system", label: "System", icon: "my-computer" },
  { id: "users", label: "Users", icon: "shared-documents" },
];

const TITLES: Record<AppletKey, string> = {
  "add-remove": "Add or Remove Programs",
  "date-time": "Date and Time",
  display: "Display Properties",
  network: "Network Connections",
  system: "System Properties",
  users: "User Accounts",
};

export function ControlPanelApp(): ReactNode {
  const [open, setOpen] = useState<AppletKey | null>(null);
  const [selected, setSelected] = useState<AppletKey | null>(null);

  return (
    <div className="xpa-app" onMouseDown={() => setSelected(null)}>
      <div className="xpa-pane">
        <div className="xpa-cp__grid">
          {APPLETS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`xpa-cp__applet ${selected === a.id ? "xpa-cp__applet--selected" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelected(a.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setOpen(a.id);
              }}
            >
              <WinXpIcon name={a.icon} size={40} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="xpa-status">
        <span className="xpa-status__cell">{APPLETS.length} object(s)</span>
        <span className="xpa-status__cell xpa-status__cell--right">Control Panel</span>
      </div>
      {open && (
        <div
          className="xpa-dialog"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(null);
          }}
        >
          <div className="xpa-dialog__box" role="dialog" aria-modal="true" aria-label={TITLES[open]}>
            <div className="xpa-dialog__title">
              <WinXpIcon name={APPLETS.find((a) => a.id === open)?.icon ?? "control-panel"} size={16} />
              {TITLES[open]}
            </div>
            <div className="xpa-dialog__body">{renderApplet(open, () => setOpen(null))}</div>
            <div className="xpa-dialog__actions">
              <button type="button" className="xpa-btn" onClick={() => setOpen(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderApplet(key: AppletKey, close: () => void): ReactNode {
  switch (key) {
    case "date-time":
      return <DateTimeApplet />;
    case "display":
      return <DisplayApplet close={close} />;
    case "system":
      return <SystemApplet />;
    case "add-remove":
      return <ProgramsApplet />;
    case "network":
      return <NetworkApplet />;
    case "users":
      return <UsersApplet />;
    default:
      return null;
  }
}

function DateTimeApplet(): ReactNode {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <div className="xpa-cp__clock">{now.toLocaleTimeString("id-ID")}</div>
      <div className="xpa-cp__date">{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <p className="xpa-cp__ok">Zona waktu: Asia/Jakarta (WIB).</p>
    </>
  );
}

const RESOLUTIONS = ["800 x 600", "1024 x 768", "1280 x 1024"];

function DisplayApplet({ close }: { close: () => void }): ReactNode {
  const [res, setRes] = useState("1024 x 768");
  const [applied, setApplied] = useState(false);
  return (
    <div className="xpa-cp__form">
      <div className="xpa-cp__row">
        <span className="xpa-cp__label">Resolusi layar:</span>
        <select
          className="xpa-field"
          value={res}
          onChange={(e) => {
            setRes(e.target.value);
            setApplied(false);
          }}
          aria-label="Resolusi layar"
        >
          {RESOLUTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div className="xpa-cp__row">
        <span className="xpa-cp__label">Kualitas warna:</span>
        <span>True Color (32 bit)</span>
      </div>
      {applied && <p className="xpa-cp__ok">Pengaturan diterapkan: {res}.</p>}
      <div className="xpa-dialog__actions">
        <button
          type="button"
          className="xpa-btn"
          onClick={() => {
            setApplied(true);
            setTimeout(close, 900);
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function SystemApplet(): ReactNode {
  const rows: [string, string][] = [
    ["Sistem:", "Microsoft Windows XP Professional"],
    ["Edisi:", "GAS ELECTRONIC Edition"],
    ["Versi:", "2002, Service Pack 2"],
    ["Produsen:", "PT GAS ELECTRONIC"],
    ["Komputer:", "EPS-WORKSTATION-01"],
    ["CPU:", "Intel Pentium IV 2.4 GHz"],
    ["Memori:", "512 MB RAM"],
  ];
  return (
    <div className="xpa-cp__form">
      {rows.map(([k, v]) => (
        <div className="xpa-cp__row" key={k}>
          <span className="xpa-cp__label">{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

const PROGRAMS = [
  "GAS EPS Console 1.0",
  "IE Simulator 6.0",
  "Minesweeper (Game House)",
  "Notepad (sistem)",
];

function ProgramsApplet(): ReactNode {
  const [removed, setRemoved] = useState<string[]>([]);
  return (
    <div className="xpa-cp__form">
      <p className="xpa-cp__muted">Program berikut terpasang di komputer ini:</p>
      {PROGRAMS.filter((p) => !removed.includes(p)).map((p) => (
        <div className="xpa-cp__row" key={p}>
          <span>{p}</span>
          <button type="button" className="xpa-btn" onClick={() => setRemoved((r) => [...r, p])}>
            Remove
          </button>
        </div>
      ))}
      {removed.length > 0 && <p className="xpa-cp__ok">{removed.length} program ditandai untuk dihapus (simulasi).</p>}
    </div>
  );
}

const CONNECTIONS = [
  { name: "Local Area Connection", status: "Connected", speed: "100 Mbps" },
  { name: "Wireless Network (EPS-WIFI)", status: "Connected", speed: "54 Mbps" },
  { name: "Dial-up ke Pabrik Lama", status: "Disconnected", speed: "-" },
];

function NetworkApplet(): ReactNode {
  return (
    <div className="xpa-cp__form">
      {CONNECTIONS.map((c) => (
        <div className="xpa-cp__row" key={c.name}>
          <span>{c.name}</span>
          <span className={c.status === "Connected" ? "xpa-cp__ok" : "xpa-cp__muted"}>
            {c.status} ({c.speed})
          </span>
        </div>
      ))}
      <p className="xpa-cp__muted">Klik koneksi untuk detail (tidak tersedia di simulasi).</p>
    </div>
  );
}

const USERS = [
  { name: "Administrator", role: "Komputer administrator", used: 62 },
  { name: "Operator Lini 1", role: "Pengguna terbatas", used: 34 },
  { name: "Tim QA", role: "Pengguna terbatas", used: 41 },
];

function UsersApplet(): ReactNode {
  const [created, setCreated] = useState(false);
  return (
    <div className="xpa-cp__form">
      {USERS.map((u) => (
        <div className="xpa-cp__row" key={u.name}>
          <span>
            <b>{u.name}</b> - {u.role}
          </span>
          <span className="xpa-cp__bar" aria-label={`Kuota ${u.name}`}>
            <span className="xpa-cp__bar-fill" style={{ width: `${u.used}%` }} />
          </span>
        </div>
      ))}
      {created && <p className="xpa-cp__ok">Akun baru berhasil dibuat (simulasi).</p>}
      <div className="xpa-dialog__actions">
        <button type="button" className="xpa-btn" onClick={() => setCreated(true)}>
          Create account
        </button>
      </div>
    </div>
  );
}
