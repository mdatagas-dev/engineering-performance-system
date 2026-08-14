"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import PageTransition from "@/components/page-transition";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { clearMockSession } from "@/lib/mocks/accounts";
import { resolveSessionMenu } from "@/lib/auth/menu";
import "../win95-inner.css";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ENGINEERING_MANAGER: "Engineering Manager",
  ENGINEERING_STAFF: "Engineering Staff",
  VIEWER: "Viewer",
};

const SIDEBAR_KEY = "eps_sidebar_open";
const TOAST_MS = 2600;

const APP_TITLE = "GAS ELECTRONIC Suite";
const APP_VERSION = "1.8";

function Glyph({ name, size = 16 }: { name: string; size?: number }): ReactNode {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    shapeRendering: "crispEdges",
    "aria-hidden": true,
    focusable: false,
  } as const;
  switch (name) {
    case "dashboard":
      return (
        <svg {...p}>
          <rect x="1" y="2" width="14" height="10" fill="#c0c0c0" stroke="#000" />
          <rect x="3" y="4" width="4" height="3" fill="#000080" />
          <rect x="8" y="4" width="5" height="3" fill="#1084d0" />
          <rect x="3" y="8" width="9" height="2" fill="#808080" />
          <rect x="5" y="12" width="6" height="2" fill="#808080" />
        </svg>
      );
    case "trend":
      return (
        <svg {...p}>
          <rect x="0" y="6" width="16" height="1" fill="#808080" />
          <rect x="9" y="0" width="1" height="6" fill="#808080" />
          <rect x="2" y="9" width="3" height="6" fill="#000080" />
          <rect x="7" y="6" width="3" height="9" fill="#1084d0" />
          <rect x="12" y="3" width="3" height="12" fill="#c99000" />
        </svg>
      );
    case "entry":
      return (
        <svg {...p}>
          <path d="M3 1h7l3 3v10H3z" fill="#fff" stroke="#000" />
          <path d="M10 1v3h3z" fill="#c0c0c0" />
          <rect x="5" y="7" width="7" height="1" fill="#000080" />
          <rect x="5" y="9" width="7" height="1" fill="#000080" />
          <rect x="5" y="11" width="5" height="1" fill="#000080" />
        </svg>
      );
    case "transfer":
      return (
        <svg {...p}>
          <path d="M2 6h12l-3 4H5z" fill="#1084d0" />
          <path d="M2 10h12l-3-4H5z" fill="#000080" />
        </svg>
      );
    case "settings":
      return (
        <svg {...p}>
          <rect x="6" y="0" width="4" height="3" fill="#808080" />
          <rect x="6" y="13" width="4" height="3" fill="#808080" />
          <rect x="0" y="6" width="3" height="4" fill="#808080" />
          <rect x="13" y="6" width="3" height="4" fill="#808080" />
          <rect x="2" y="2" width="12" height="12" fill="#c0c0c0" />
          <circle cx="8" cy="8" r="2.5" fill="#000080" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <rect x="1" y="2" width="14" height="12" fill="#000080" />
          <rect x="1" y="2" width="14" height="3" fill="#1084d0" />
          <rect x="3" y="7" width="4" height="3" fill="#c0c0c0" />
          <rect x="8" y="7" width="4" height="3" fill="#c0c0c0" />
        </svg>
      );
  }
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SIDEBAR_KEY) !== "0";
  });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
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
      <div className="inner-boot">
        <div className="inner-boot__panel">
          <Glyph name="app" size={40} />
          <p>Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  const { user } = session;
  const roleLabel = ROLE_LABELS[user.role.name] ?? user.role.name;
  // Menu dihitung FRESH dari user (bukan session.menu tersimpan di localStorage
  // yang bisa basi setelah struktur menu berubah) — perubahan menu langsung
  // terlihat tanpa harus logout/login ulang.
  const menu = resolveSessionMenu(user);
  const menuCount = menu.reduce((n, it) => n + (it.children ? it.children.length : 1), 0);

  const toast = (msg: string) => {
    setToastMsg((prev) => ({ text: msg, id: (prev?.id ?? 0) + 1 }));
  };

  const clock = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

  function toggleSidebar() {
    setSidebarOpen((open) => {
      if (typeof window !== "undefined") window.localStorage.setItem(SIDEBAR_KEY, open ? "0" : "1");
      return !open;
    });
  }

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

  function closeSidebarOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767.98px)").matches) {
      setSidebarOpen(false);
    }
  }

  const linkCls = (href?: string) =>
    `inner-nav__link${isActive(href) ? " inner-nav__link--active" : ""}`;

  const nav = (
    <nav className="inner-nav" aria-label="Navigasi utama">
      {menu.map((item) =>
        item.children ? (
          <div key={item.key} className="inner-nav__group">
            <p className="inner-nav__group-label">{item.label}</p>
            <div className="inner-nav__group-items">
              {item.children.map((child) => (
                <Link key={child.key} href={child.href ?? "#"} className={linkCls(child.href)} onClick={closeSidebarOnMobile}>
                  {child.icon && (
                    <span className="inner-nav__icon" aria-hidden>
                      <Glyph name={child.icon} />
                    </span>
                  )}
                  <span className="inner-nav__text">{child.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <Link key={item.key} href={item.href ?? "#"} onClick={closeSidebarOnMobile} className={linkCls(item.href)}>
            {item.icon && (
              <span className="inner-nav__icon" aria-hidden>
                <Glyph name={item.icon} />
              </span>
            )}
            <span className="inner-nav__text">{item.label}</span>
          </Link>
        )
      )}
    </nav>
  );

  return (
    <div className="inner-root">
      <div className="inner-window" role="dialog" aria-label={APP_TITLE}>
        <header className="inner-titlebar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="GE" className="inner-titlebar__icon" />
          <span className="inner-titlebar__title">{APP_TITLE}</span>
          <button
            type="button"
            className="inner-titlebar__btn"
            aria-label="Minimize"
            title="Minimize"
            onClick={() => toast("Jendela diminimalkan (demo).")}
          >
            _
          </button>
          <button
            type="button"
            className="inner-titlebar__btn"
            aria-label="Maximize"
            title="Maximize"
            onClick={() => toast("Aplikasi sudah dalam mode layar penuh.")}
          >
            ▢
          </button>
          <button
            type="button"
            className="inner-titlebar__btn inner-titlebar__btn--close"
            aria-label="Tutup aplikasi"
            title="Keluar"
            onClick={handleClose}
          >
            ✕
          </button>
        </header>

        <nav
          className="inner-menubar"
          role="menubar"
          aria-label="Menu utama"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpenMenu(null);
          }}
        >
          {[
            {
              key: "file",
              label: "File",
              items: [
                { label: "Keluar", action: handleClose },
                { label: "Tutup", action: handleClose },
              ],
            },
            { key: "view", label: "View", items: [{ label: "Refresh", action: () => toast("Siap.") }] },
            { key: "help", label: "Help", items: [{ label: "Tentang", action: () => toast(`${APP_TITLE} v${APP_VERSION}`) }] },
          ].map((m) => (
            <div key={m.key} className="inner-menubar__wrap">
              <button
                type="button"
                role="menuitem"
                className={`inner-menubar__item${openMenu === m.key ? " inner-menubar__item--open" : ""}`}
                aria-haspopup="menu"
                aria-expanded={openMenu === m.key}
                onClick={() => setOpenMenu(openMenu === m.key ? null : m.key)}
              >
                {m.label}
              </button>
              {openMenu === m.key && (
                <div className="inner-menu" role="menu" aria-label={m.label}>
                  {m.items.map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      role="menuitem"
                      className="inner-menu__item"
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

        {openMenu !== null && <div className="inner-menu-overlay" aria-hidden onMouseDown={() => setOpenMenu(null)} />}

        <div className="inner-body">
          <aside className={`inner-side${sidebarOpen ? "" : " inner-side--closed"}`} aria-label="Navigasi">
            <button
              type="button"
              className="inner-side__toggle"
              aria-label={sidebarOpen ? "Sembunyikan sidebar" : "Tampilkan sidebar"}
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? "Sembunyikan menu" : "Tampilkan menu"}
              onClick={toggleSidebar}
            >
              {sidebarOpen ? "«" : "»"}
            </button>
            {sidebarOpen && (
              <>
                <div className="inner-side__head">
                  <span className="inner-side__head-title">Navigasi</span>
                  <span className="inner-side__head-role">{roleLabel}</span>
                </div>
                {nav}
              </>
            )}
          </aside>

          <main className="inner-main inner-scroll">
            <div className="inner-content">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>

        <footer className="inner-statusbar">
          <span className="inner-statusbar__item">Siap</span>
          <span className="inner-statusbar__item">{menuCount} menu</span>
          <span className="inner-statusbar__spacer" />
          <span className="inner-statusbar__item inner-statusbar__user" title={user.name}>
            {user.email}
          </span>
          <span className="inner-statusbar__item inner-statusbar__clock">{clock}</span>
        </footer>
      </div>

      {toastMsg && (
        <div className="inner-toast" role="status" aria-live="polite">
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
