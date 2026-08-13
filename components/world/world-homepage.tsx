"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import WorldWindow, { type WindowPos } from "./world-window";
import { AboutApp, AccessApp, ArchiveApp, DocumentApp, SystemApp, TerminalApp } from "./world-apps";

/* ============================================================
   THE WORLD — homepage immersive
   Desktop-style: boot → desktop → ikon → jendela → taskbar.
   Easter eggs: klik logo 3× → glitch; ketik konami/secret di
   terminal; ACCESS TERMINAL → /login.
   ============================================================ */

type AppId = "about" | "system" | "archive" | "document" | "terminal" | "access";

type OpenWindow = {
  id: AppId;
  focused: boolean;
  closing: boolean;
  minimized: boolean;
  pos: WindowPos;
};

const APP_META: Record<AppId, { title: string; icon: string; terminal?: boolean }> = {
  about: { title: "ABOUT", icon: "◎" },
  system: { title: "SYSTEM", icon: "◉" },
  archive: { title: "ARCHIVE", icon: "▤" },
  document: { title: "DOCUMENT", icon: "▥" },
  terminal: { title: "TERMINAL", icon: ">_", terminal: true },
  access: { title: "ACCESS TERMINAL", icon: "⌘" },
};

const ICON_ORDER: { id: AppId; label: string; glyph: string; accent?: boolean }[] = [
  { id: "about", label: "About", glyph: "◎" },
  { id: "system", label: "System", glyph: "◉" },
  { id: "archive", label: "Archive", glyph: "▤" },
  { id: "document", label: "Document", glyph: "▥" },
  { id: "terminal", label: "Terminal", glyph: ">_" },
  { id: "access", label: "Access Terminal", glyph: "⌘", accent: true },
];

const STACK_OFFSET = 28;
const BASE_POS: Record<AppId, WindowPos> = {
  about: { x: 90, y: 70, w: 420, h: 330 },
  system: { x: 150, y: 120, w: 400, h: 360 },
  archive: { x: 110, y: 100, w: 430, h: 380 },
  document: { x: 180, y: 140, w: 420, h: 380 },
  terminal: { x: 130, y: 110, w: 500, h: 400 },
  access: { x: 200, y: 150, w: 380, h: 320 },
};

function pkgVersion(): string {
  return "1.6.0";
}

