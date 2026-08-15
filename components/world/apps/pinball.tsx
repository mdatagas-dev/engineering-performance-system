"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const W = 520;
const H = 360;
const R = 7;
const GRAV = 640;
const FLIP_LEN = 60;
const FLIP_HALF = 8;
const REST_ANG = -0.5;
const UP_ANG = 0.85;
const LP = { x: 72, y: H - 30 };
const RP = { x: W - 72, y: H - 30 };
const LKEYS = ["ArrowLeft", "a", "A"];
const RKEYS = ["ArrowRight", "l", "L"];
const BUMPERS = [
  { x: 260, y: 120, r: 18, score: 25 },
  { x: 150, y: 70, r: 15, score: 50 },
  { x: 370, y: 70, r: 15, score: 50 },
  { x: 260, y: 195, r: 14, score: 25 },
];

interface Game {
  bx: number;
  by: number;
  bvx: number;
  bvy: number;
  score: number;
  lives: number;
  paused: boolean;
  over: boolean;
  lAng: number;
  rAng: number;
  lPressed: boolean;
  rPressed: boolean;
  flash: number[];
}

interface Ui {
  score: number;
  lives: number;
  paused: boolean;
  over: boolean;
}

function makeGame(): Game {
  return {
    bx: W / 2,
    by: 50,
    bvx: (Math.random() * 2 - 1) * 140,
    bvy: 130,
    score: 0,
    lives: 3,
    paused: false,
    over: false,
    lAng: REST_ANG,
    rAng: REST_ANG,
    lPressed: false,
    rPressed: false,
    flash: [0, 0, 0, 0],
  };
}

function uiFrom(g: Game): Ui {
  return { score: g.score, lives: g.lives, paused: g.paused, over: g.over };
}

function resetBall(g: Game): void {
  g.bx = W / 2;
  g.by = 50;
  g.bvx = (Math.random() * 2 - 1) * 140;
  g.bvy = 130;
}

function collideFlipper(g: Game, pivot: { x: number; y: number }, ang: number, left: boolean): void {
  const ex = pivot.x + (left ? 1 : -1) * Math.cos(ang) * FLIP_LEN;
  const ey = pivot.y - Math.sin(ang) * FLIP_LEN;
  const abx = ex - pivot.x;
  const aby = ey - pivot.y;
  const t = Math.max(0, Math.min(1, ((g.bx - pivot.x) * abx + (g.by - pivot.y) * aby) / (abx * abx + aby * aby)));
  const cx = pivot.x + abx * t;
  const cy = pivot.y + aby * t;
  const dx = g.bx - cx;
  const dy = g.by - cy;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d >= R + FLIP_HALF) return;
  const nx = dx / d;
  const ny = dy / d;
  g.bx = cx + nx * (R + FLIP_HALF);
  g.by = cy + ny * (R + FLIP_HALF);
  const dot = g.bvx * nx + g.bvy * ny;
  if (dot < 0) {
    g.bvx -= 2 * dot * nx;
    g.bvy -= 2 * dot * ny;
  }
  const active = left ? g.lPressed : g.rPressed;
  if (active) {
    g.bvx += nx * 260;
    g.bvy += ny * 260 - 300;
  }
}

function step(g: Game, dt: number, now: number): void {
  const target = g.lPressed ? UP_ANG : REST_ANG;
  g.lAng += (target - g.lAng) * Math.min(1, dt * 22);
  g.rAng += (target - g.rAng) * Math.min(1, dt * 22);
  if (g.paused || g.over) return;
  g.bvy += GRAV * dt;
  g.bx += g.bvx * dt;
  g.by += g.bvy * dt;
  if (g.bx < R) {
    g.bx = R;
    g.bvx = Math.abs(g.bvx);
  }
  if (g.bx > W - R) {
    g.bx = W - R;
    g.bvx = -Math.abs(g.bvx);
  }
  if (g.by < R) {
    g.by = R;
    g.bvy = Math.abs(g.bvy);
  }
  for (let i = 0; i < BUMPERS.length; i++) {
    const b = BUMPERS[i];
    const dx = g.bx - b.x;
    const dy = g.by - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < b.r + R) {
      const nx = dx / d;
      const ny = dy / d;
      g.bx = b.x + nx * (b.r + R);
      g.by = b.y + ny * (b.r + R);
      let sp = Math.hypot(g.bvx, g.bvy) * 1.15;
      if (sp < 400) sp = 400;
      if (sp > 920) sp = 920;
      g.bvx = nx * sp;
      g.bvy = ny * sp;
      g.score += b.score;
      g.flash[i] = now + 260;
    }
  }
  collideFlipper(g, LP, g.lAng, true);
  collideFlipper(g, RP, g.rAng, false);
  if (g.by > H + 30) {
    g.lives -= 1;
    if (g.lives <= 0) {
      g.lives = 0;
      g.over = true;
    } else {
      resetBall(g);
    }
  }
}

function drawFlipper(
  ctx: CanvasRenderingContext2D,
  pivot: { x: number; y: number },
  ang: number,
  left: boolean,
): void {
  const ex = pivot.x + (left ? 1 : -1) * Math.cos(ang) * FLIP_LEN;
  const ey = pivot.y - Math.sin(ang) * FLIP_LEN;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = "#3c3c3c";
  ctx.lineWidth = 18;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = "#d8d8d8";
  ctx.lineWidth = 12;
  ctx.stroke();
}

