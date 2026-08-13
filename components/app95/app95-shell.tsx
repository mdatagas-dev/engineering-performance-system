"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type App95MenuItem = { label: string; items?: string[] };
export type App95ToolbarBtn = { label: string; icon?: string; action?: () => void };
export type App95NavItem = { id: string; label: string; icon?: string; active?: boolean; onClick?: () => void };
export type App95StatusItem = { label: string; value: string };

const DEMO = "Fitur dalam mode demo.";
const TOAST_MS = 2600;
const BOOT_MS = 2000;

const defaultMenu: App95MenuItem[] = [
  { label: "File", items: ["Baru", "Buka", "Simpan", "Cetak", "Keluar"] },
  { label: "Edit", items: ["Salin", "Tempel", "Hapus"] },
  { label: "View", items: ["Sidebar", "Toolbar", "Status Bar"] },
  { label: "Help", items: ["Tentang Aplikasi", "Panduan"] },
];

const defaultToolbar = (onLogout?: () => void): App95ToolbarBtn[] => [
  { label: "Folder Baru", icon: "folder" },
  { label: "Cetak", icon: "file" },
  { label: "Keluar", icon: "key", action: onLogout },
];

const defaultNav: App95NavItem[] = [
  { id: "home", label: "Beranda", icon: "app", active: true },
  { id: "documents", label: "Dokumen", icon: "file" },
  { id: "archive", label: "Arsip", icon: "folder" },
  { id: "settings", label: "Pengaturan", icon: "gear" },
];

const defaultStatus: App95StatusItem[] = [{ label: "Siap", value: "Aplikasi berjalan" }];

function Glyph({ name, size = 16 }: { name: string; size?: number }): ReactNode {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    shapeRendering: "crispEdges",
    "aria-hidden": true,
    focusable: false,
  } as const;
  switch (name) {
    case "folder":
      return (
        <svg {...svgProps}>
          <rect x="1" y="3" width="14" height="11" fill="#808080" />
          <rect x="0" y="2" width="9" height="3" fill="#e8b800" />
          <rect x="0" y="5" width="14" height="9" fill="#ffd700" />
          <rect x="0" y="5" width="14" height="1" fill="#ffffff" opacity="0.6" />
          <rect x="13" y="5" width="1" height="9" fill="#c99000" />
          <rect x="0" y="13" width="14" height="1" fill="#c99000" />
        </svg>
      );
    case "file":
      return (
        <svg {...svgProps}>
          <path d="M3 1h8l3 3v10H3z" fill="#ffffff" stroke="#000000" />
          <path d="M11 1v3h3z" fill="#c0c0c0" />
          <rect x="5" y="7" width="7" height="1" fill="#1084d0" />
          <rect x="5" y="9" width="7" height="1" fill="#1084d0" />
          <rect x="5" y="11" width="5" height="1" fill="#1084d0" />
        </svg>
      );
    case "gear":
      return (
        <svg {...svgProps}>
          <rect x="6" y="0" width="4" height="3" fill="#808080" />
          <rect x="6" y="13" width="4" height="3" fill="#808080" />
          <rect x="0" y="6" width="3" height="4" fill="#808080" />
          <rect x="13" y="6" width="3" height="4" fill="#808080" />
          <rect x="2" y="2" width="12" height="12" fill="#c0c0c0" />
          <rect x="2" y="2" width="12" height="1" fill="#ffffff" />
          <rect x="2" y="2" width="1" height="12" fill="#ffffff" />
          <rect x="13" y="2" width="1" height="12" fill="#404040" />
          <rect x="2" y="13" width="12" height="1" fill="#404040" />
          <circle cx="8" cy="8" r="2.5" fill="#000080" />
        </svg>
      );
    case "key":
      return (
        <svg {...svgProps}>
          <circle cx="5" cy="6" r="4" fill="#ffd700" stroke="#c99000" />
          <rect x="8" y="5" width="7" height="3" fill="#ffd700" stroke="#c99000" />
          <rect x="8" y="5" width="1" height="1" fill="#ffffff" opacity="0.5" />
          <rect x="12" y="8" width="2" height="4" fill="#ffd700" stroke="#c99000" />
          <rect x="10" y="8" width="2" height="3" fill="#ffd700" stroke="#c99000" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <rect x="1" y="2" width="14" height="12" fill="#000080" />
          <rect x="1" y="2" width="14" height="3" fill="#1084d0" />
          <rect x="3" y="7" width="4" height="3" fill="#c0c0c0" />
          <rect x="8" y="7" width="4" height="3" fill="#c0c0c0" />
          <rect x="3" y="11" width="4" height="2" fill="#808080" />
        </svg>
      );
  }
}