export default function WorldHomepage() {
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [glitchKey, setGlitchKey] = useState(0);
  const [rain, setRain] = useState(false);
  const [clock, setClock] = useState("");
  const konami = useRef<string[]>([]);
  const konamiSeq = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ---- Boot sequence ---- */
  useEffect(() => {
    const seq = [
      { t: 150, text: "GAS ELECTRONIC OS v" + pkgVersion() + " — memuat inti…", ok: true },
      { t: 350, text: "mengindeks arsip produksi…", ok: true },
      { t: 560, text: "memeriksa integritas jendela…", ok: true },
      { t: 760, text: "menghubungkan terminal…", ok: true },
      { t: 940, text: "dunia siap. selamat menjelajah.", ok: true },
    ];
    let i = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const push = () => {
      if (i < seq.length) {
        const s = seq[i];
        timers.push(
          setTimeout(() => {
            setBootLines((prev) => [...prev, s.text]);
            i += 1;
            push();
          }, s.t)
        );
      } else {
        timers.push(setTimeout(() => setBooted(true), 500));
      }
    };
    push();
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ---- Clock ---- */
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /* ---- Ambient canvas: bintang + partikel data melayang ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    type P = { x: number; y: number; z: number; vx: number; vy: number; r: number; c: string };
    let pts: P[] = [];
    const spawn = () => {
      const count = Math.min(90, Math.max(40, Math.round((w * h) / 24000)));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.18,
        r: 0.6 + Math.random() * 1.6,
        c: ["#7dd3fc", "#5eead4", "#a5b4fc", "#fbbf24"][Math.floor(Math.random() * 4)],
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        const alpha = 0.12 + 0.35 * p.z;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    spawn();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ---- Konami (keyboard) + event terminal ---- */
  const triggerGlitch = () => {
    setGlitchKey((k) => k + 1);
    setRain((r) => !r);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      konami.current.push(key);
      konami.current = konami.current.slice(-konamiSeq.length);
      if (konami.current.join(",") === konamiSeq.join(",")) {
        konami.current = [];
        triggerGlitch();
      }
    };
    const onTermKonami = () => triggerGlitch();
    window.addEventListener("keydown", onKey);
    window.addEventListener("world:konami", onTermKonami);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("world:konami", onTermKonami);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Window ops ---- */
  const openApp = useCallback((id: AppId) => {
    setWindows((prev) => {
      const existing = prev.find((win) => win.id === id);
      if (existing) {
        return prev.map((win) => ({
          ...win,
          focused: win.id === id,
          minimized: win.id === id ? false : win.minimized,
          closing: false,
        }));
      }
      const count = prev.length;
      const base = BASE_POS[id];
      const pos = {
        x: Math.min(base.x + STACK_OFFSET * count, window.innerWidth - 480),
        y: Math.min(base.y + STACK_OFFSET * count, window.innerHeight - 260),
        w: Math.min(base.w, window.innerWidth - 40),
        h: Math.min(base.h, window.innerHeight - 140),
      };
      return [
        ...prev.map((win) => ({ ...win, focused: false })),
        { id, focused: true, closing: false, minimized: false, pos },
      ];
    });
    setGlitchKey((k) => k + 1);
  }, []);

  const closeApp = useCallback((id: AppId) => {
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, closing: true } : win)));
    setTimeout(() => {
      setWindows((prev) => prev.filter((win) => win.id !== id));
    }, 230);
  }, []);

  const minimizeApp = useCallback((id: AppId) => {
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, minimized: true } : win)));
  }, []);

  const focusApp = useCallback((id: AppId) => {
    setWindows((prev) => prev.map((win) => ({ ...win, focused: win.id === id })));
  }, []);

  const renderBody = (id: AppId) => {
    switch (id) {
      case "about":
        return <AboutApp />;
      case "system":
        return <SystemApp />;
      case "archive":
        return <ArchiveApp />;
      case "document":
        return <DocumentApp />;
      case "terminal":
        return <TerminalApp onAccess={() => openApp("access")} />;
      case "access":
        return <AccessApp onEnter={() => router.push("/login")} delay={1300} />;
    }
  };

  const openCount = windows.filter((win) => !win.minimized).length;
  const [startOpen, setStartOpen] = useState(false);
  const startRef = useRef<HTMLDivElement | null>(null);

  // Klik di luar start menu menutupnya.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (startOpen && startRef.current && !startRef.current.contains(e.target as Node)) {
        setStartOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [startOpen]);

  const startItem = (id: AppId) => {
    setStartOpen(false);
    openApp(id);
  };

  const shutdown = () => {
    setStartOpen(false);
    triggerGlitch();
    setRain(true);
    setTimeout(() => setRain(false), 6000);
  };

  return (
    <div className="world">
      <canvas ref={canvasRef} className="world__canvas" aria-hidden />
      <div className="world__grid" aria-hidden />
      <div className="world__glow" aria-hidden />

      {/* Glitch flash */}
      {glitchKey > 0 && <div key={glitchKey} className="world-glitch world-glitch--on" aria-hidden />}

      {/* Rain easter egg */}
      <RainCanvas active={rain} />

      {/* Desktop icons */}
      <div className="world-icons">
        {ICON_ORDER.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`world-icon ${item.accent ? "world-icon--accent" : ""}`}
            style={{ animationDelay: `${450 + i * 90}ms` }}
            onClick={() => openApp(item.id)}
            aria-label={`Buka ${item.label}`}
          >
            <span className="world-icon__glyph">{item.glyph}</span>
            <span className="world-icon__label">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Windows */}
      {windows.map((win) => (
        <WorldWindow
          key={win.id}
          id={win.id}
          title={APP_META[win.id].title}
          icon={APP_META[win.id].icon}
          pos={win.pos}
          focused={win.focused}
          closing={win.closing}
          minimized={win.minimized}
          terminal={APP_META[win.id].terminal}
          onFocus={() => focusApp(win.id)}
          onMinimize={() => minimizeApp(win.id)}
          onClose={() => closeApp(win.id)}
        >
          {renderBody(win.id)}
        </WorldWindow>
      ))}

      {/* Taskbar */}
      <div className="world-taskbar">
        <button type="button" className="world-taskbar__logo" onClick={() => setStartOpen((v) => !v)} aria-label="Start">
          <span className="world-taskbar__logo-flag" aria-hidden />
          Start
        </button>
        <div className="world-taskbar__tasks">
          {windows.map((win) => (
            <button
              key={win.id}
              type="button"
              className={`world-taskbar__task ${win.focused && !win.minimized ? "world-taskbar__task--active" : ""}`}
              onClick={() => {
                if (win.minimized) openApp(win.id);
                else focusApp(win.id);
              }}
            >
              <span aria-hidden>{APP_META[win.id].icon}</span>
              {APP_META[win.id].title}
            </button>
          ))}
          {windows.length === 0 && (
            <span className="text-[11px] text-[#5b6c94]">tidak ada jendela terbuka — pilih ikon di desktop</span>
          )}
        </div>
        <div className="world-taskbar__status">
          <span className="world-taskbar__seg">
            <span className="text-[#000000]">●</span> online
          </span>
          <span className="world-taskbar__seg">
            {openCount > 0 ? `${openCount} jendela` : "idle"}
          </span>
          <span className="world-taskbar__clock">{clock}</span>
        </div>
      </div>

      {/* Start menu (Win95) */}
      {startOpen && (
        <div ref={startRef} className="world-start" role="menu">
          <div className="world-start__rail">GE-OS</div>
          <div className="world-start__list">
            {ICON_ORDER.map((item) => (
              <button key={item.id} type="button" className="world-start__item" role="menuitem" onClick={() => startItem(item.id)}>
                <span aria-hidden>{item.glyph}</span>
                {item.label}
              </button>
            ))}
            <div className="world-start__sep" />
            <button type="button" className="world-start__item" onClick={shutdown}>
              <span aria-hidden>⏻</span>
              Shutdown… (jangan benar-benar mati)
            </button>
          </div>
        </div>
      )}

      {/* CRT overlay */}
      <div className="crt crt--flicker" aria-hidden />

      {/* Boot overlay */}
      {!booted && (
        <div className="world-boot" role="status" aria-live="polite">
          <div className="world-boot__logo">THE WORLD</div>
          <div className="world-boot__sub">GAS ELECTRONIC · Engineering Production System</div>
          <div className="world-boot__bar">
            <div className="world-boot__bar-fill" style={{ width: `${Math.min(100, bootLines.length * 20)}%` }} />
          </div>
          <div className="world-boot__line">
            {bootLines.map((line) => (
              <div key={line} className="world-boot__line--ok">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Rain canvas (easter egg: hujan data) ---- */
function RainCanvas({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const chars = "01アイウエオカキクケコサシスセソABCDEF<>#*+";
    let drops: { x: number; y: number; s: number }[] = [];
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    const init = () => {
      const cols = Math.floor(w / 14);
      drops = Array.from({ length: cols }, (_, i) => ({ x: i * 14, y: Math.random() * h, s: 8 + Math.random() * 10 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = "12px monospace";
      for (const d of drops) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.98 ? "#5eead4" : "rgba(56,189,248,0.55)";
        ctx.fillText(ch, d.x, d.y);
        d.y += d.s;
        if (d.y > h && Math.random() > 0.96) d.y = -10;
      }
      raf = requestAnimationFrame(draw);
    };
    resize();
    init();
    if (active) draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={ref} className={`world-rain ${active ? "world-rain--on" : ""}`} aria-hidden />;
}
