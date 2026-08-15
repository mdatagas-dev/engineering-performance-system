"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

const W = 9;
const H = 9;
const MINES = 10;
const NUM_COLORS = ["#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number };
type Status = "playing" | "won" | "lost";
type FaceKind = "normal" | "press" | "dead" | "cool";

function idx(x: number, y: number): number {
  return y * W + x;
}

function buildBoard(avoidX = -1, avoidY = -1): Cell[] {
  const cells: Cell[] = Array.from({ length: W * H }, () => ({ mine: false, revealed: false, flagged: false, adj: 0 }));
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * W * H);
    const x = i % W;
    const y = Math.floor(i / W);
    if (x === avoidX && y === avoidY) continue;
    if (!cells[i].mine) { cells[i].mine = true; placed++; }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (cells[idx(x, y)].mine) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H && cells[idx(nx, ny)].mine) n++;
        }
      }
      cells[idx(x, y)].adj = n;
    }
  }
  return cells;
}

function Face({ kind }: { kind: FaceKind }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" style={{ display: "block", margin: "auto" }} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#ffd800" stroke="#000" strokeWidth="1.5" />
      {kind === "dead" ? (
        <>
          <path d="M6.5 6.5 l4 4 M10.5 6.5 l-4 4" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <path d="M13.5 6.5 l4 4 M17.5 6.5 l-4 4" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          <path d="M7.5 16.5 h9" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : kind === "cool" ? (
        <>
          <rect x="5.5" y="7" width="5" height="4.5" rx="1.2" fill="#000" />
          <rect x="13.5" y="7" width="5" height="4.5" rx="1.2" fill="#000" />
          <rect x="10" y="8.5" width="4" height="1.8" fill="#000" />
          <path d="M5.5 8.5 h-1.6 M18.5 8.5 h1.6" stroke="#000" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M7.5 14.5 Q12 18.5 16.5 14.5" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="8.5" cy="9.5" r="1.6" fill="#000" />
          <circle cx="15.5" cy="9.5" r="1.6" fill="#000" />
          {kind === "press" ? (
            <ellipse cx="12" cy="15" rx="2.7" ry="3.5" fill="#000" />
          ) : (
            <path d="M7 13.5 Q12 18.5 17 13.5" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </>
      )}
    </svg>
  );
}

function Bomb(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <g stroke="#000" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2.4 v2.4" />
        <path d="M2.4 12 h2.4" />
        <path d="M19.2 12 h2.4" />
        <path d="M12 19.2 v2.4" />
        <path d="M4.6 4.6 l1.7 1.7" />
        <path d="M17.7 17.7 l1.7 1.7" />
        <path d="M19.4 4.6 l-1.7 1.7" />
        <path d="M6.3 17.7 l-1.7 1.7" />
      </g>
      <circle cx="12" cy="12" r="7" fill="#111" />
      <circle cx="9.6" cy="9.6" r="1.9" fill="#7a7a7a" />
    </svg>
  );
}

function Flag(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M11.2 3.5 v16.5 M11.2 20 L15.6 20" stroke="#000" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M11.2 3.5 L18 8 L11.2 12.5 Z" fill="#d00" stroke="#900" strokeWidth="0.7" strokeLinejoin="round" />
    </svg>
  );
}