function draw(g: Game, ctx: CanvasRenderingContext2D, now: number): void {
  ctx.fillStyle = "#0b0b33";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#5566aa";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, W - 4, H - 4);
  for (let i = 0; i < BUMPERS.length; i++) {
    const b = BUMPERS[i];
    const lit = now < g.flash[i];
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = lit ? "#ff6060" : "#b02020";
    ctx.fill();
    ctx.strokeStyle = lit ? "#ffd0d0" : "#701010";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "9px Tahoma";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(b.score), b.x, b.y);
  }
  drawFlipper(ctx, LP, g.lAng, true);
  drawFlipper(ctx, RP, g.rAng, false);
  ctx.beginPath();
  ctx.arc(g.bx, g.by, R, 0, Math.PI * 2);
  ctx.fillStyle = "#f8f8f8";
  ctx.fill();
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#888";
  ctx.font = "9px Tahoma";
  ctx.textAlign = "left";
  ctx.fillText("P: jeda", 8, H - 8);
  if (g.paused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText("JEDA (P)", W / 2, H / 2);
  }
  if (g.over) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f00";
    ctx.font = "bold 18px Tahoma";
    ctx.textAlign = "center";
    ctx.fillText("PERMAINAN SELESAI", W / 2, H / 2 - 10);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Tahoma";
    ctx.fillText("Skor akhir: " + g.score, W / 2, H / 2 + 14);
  }
}

export function PinballGame(): ReactNode {
  const gameRef = useRef<Game | null>(null);
  if (gameRef.current === null) gameRef.current = makeGame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ui, setUi] = useState<Ui>({ score: 0, lives: 3, paused: false, over: false });
  const uiRef = useRef<Ui>(ui);

  const syncUi = useCallback((g: Game) => {
    const n = uiFrom(g);
    const o = uiRef.current;
    if (n.score !== o.score || n.lives !== o.lives || n.paused !== o.paused || n.over !== o.over) {
      uiRef.current = n;
      setUi(n);
    }
  }, []);

  useEffect(() => {
    const g = gameRef.current as Game;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(g, dt, now);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) draw(g, ctx, now);
      syncUi(g);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [syncUi]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (LKEYS.includes(e.key)) {
        gameRef.current!.lPressed = true;
        e.preventDefault();
      } else if (RKEYS.includes(e.key)) {
        gameRef.current!.rPressed = true;
        e.preventDefault();
      } else if (e.key === "p" || e.key === "P") {
        if (!gameRef.current!.over) gameRef.current!.paused = !gameRef.current!.paused;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (LKEYS.includes(e.key)) gameRef.current!.lPressed = false;
      if (RKEYS.includes(e.key)) gameRef.current!.rPressed = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const setFlipper = (side: "l" | "r") => (v: boolean) => {
    const g = gameRef.current;
    if (!g) return;
    if (side === "l") g.lPressed = v;
    else g.rPressed = v;
  };

  const newGame = () => {
    gameRef.current = makeGame();
    syncUi(gameRef.current);
  };

  return (
    <div className="xg-app xg-p">
      <style jsx>{`
        .xg-app {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #c0c0c0;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          color: #000;
          user-select: none;
          -webkit-user-select: none;
        }
        .xg-p__top {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px 4px;
        }
        .xg-p__label {
          font-weight: 700;
        }
        .xg-p__score {
          background: #000;
          color: #f00;
          font-family: "Courier New", monospace;
          font-size: 16px;
          font-weight: 700;
          padding: 2px 8px;
          border: 1px solid #808080;
          min-width: 70px;
          text-align: center;
        }
        .xg-p__lives {
          font-weight: 700;
        }
        .xg-p__canvas {
          display: block;
          width: 100%;
          max-width: 520px;
          height: auto;
          margin: 0 auto;
          background: #000;
          border: 2px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-p__hint {
          color: #555;
          padding: 2px 10px 0;
          text-align: center;
        }
        .xg-p__controls {
          display: flex;
          gap: 8px;
          justify-content: center;
          padding: 6px 10px;
          flex: 1;
          align-items: flex-start;
        }
        .xg-p__flip {
          flex: 1;
          max-width: 180px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          padding: 10px 0;
          cursor: pointer;
          touch-action: none;
          -webkit-user-select: none;
        }
        .xg-p__flip:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-btn {
          font-family: inherit;
          font-size: 11px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          padding: 3px 10px;
          cursor: pointer;
        }
        .xg-btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
      `}</style>
      <div className="xg-p__top">
        <span className="xg-p__label">Skor:</span>
        <span className="xg-p__score">{String(ui.score).padStart(6, "0")}</span>
        <span className="xg-p__lives">Nyawa: {"\u2588".repeat(ui.lives)}</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="xg-btn" onClick={newGame}>
          Game Baru
        </button>
      </div>
      <canvas ref={canvasRef} className="xg-p__canvas" width={W} height={H} aria-label="Papan Pinball" />
      <div className="xg-p__hint">Kiri: panah kiri / A - Kanan: panah kanan / L - P: jeda</div>
      <div className="xg-p__controls">
        <button
          type="button"
          className="xg-p__flip"
          onPointerDown={() => setFlipper("l")(true)}
          onPointerUp={() => setFlipper("l")(false)}
          onPointerLeave={() => setFlipper("l")(false)}
          onPointerCancel={() => setFlipper("l")(false)}
        >
          KIRI
        </button>
        <button
          type="button"
          className="xg-p__flip"
          onPointerDown={() => setFlipper("r")(true)}
          onPointerUp={() => setFlipper("r")(false)}
          onPointerLeave={() => setFlipper("r")(false)}
          onPointerCancel={() => setFlipper("r")(false)}
        >
          KANAN
        </button>
      </div>
    </div>
  );
}
