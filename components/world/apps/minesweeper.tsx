"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const W = 9;
const H = 9;
const MINES = 10;
const NUM_COLORS = ["#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; adj: number };
type Status = "playing" | "won" | "lost";

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

export function MinesweeperApp(): ReactNode {
  const [cells, setCells] = useState<Cell[]>(() => buildBoard());
  const [status, setStatus] = useState<Status>("playing");
  const [seconds, setSeconds] = useState(0);
  const [pressed, setPressed] = useState(false);
  const startedRef = useRef(false);
  const flags = cells.filter((c) => c.flagged).length;

  const win = useCallback((c: Cell[]) => c.filter((c) => !c.mine && !c.revealed).length === 0, []);

  useEffect(() => {
    if (status !== "playing" || !startedRef.current) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    const up = () => setPressed(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  const reset = () => {
    setCells(buildBoard());
    setStatus("playing");
    setSeconds(0);
    startedRef.current = false;
  };

  const reveal = (x: number, y: number) => {
    if (status !== "playing") return;
    setCells((prev) => {
      let next = prev;
      if (!startedRef.current) {
        startedRef.current = true;
        next = buildBoard(x, y);
      }
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
    setCells((prev) => {
      const i = idx(x, y);
      const c = prev[i];
      if (!c.revealed || c.adj === 0) return prev;
      const around: [number, number][] = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) around.push([nx, ny]);
        }
      }
      const f = around.filter(([cx, cy]) => prev[idx(cx, cy)].flagged).length;
      if (f !== c.adj) return prev;
      const next = prev;
      for (const [cx, cy] of around) {
        if (!next[idx(cx, cy)].flagged) {
          reveal(cx, cy);
        }
      }
      return next;
    });
  };

  const face = status === "won" ? "😎" : status === "lost" ? "😵" : pressed ? "😮" : "🙂";
  const minesLeft = MINES - flags;

  return (
    <div className="win95-app win95-mine" onMouseDown={() => setPressed(true)}>
      <div className="win95-mine__top">
        <div className="win95-mine__count">{String(Math.max(0, minesLeft)).padStart(3, "0")}</div>
        <button type="button" className="win95-mine__face" onClick={reset} aria-label="Restart permainan">
          {face}
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
              onContextMenu={(e) => { e.preventDefault(); toggleFlag(x, y); }}
              onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); chord(x, y); } }}
              aria-label={`Sel ${x + 1},${y + 1}`}
            >
              {c.revealed
                ? c.mine
                  ? "💣"
                  : c.adj > 0
                    ? c.adj
                    : ""
                : c.flagged
                  ? "🚩"
                  : ""}
            </button>
          );
        })}
      </div>
      {status !== "playing" && (
        <div className="win95-mine__banner">
          {status === "won" ? "🏆 Anda menang! Wajah untuk main lagi." : "💥 Kena bom! Klik wajah untuk ulangi."}
        </div>
      )}
    </div>
  );
}