export function MinesweeperApp(): ReactNode {
  const [cells, setCells] = useState<Cell[]>(() => buildBoard());
  const [status, setStatus] = useState<Status>("playing");
  const [seconds, setSeconds] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  const pressedButtons = useRef(new Set<number>());
  const flags = cells.filter((c) => c.flagged).length;

  const win = useCallback((c: Cell[]) => c.filter((c) => !c.mine && !c.revealed).length === 0, []);

  useEffect(() => {
    if (!started || status !== "playing") return;
    const t = setInterval(() => setSeconds((s) => Math.min(s + 1, 999)), 1000);
    return () => clearInterval(t);
  }, [started, status]);

  useEffect(() => {
    const up = () => {
      pressedButtons.current.clear();
      setPressed(false);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  const reset = () => {
    setCells(buildBoard());
    setStatus("playing");
    setSeconds(0);
    setStarted(false);
    startedRef.current = false;
    pressedButtons.current.clear();
    setPressed(false);
  };

  const reveal = (x: number, y: number) => {
    if (status !== "playing") return;
    const first = !startedRef.current;
    setCells((prev) => {
      let next = prev;
      if (first) next = buildBoard(x, y);
      if (next[idx(x, y)].flagged || next[idx(x, y)].revealed) return prev;
      const arr = next.slice();
      if (arr[idx(x, y)].mine) {
        arr.forEach((c) => { if (c.mine) c.revealed = true; });
        setStatus("lost");
        return arr;
      }
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop() as [number, number];
        const i = idx(cx, cy);
        if (arr[i].revealed || arr[i].flagged) continue;
        arr[i].revealed = true;
        if (arr[i].adj === 0 && !arr[i].mine) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < W && ny >= 0 && ny < H) stack.push([nx, ny]);
            }
          }
        }
      }
      if (win(arr)) {
        arr.forEach((c) => { if (c.mine) c.flagged = true; });
        setStatus("won");
      }
      return arr;
    });
    if (first) {
      startedRef.current = true;
      setStarted(true);
    }
  };

  const toggleFlag = (x: number, y: number) => {
    if (status !== "playing") return;
    setCells((prev) => {
      const i = idx(x, y);
      if (prev[i].revealed) return prev;
      const arr = prev.slice();
      arr[i].flagged = !arr[i].flagged;
      return arr;
    });
  };

  const chord = (x: number, y: number) => {
    if (status !== "playing") return;
    const c = cells[idx(x, y)];
    if (!c.revealed || c.adj === 0) return;
    const around: [number, number][] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) around.push([nx, ny]);
      }
    }
    const f = around.filter(([cx, cy]) => cells[idx(cx, cy)].flagged).length;
    if (f !== c.adj) return;
    for (const [cx, cy] of around) {
      if (!cells[idx(cx, cy)].flagged) reveal(cx, cy);
    }
  };

  const handleDown = (e: ReactMouseEvent<HTMLButtonElement>, x: number, y: number) => {
    if (e.button !== 0 && e.button !== 2) return;
    if (e.button === 0) setPressed(true);
    pressedButtons.current.add(e.button);
    if (pressedButtons.current.has(0) && pressedButtons.current.has(2)) {
      chord(x, y);
      pressedButtons.current.clear();
      setPressed(false);
    }
  };

  const face: FaceKind = status === "won" ? "cool" : status === "lost" ? "dead" : pressed ? "press" : "normal";
  const minesLeft = MINES - flags;

  return (
    <div className="win95-app win95-mine">
      <div className="win95-mine__top">
        <div className="win95-mine__count">{String(Math.max(0, minesLeft)).padStart(3, "0")}</div>
        <button type="button" className="win95-mine__face" onClick={reset} aria-label="Restart permainan">
          <Face kind={face} />
        </button>
        <div className="win95-mine__count">{String(Math.min(seconds, 999)).padStart(3, "0")}</div>
      </div>
      <div className="win95-mine__grid">
        {cells.map((c, i) => {
          const x = i % W;
          const y = Math.floor(i / W);
          return (
            <button
              key={i}
              type="button"
              className={`win95-mine__cell ${c.revealed ? "win95-mine__cell--revealed" : ""}`}
              style={c.revealed && c.adj > 0 && !c.mine ? { color: NUM_COLORS[c.adj - 1] } : undefined}
              onClick={() => reveal(x, y)}
              onMouseDown={(e) => handleDown(e, x, y)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!pressedButtons.current.has(0)) toggleFlag(x, y);
              }}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); chord(x, y); } }}
              aria-label={`Sel ${x + 1},${y + 1}`}
            >
              {c.revealed
                ? c.mine
                  ? <Bomb />
                  : c.adj > 0
                    ? c.adj
                    : ""
                : c.flagged
                  ? <Flag />
                  : ""}
            </button>
          );
        })}
      </div>
      {status !== "playing" && (
        <div className="win95-mine__banner" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Face kind={status === "won" ? "cool" : "dead"} />
          <span>{status === "won" ? "Anda menang! Wajah untuk main lagi." : "Kena bom! Klik wajah untuk ulangi."}</span>
        </div>
      )}
    </div>
  );
}
