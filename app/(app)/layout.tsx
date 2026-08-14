"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import PageTransition from "@/components/page-transition";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { clearMockSession } from "@/lib/mocks/accounts";
import { NAV_TREE, SYSTEM_SHORTCUTS } from "@/lib/navigation";
import "../win95-inner.css";
import "../winxp-dash.css";

const APP_TITLE = "GAS ELECTRONIC - PRODUCTION MANAGEMENT SYSTEM";
const APP_VERSION = "1.9.0";
const TOAST_MS = 2600;

function Icon({ name }: { name: string }): ReactNode {
  const p = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    shapeRendering: "crispEdges",
    "aria-hidden": true,
    focusable: false,
  } as const;
  switch (name) {
    case "app":
      return (
        <svg {...p}>
          <rect x="1" y="1" width="14" height="14" rx="3" fill="#0a246a" stroke="#d0d0ff" />
          <text x="8" y="11.5" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#ffffff" fontFamily="Tahoma">
            GE
          </text>
        </svg>
      );
    case "back":
      return (
        <svg {...p}>
          <path d="M1 8l7-4v2h6v4H8v2z" fill="#000080" />
        </svg>
      );
    case "forward":
      return (
        <svg {...p}>
          <path d="M15 8L8 4v2H2v4h6v2z" fill="#000080" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...p}>
          <path d="M13.5 8a5.5 5.5 0 0 1-10 3M2.5 8a5.5 5.5 0 0 1 10-3" fill="none" stroke="#1084d0" strokeWidth="2" />
          <path d="M2.5 13l1-3 3 1z" fill="#1084d0" />
          <path d="M13.5 3l-1 3-3-1z" fill="#1084d0" />
        </svg>
      );
    case "home":
      return (
        <svg {...p}>
          <path d="M1 8h2v6h4v-4h2v4h4V8h2L8 2z" fill="#000080" />
        </svg>
      );
    case "print":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="12" height="5" fill="#c0c0c0" stroke="#000000" />
          <path d="M4 7h8v7H4z" fill="#ffffff" stroke="#000000" />
          <path d="M5 1h6v2H5z" fill="#1084d0" />
          <rect x="6" y="9" width="4" height="3" fill="#808080" />
        </svg>
      );
    case "export":
      return (
        <svg {...p}>
          <path d="M3 5h10v9H3z" fill="#ffffff" stroke="#000000" />
          <path d="M8 1v6" stroke="#1084d0" />
          <path d="M5 4l3-2 3 2" fill="none" stroke="#1084d0" />
        </svg>
      );
    case "help":
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.5" fill="#1084d0" />
          <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#ffffff" fontFamily="Tahoma">
            ?
          </text>
        </svg>
      );
    case "logout":
      return (
        <svg {...p}>
          <rect x="2" y="2" width="7" height="12" fill="#c99000" stroke="#000000" />
          <rect x="5" y="6" width="2" height="3" fill="#000080" />
          <path d="M11 8h4M14 5.5l2.5 2.5L14 10.5" fill="none" stroke="#000080" strokeWidth="1.5" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...p}>
          <rect x="1" y="2" width="14" height="10" fill="#0a246a" stroke="#000000" />
          <rect x="2" y="3" width="12" height="8" fill="#1084d0" />
          <rect x="6" y="12" width="4" height="2" fill="#c0c0c0" />
          <rect x="4" y="14" width="8" height="1.5" fill="#808080" />
        </svg>
      );
    case "folder":
      return (
        <svg {...p}>
          <path d="M1 4h6l2 2h6v8H1z" fill="#f8d878" stroke="#000000" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M3 1h7l3 3v11H3z" fill="#ffffff" stroke="#000000" />
          <path d="M10 1v3h3z" fill="#c0c0c0" />
          <rect x="5" y="7" width="6" height="1" fill="#000080" />
          <rect x="5" y="9" width="6" height="1" fill="#000080" />
          <rect x="5" y="11" width="4" height="1" fill="#000080" />
        </svg>
      );
  }
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [now, setNow] = useState<Date>(() => new Date());
  const [toastMsg, setToastMsg] = useState<{ text: string; id: number } | null>(null);
  const session = useSessionGuard();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toastMsg]);

  if (!session) {
    return (
      <div className="xw-root xw-boot">
        <div className="xw-panel xw-boot__panel">
          <Icon name="app" />
          <p>Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  const { user } = session;

  const toast = (msg: string) => {
    setToastMsg((prev) => ({ text: msg, id: (prev?.id ?? 0) + 1 }));
  };

  const clock = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  function handleLogout() {
    clearMockSession();
    router.replace("/login");
  }

  function handleClose() {
    if (typeof window === "undefined" || window.confirm("Yakin keluar?")) handleLogout();
  }

  function handleMenu(label: string, action?: () => void) {
    setOpenMenu(null);
    action?.();
  }

  function isActive(href?: string) {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const menus = [
    {
      key: "file",
      label: "File",
      items: [
        { label: "Logout", action: handleClose },
        { label: "Exit", action: handleClose },
      ],
    },
    { key: "view", label: "View", items: [{ label: "Refresh", action: () => window.location.reload() }] },
    { key: "tools", label: "Tools", items: [{ label: "Export", action: () => router.push("/export") }] },
    {
      key: "window",
      label: "Window",
      items: [
        { label: "Minimize", action: () => toast("Jendela diminimalkan (demo).") },
        { label: "Maximize", action: () => toast("Aplikasi sudah dalam mode layar penuh.") },
      ],
    },
    { key: "help", label: "Help", items: [{ label: "About", action: () => toast(`${APP_TITLE} v${APP_VERSION}`) }] },
  ];

  const toolbarButtons = [
    { key: "back", label: "Back", icon: "back", action: () => router.back() },
    { key: "forward", label: "Forward", icon: "forward", action: () => router.forward() },
    { key: "refresh", label: "Refresh", icon: "refresh", action: () => window.location.reload() },
    { key: "home", label: "Home", icon: "home", action: () => router.push("/dashboard") },
    { key: "print", label: "Print", icon: "print", action: () => window.print() },
    { key: "export", label: "Export", icon: "export", action: () => router.push("/export") },
    { key: "help", label: "Help", icon: "help", action: () => toast(`${APP_TITLE} v${APP_VERSION}`) },
    { key: "logout", label: "Logout", icon: "logout", action: handleLogout },
  ];

  const navItemCls = (href?: string) =>
    `xw-nav__item${href && isActive(href) ? " xw-nav__item--active" : ""}`;

  const toggleGroup = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const nav = (
    <nav className="xw-nav" aria-label="Main navigation">
      <div className="xw-nav__head">MAIN NAVIGATION</div>
      {NAV_TREE.map((item) => {
        if (!item.children) {
          return (
            <Link key={item.key} href={item.href ?? "#"} className={navItemCls(item.href)}>
              <span className="xw-nav__icon" aria-hidden>
                <Icon name="monitor" />
              </span>
              <span className="xw-nav__text">{item.label}</span>
            </Link>
          );
        }
        const open = !collapsed.has(item.key);
        return (
          <div key={item.key} className="xw-nav__group">
            <div className="xw-nav__group-row">
              <button
                type="button"
                className="xw-nav__expander"
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
                onClick={() => toggleGroup(item.key)}
              >
                {open ? "-" : "+"}
              </button>
              <span className="xw-nav__icon" aria-hidden>
                <Icon name="folder" />
              </span>
              <span className="xw-nav__group-label">{item.label}</span>
            </div>
            {open && (
              <div className="xw-nav__children" role="group">
                {item.children.map((child) => (
                  <Link key={child.key} href={child.href ?? "#"} className={navItemCls(child.href)}>
                    <span className="xw-nav__icon" aria-hidden>
                      <Icon name="file" />
                    </span>
                    <span className="xw-nav__text">{child.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="xw-root">
      <div className="xw-window" role="dialog" aria-label={APP_TITLE}>
        <header className="xw-titlebar">
          <span className="xw-titlebar__icon">
            <Icon name="app" />
          </span>
          <span className="xw-titlebar__title">{APP_TITLE}</span>
          <button
            type="button"
            className="xw-titlebar__btn"
            aria-label="Minimize"
            title="Minimize"
            onClick={() => toast("Jendela diminimalkan (demo).")}
          >
            _
          </button>
          <button
            type="button"
            className="xw-titlebar__btn"
            aria-label="Maximize"
            title="Maximize"
            onClick={() => toast("Aplikasi sudah dalam mode layar penuh.")}
          >
            □
          </button>
          <button
            type="button"
            className="xw-titlebar__btn xw-titlebar__btn--close"
            aria-label="Close application"
            title="Keluar"
            onClick={handleClose}
          >
            ×
          </button>
        </header>

        <nav
          className="xw-menubar"
          role="menubar"
          aria-label="Main menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpenMenu(null);
          }}
        >
          {menus.map((m) => (
            <div key={m.key} className="xw-menubar__wrap">
              <button
                type="button"
                role="menuitem"
                className={`xw-menubar__item${openMenu === m.key ? " xw-menubar__item--open" : ""}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === m.key}
                onClick={() => setOpenMenu(openMenu === m.key ? null : m.key)}
              >
                {m.label}
              </button>
              {openMenu === m.key && (
                <div className="xw-menu" role="menu" aria-label={m.label}>
                  {m.items.map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      role="menuitem"
                      className="xw-menu__item"
                      onClick={() => handleMenu(m.key, it.action)}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        {openMenu !== null && <div className="xw-menu-overlay" aria-hidden onMouseDown={() => setOpenMenu(null)} />}

        <div className="xw-toolbar" role="toolbar" aria-label="Toolbar">
          {toolbarButtons.map((b, i) => (
            <span key={b.key} className="xw-toolbar__wrap">
              {i === 4 && <span className="xw-toolbar__sep" aria-hidden />}
              <button type="button" className="xw-toolbar__btn" onClick={b.action}>
                <Icon name={b.icon} />
                <span>{b.label}</span>
              </button>
            </span>
          ))}
        </div>

        <div className="xw-body">
          {nav}
          <main className="xw-content">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        <div className="xw-shortcutbar">
          <span className="xw-shortcutbar__label">SYSTEM SHORTCUT</span>
          {SYSTEM_SHORTCUTS.map((s) => (
            <Link key={s.key} href={s.href} className="xw-shortcut">
              {s.label}
            </Link>
          ))}
        </div>

        <footer className="xw-statusbar">
          <span className="xw-statusbar__item">Ready</span>
          <span className="xw-statusbar__spacer" />
          <span className="xw-statusbar__item" title={user.name}>
            {user.email}
          </span>
          <span className="xw-statusbar__item xw-statusbar__clock">{clock}</span>
        </footer>
      </div>

      {toastMsg && (
        <div className="xw-toast" role="status" aria-live="polite">
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