export function App95Shell(props: {
  title: string;
  icon?: string;
  menu?: App95MenuItem[];
  toolbar?: App95ToolbarBtn[];
  navItems?: App95NavItem[];
  status?: App95StatusItem[];
  userLabel?: string;
  onLogout?: () => void;
  children: ReactNode;
}): ReactNode {
  const { title, icon, userLabel, onLogout, children } = props;
  const menu = props.menu ?? defaultMenu;
  const toolbar = props.toolbar ?? defaultToolbar(onLogout);
  const navItems = props.navItems ?? defaultNav;
  const status = props.status ?? defaultStatus;

  const [starting, setStarting] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), BOOT_MS);
    const t2 = setTimeout(() => setStarting(false), BOOT_MS + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), TOAST_MS);
  };

  const clock = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  if (starting) {
    return (
      <div
        className={`app95-boot${leaving ? " app95-boot--leave" : ""}`}
        role="status"
        aria-live="polite"
      >
        <div className="app95-boot__panel">
          <Glyph name="app" size={48} />
          <div className="app95-boot__title">Starting Application…</div>
          <div className="app95-boot__sub">Loading GAS ELECTRONIC Suite...</div>
          <div className="app95-progress app95-progress--boot" role="progressbar" aria-label="Memuat aplikasi">
            <div className="app95-progress__bar" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app95-shell">
      <div className="app95-window app95-shell__window" role="dialog" aria-label={title}>
        <header className="app95-window__titlebar">
          <span className="app95-window__icon" aria-hidden>
            <Glyph name={icon ?? "app"} size={18} />
          </span>
          <span className="app95-window__title">{title}</span>
          <span className="app95-window__spacer" />
          <button
            type="button"
            className="app95-window__btn"
            aria-label="Minimize"
            onClick={() => toast("Jendela diminimalkan (demo).")}
          >
            _
          </button>
          <button
            type="button"
            className="app95-window__btn"
            aria-label="Maximize"
            onClick={() => toast("Aplikasi sudah dalam mode layar penuh.")}
          >
            ▢
          </button>
          <button
            type="button"
            className="app95-window__btn app95-window__btn--close"
            aria-label="Tutup aplikasi"
            onClick={() => onLogout?.()}
          >
            ✕
          </button>
        </header>

        <nav
          className="app95-menubar"
          role="menubar"
          aria-label="Menu utama"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpenMenu(null);
          }}
        >
          {menu.map((m, i) => (
            <div key={m.label} className="app95-menubar__wrap">
              <button
                type="button"
                role="menuitem"
                className={`app95-menubar__item${openMenu === i ? " app95-menubar__item--open" : ""}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === i}
                onClick={() => setOpenMenu(openMenu === i ? null : i)}
              >
                {m.label}
              </button>
              {openMenu === i && (
                <div className="app95-menu" role="menu" aria-label={m.label}>
                  {(m.items ?? []).map((it) => (
                    <button
                      key={it}
                      type="button"
                      role="menuitem"
                      className="app95-menu__item"
                      onClick={() => {
                        setOpenMenu(null);
                        toast(DEMO);
                      }}
                    >
                      {it}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {openMenu !== null && (
          <div className="app95-menu-overlay" aria-hidden onMouseDown={() => setOpenMenu(null)} />
        )}

        {toolbar.length > 0 && (
          <div className="app95-shell__toolbar" role="toolbar" aria-label="Toolbar">
            {toolbar.map((b) => (
              <button
                key={b.label}
                type="button"
                className="app95-toolbar__btn"
                data-tip={b.label}
                aria-label={b.label}
                onClick={() => (b.action ? b.action() : toast(DEMO))}
              >
                {b.icon && (
                  <span className="app95-toolbar__icon" aria-hidden>
                    <Glyph name={b.icon} />
                  </span>
                )}
                {b.label}
              </button>
            ))}
          </div>
        )}

        <div className="app95-shell__body">
          <div className={`app95-shell__side${navOpen ? "" : " app95-shell__side--closed"}`}>
            <button
              type="button"
              className="app95-shell__side-toggle"
              aria-label={navOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(!navOpen)}
            >
              {navOpen ? "«" : "☰"}
            </button>
            {navOpen && (
              <nav className="app95-shell__nav" aria-label="Navigasi aplikasi">
                {navItems.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`app95-shell__nav-item${n.active ? " app95-shell__nav-item--active" : ""}`}
                    aria-current={n.active ? "page" : undefined}
                    onClick={n.onClick}
                  >
                    {n.icon && (
                      <span className="app95-shell__nav-icon" aria-hidden>
                        <Glyph name={n.icon} />
                      </span>
                    )}
                    <span>{n.label}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>

          <main className="app95-shell__main">
            <div className="app95-shell__content app95-scroll">{children}</div>
          </main>
        </div>

        <footer className="app95-statusbar">
          {status.map((s) => (
            <span key={s.label} className="app95-statusbar__item" title={`${s.label}: ${s.value}`}>
              {s.label ? `${s.label}: ${s.value}` : s.value}
            </span>
          ))}
          <span className="app95-statusbar__spacer" />
          {userLabel && <span className="app95-statusbar__item app95-statusbar__user">{userLabel}</span>}
          <span className="app95-statusbar__item app95-clock">{clock}</span>
        </footer>
      </div>

      {toastMsg && (
        <div className="app95-toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default App95Shell;
