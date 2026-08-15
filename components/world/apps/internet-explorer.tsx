"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import WinXpIcon from "../winxp-icons";
import "../../../app/winxp-apps.css";

type PageKey = "start" | "about" | "production" | "quality" | "help";
type Page = PageKey | "notfound";

const URLS: Record<PageKey, string> = {
  start: "http://www.gas-electronic.com/",
  about: "http://www.gas-electronic.com/about.html",
  production: "http://www.gas-electronic.com/production.html",
  quality: "http://www.gas-electronic.com/quality.html",
  help: "http://www.gas-electronic.com/help.html",
};

const NOT_FOUND_URL = "http://www.gas-electronic.com/404.html";

const LINKS: { key: PageKey; label: string }[] = [
  { key: "about", label: "Tentang GAS ELECTRONIC" },
  { key: "production", label: "Produksi & Mesin" },
  { key: "quality", label: "Quality Assurance" },
  { key: "help", label: "Bantuan & Kontak" },
];

type MenuItem = { label: string; run: () => void };

export function InternetExplorerApp(): ReactNode {
  const [page, setPage] = useState<Page>("start");
  const [url, setUrl] = useState(URLS.start);
  const [back, setBack] = useState<Page[]>([]);
  const [fwd, setFwd] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const go = (p: Page) => {
    setBack((b) => [...b, page]);
    setFwd([]);
    setPage(p);
    if (p !== "notfound") setUrl(URLS[p]);
    setBusy(true);
    setTimeout(() => setBusy(false), 350);
  };

  const goBack = () => {
    if (!back.length) return;
    const prev = back[back.length - 1];
    setBack((b) => b.slice(0, -1));
    setFwd((f) => [...f, page]);
    setPage(prev);
    setUrl(prev === "notfound" ? NOT_FOUND_URL : URLS[prev]);
  };

  const goForward = () => {
    if (!fwd.length) return;
    const next = fwd[fwd.length - 1];
    setFwd((f) => f.slice(0, -1));
    setBack((b) => [...b, page]);
    setPage(next);
    setUrl(next === "notfound" ? NOT_FOUND_URL : URLS[next]);
  };

  const refresh = () => {
    setBusy(true);
    setTimeout(() => setBusy(false), 350);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const u = url.trim().toLowerCase();
    const hit = (Object.keys(URLS) as PageKey[]).find((k) => URLS[k].toLowerCase() === u);
    if (hit) go(hit);
    else go("notfound");
  };

  const MENUS: { label: string; items: MenuItem[] }[] = [
    {
      label: "File",
      items: [
        { label: "New Window", run: () => showToast("Membuka jendela baru...") },
        { label: "Close", run: () => showToast("Menutup jendela...") },
      ],
    },
    { label: "Edit", items: [] },
    { label: "View", items: [{ label: "Refresh", run: refresh }] },
    { label: "Favorites", items: [] },
    { label: "Tools", items: [] },
    { label: "Help", items: [{ label: "About", run: () => setAboutOpen(true) }] },
  ];

  return (
    <div className="xpa-app xpa-ie" onMouseDown={() => setMenu(null)}>
      <div className="xpa-ie__menu" role="menubar" onMouseDown={(e) => e.stopPropagation()}>
        {MENUS.map((m) => (
          <div key={m.label} className="xpa-ie__menu-wrap">
            <button
              type="button"
              role="menuitem"
              className={`xpa-ie__menu-item ${menu === m.label ? "xpa-ie__menu-item--open" : ""}`}
              onClick={() => setMenu(menu === m.label ? null : m.label)}
            >
              {m.label}
            </button>
            {menu === m.label && (
              <div className="xpa-ie__menu-panel" role="menu">
                {m.items.length === 0 ? (
                  <div className="xpa-ie__menu-empty">(kosong)</div>
                ) : (
                  m.items.map((it) => (
                    <button
                      key={it.label}
                      type="button"
                      role="menuitem"
                      className="xpa-ie__menu-panel-item"
                      onClick={() => {
                        setMenu(null);
                        it.run();
                      }}
                    >
                      {it.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="xpa-toolbar" role="toolbar">
        <button type="button" className="xpa-toolbtn" onClick={goBack} disabled={back.length === 0} title="Back">
          <WinXpIcon name="run" size={16} />
          <span className="xpa-toolbtn__label">Back</span>
        </button>
        <button type="button" className="xpa-toolbtn" onClick={goForward} disabled={fwd.length === 0} title="Forward">
          <WinXpIcon name="run" size={16} />
          <span className="xpa-toolbtn__label">Forward</span>
        </button>
        <button type="button" className="xpa-toolbtn" onClick={refresh} title="Refresh">
          <WinXpIcon name="search" size={16} />
          <span className="xpa-toolbtn__label">Refresh</span>
        </button>
        <button type="button" className="xpa-toolbtn" onClick={() => go("start")} title="Home">
          <WinXpIcon name="internet-explorer" size={16} />
          <span className="xpa-toolbtn__label">Home</span>
        </button>
      </div>
      <form className="xpa-addr" onSubmit={submit}>
        <span className="xpa-addr__label">Address</span>
        <input
          className="xpa-addr__input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          aria-label="Alamat URL"
        />
        <button type="submit" className="xpa-btn xpa-addr__go">
          Go
        </button>
      </form>
      <div className="xpa-pane">
        <div className="xpa-ie__page">{renderPage(page, go, busy)}</div>
      </div>
      <div className="xpa-status">
        <span className="xpa-status__cell">{busy ? "Membuka halaman..." : "Done"}</span>
        <span className="xpa-status__cell xpa-status__cell--right">Internet zone</span>
      </div>
      {toastMsg && (
        <div className="xpa-ie__toast" role="status">
          {toastMsg}
        </div>
      )}
      {aboutOpen && (
        <div
          className="xpa-ie__dialog"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAboutOpen(false);
          }}
        >
          <div className="xpa-ie__dialog-box" role="dialog" aria-modal="true" aria-label="About">
            <div className="xpa-ie__dialog-title">
              <WinXpIcon name="internet-explorer" size={16} />
              About Internet Explorer
            </div>
            <div className="xpa-ie__dialog-body">
              <p className="xpa-ie__dialog-brand">Internet Explorer (Simulasi)</p>
              <p className="xpa-ie__dialog-line">
                Browser internal portal GAS ELECTRONIC. Tidak ada koneksi jaringan
                sungguhan - semua halaman disimulasikan secara lokal.
              </p>
            </div>
            <div className="xpa-ie__dialog-actions">
              <button type="button" className="xpa-btn" onClick={() => setAboutOpen(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .xpa-ie {
          position: relative;
        }
        .xpa-ie__menu-wrap {
          position: relative;
        }
        .xpa-ie__menu-item--open,
        .xpa-ie__menu-item--open:hover {
          border-color: #c7c3b6;
          background: #ece9d8;
        }
        .xpa-ie__menu-panel {
          position: absolute;
          top: 100%;
          left: 0;
          z-index: 60;
          min-width: 160px;
          background: #ece9d8;
          border: 1px solid #003c74;
          box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          padding: 2px;
          display: flex;
          flex-direction: column;
        }
        .xpa-ie__menu-panel-item {
          font: inherit;
          text-align: left;
          background: transparent;
          border: none;
          padding: 4px 18px 4px 8px;
          cursor: default;
        }
        .xpa-ie__menu-panel-item:hover {
          background: #316ac5;
          color: #fff;
        }
        .xpa-ie__menu-empty {
          padding: 4px 18px 4px 8px;
          color: #808080;
        }
        .xpa-ie__toast {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 70;
          background: #fff;
          border: 1px solid #003c74;
          box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
          padding: 6px 14px;
          white-space: nowrap;
        }
        .xpa-ie__dialog {
          position: absolute;
          inset: 0;
          z-index: 50;
          background: rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .xpa-ie__dialog-box {
          width: 360px;
          max-width: 92%;
          background: #ece9d8;
          border: 1px solid #003c74;
          box-shadow: inset 1px 1px #fff;
        }
        .xpa-ie__dialog-title {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 5px;
          background: linear-gradient(180deg, #3f8ee8 0%, #245edb 45%, #0a246a 100%);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
        }
        .xpa-ie__dialog-body {
          padding: 12px;
        }
        .xpa-ie__dialog-brand {
          margin: 0 0 6px;
          font-weight: 700;
          color: #0a246a;
        }
        .xpa-ie__dialog-line {
          margin: 0;
          line-height: 1.4;
        }
        .xpa-ie__dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          padding: 0 12px 12px;
        }
      `}</style>
    </div>
  );
}

function renderPage(page: Page, go: (p: Page) => void, busy: boolean): ReactNode {
  return (
    <div aria-live="polite">
      <div className="xpa-ie__brand">GAS ELECTRONIC</div>
      <div className="xpa-ie__tagline">Engineering Production System - Portal Intranet Resmi</div>
      <hr className="xpa-ie__rule" />
      {busy ? (
        <p className="xpa-ie__p">Loading {page}...</p>
      ) : (
        <PageBody page={page} go={go} />
      )}
    </div>
  );
}

function PageBody({ page, go }: { page: Page; go: (p: Page) => void }): ReactNode {
  switch (page) {
    case "start":
      return (
        <>
          <div className="xpa-ie__h1">Selamat datang di Portal Intranet GAS ELECTRONIC</div>
          <p className="xpa-ie__p">
            Ini adalah simulasi homepage intranet pabrik. Halaman ini statis dan aman -
            tidak ada koneksi jaringan sungguhan. Semua data lokal di perangkat Anda.
          </p>
          <div className="xpa-ie__links">
            {LINKS.map((l) => (
              <button key={l.key} type="button" className="xpa-ie__link" onClick={() => go(l.key)}>
                <span className="xpa-ie__tick" aria-hidden>
                  &raquo;
                </span>
                {l.label}
              </button>
            ))}
          </div>
        </>
      );
    case "about":
      return (
        <>
          <div className="xpa-ie__h1">Tentang GAS ELECTRONIC</div>
          <p className="xpa-ie__p">
            PT GAS ELECTRONIC bergerak di bidang manufaktur komponen elektronik dan gas
            industri. Didirikan tahun 1998, perusahaan ini dikenal dengan lini produksi
            yang andal dan tim Quality Assurance yang teliti.
          </p>
          <p className="xpa-ie__p">
            Halaman ini disimulasikan untuk keperluan demo portal internal. Untuk kembali,
            gunakan tombol Back atau Home pada toolbar.
          </p>
          <div className="xpa-ie__links">
            <button type="button" className="xpa-ie__link" onClick={() => go("start")}>
              <span className="xpa-ie__tick" aria-hidden>
                &raquo;
              </span>
              Kembali ke halaman utama
            </button>
          </div>
        </>
      );
    case "production":
      return (
        <>
          <div className="xpa-ie__h1">Produksi & Mesin</div>
          <p className="xpa-ie__p">
            Pabrik mengoperasikan 3 area produksi: Area 1 (perakitan), Area 2 (pengelasan),
            dan Area 3 (packaging). Setiap area dipantau oleh sistem EPS secara real-time.
          </p>
          <p className="xpa-ie__p">
            Total unit diproduksi Q3 2026: 12.847 unit. Efisiensi lini: 94%.
          </p>
          <div className="xpa-ie__links">
            <button type="button" className="xpa-ie__link" onClick={() => go("start")}>
              <span className="xpa-ie__tick" aria-hidden>
                &raquo;
              </span>
              Kembali ke halaman utama
            </button>
          </div>
        </>
      );
    case "quality":
      return (
        <>
          <div className="xpa-ie__h1">Quality Assurance</div>
          <p className="xpa-ie__p">
            Tim QA melakukan inspeksi pada setiap batch sebelum dikirim. Standar mutu
            mengacu pada ISO 9001. Skor DQ (Defect per Quantity) dipantau setiap shift.
          </p>
          <p className="xpa-ie__p">
            Downtime rata-rata bulan ini: 6%. Target defect rate: di bawah 1,5%.
          </p>
          <div className="xpa-ie__links">
            <button type="button" className="xpa-ie__link" onClick={() => go("start")}>
              <span className="xpa-ie__tick" aria-hidden>
                &raquo;
              </span>
              Kembali ke halaman utama
            </button>
          </div>
        </>
      );
    case "help":
      return (
        <>
          <div className="xpa-ie__h1">Bantuan & Kontak</div>
          <p className="xpa-ie__p">
            Butuh bantuan? Hubungi Helpdesk EPS di ext. 5500 atau email
            helpdesk@gas-electronic.local (simulasi).
          </p>
          <p className="xpa-ie__p">
            Jam layanan: Senin - Jumat, 07.00 - 19.00 WIB.
          </p>
          <div className="xpa-ie__links">
            <button type="button" className="xpa-ie__link" onClick={() => go("start")}>
              <span className="xpa-ie__tick" aria-hidden>
                &raquo;
              </span>
              Kembali ke halaman utama
            </button>
          </div>
        </>
      );
    case "notfound":
      return (
        <>
          <div className="xpa-ie__h1">Halaman tidak ditemukan</div>
          <p className="xpa-ie__p">
            URL yang Anda minta tidak tersedia di portal ini (HTTP 404 - simulasi).
            Periksa kembali alamat atau kembali ke halaman utama.
          </p>
          <div className="xpa-ie__links">
            <button type="button" className="xpa-ie__link" onClick={() => go("start")}>
              <span className="xpa-ie__tick" aria-hidden>
                &raquo;
              </span>
              Kembali ke halaman utama
            </button>
          </div>
        </>
      );
    default:
      return null;
  }
}
