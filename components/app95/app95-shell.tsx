"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { t, loadLang, type Lang } from "@/lib/i18n";

export type App95MenuItem = { label: string; items?: string[] };
export type App95ToolbarBtn = { label: string; icon?: string; action?: () => void };
export type App95NavItem = { id: string; label: string; icon?: string; active?: boolean; onClick?: () => void };
export type App95StatusItem = { label: string; value: string };

const TOAST_MS = 2600;
const BOOT_MS = 2000;

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
  const [lang] = useState<Lang>(() => (typeof window === "undefined" ? "id" : loadLang(window.localStorage)));
  const { title, icon, userLabel, onLogout, children } = props;
  const menu = props.menu ?? [
    { label: t(lang, "suite.menuFile"), items: [t(lang, "suite.fileNew"), t(lang, "suite.fileOpen"), t(lang, "suite.fileSave"), t(lang, "suite.filePrint"), t(lang, "suite.fileExit")] },
    { label: t(lang, "suite.menuEdit"), items: [t(lang, "suite.editCopy"), t(lang, "suite.editPaste"), t(lang, "suite.editDelete")] },
    { label: t(lang, "suite.menuView"), items: [t(lang, "suite.viewSidebar"), t(lang, "suite.viewToolbar"), t(lang, "suite.viewStatusbar")] },
    { label: t(lang, "suite.menuHelp"), items: [t(lang, "suite.helpAbout"), t(lang, "suite.helpGuide")] },
  ];
  const toolbar = props.toolbar ?? [
    { label: t(lang, "suite.tbNewFolder"), icon: "folder" },
    { label: t(lang, "suite.filePrint"), icon: "file" },
    { label: t(lang, "suite.fileExit"), icon: "key", action: onLogout },
  ];
  const navItems = props.navItems ?? [
    { id: "home", label: t(lang, "suite.navHome"), icon: "app", active: true },
    { id: "documents", label: t(lang, "suite.navDocs"), icon: "file" },
    { id: "archive", label: t(lang, "suite.navArchive"), icon: "folder" },
    { id: "settings", label: t(lang, "suite.navSettings"), icon: "gear" },
  ];
  const status = props.status ?? [{ label: t(lang, "suite.statusReady"), value: t(lang, "suite.statusReadyValue") }];

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
          <div className="app95-boot__title">{t(lang, "suite.bootTitle")}</div>
          <div className="app95-boot__sub">{t(lang, "suite.bootSub")}</div>
          <div className="app95-progress app95-progress--boot" role="progressbar" aria-label={t(lang, "suite.bootAria")}>
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
            aria-label={t(lang, "suite.winMin")}
            onClick={() => toast(t(lang, "suite.winMinToast"))}
          >
            _
          </button>
          <button
            type="button"
            className="app95-window__btn"
            aria-label={t(lang, "suite.winMax")}
            onClick={() => toast(t(lang, "suite.winMaxToast"))}
          >
            ▢
          </button>
          <button
            type="button"
            className="app95-window__btn app95-window__btn--close"
            aria-label={t(lang, "suite.winClose")}
            onClick={() => onLogout?.()}
          >
            ✕
          </button>
        </header>

        <nav
          className="app95-menubar"
          role="menubar"
          aria-label={t(lang, "suite.menubarAria")}
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
                        toast(t(lang, "suite.demo"));
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
          <div className="app95-shell__toolbar" role="toolbar" aria-label={t(lang, "suite.toolbarAria")}>
            {toolbar.map((b) => (
              <button
                key={b.label}
                type="button"
                className="app95-toolbar__btn"
                data-tip={b.label}
                aria-label={b.label}
                onClick={() => (b.action ? b.action() : toast(t(lang, "suite.demo")))}
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
              aria-label={navOpen ? t(lang, "suite.sideHide") : t(lang, "suite.sideShow")}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(!navOpen)}
            >
              {navOpen ? "«" : "☰"}
            </button>
            {navOpen && (
              <nav className="app95-shell__nav" aria-label={t(lang, "suite.navAria")}>
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
