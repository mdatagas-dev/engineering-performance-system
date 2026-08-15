"use client";

import { useEffect, useState, type ReactNode } from "react";

const CELL = 26;
const N = 81;

type Board = (number | null)[];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const rowOf = (i: number): number => Math.floor(i / 9);
const colOf = (i: number): number => i % 9;
const boxOf = (i: number): number => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

function validAt(b: Board, i: number, v: number): boolean {
  const r = rowOf(i);
  const c = colOf(i);
  const b3 = boxOf(i);
  for (let k = 0; k < 9; k++) {
    if (k !== c && b[r * 9 + k] === v) return false;
    if (k !== r && b[k * 9 + c] === v) return false;
  }
  const br = Math.floor(b3 / 3) * 3;
  const bc = (b3 % 3) * 3;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const j = (br + y) * 9 + bc + x;
      if (j !== i && b[j] === v) return false;
    }
  }
  return true;
}

function fillGrid(): Board {
  const g: Board = Array(N).fill(null);
  const fill = (): boolean => {
    let i = -1;
    for (let k = 0; k < N; k++) {
      if (g[k] === null) {
        i = k;
        break;
      }
    }
    if (i === -1) return true;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (validAt(g, i, v)) {
        g[i] = v;
        if (fill()) return true;
        g[i] = null;
      }
    }
    return false;
  };
  fill();
  return g;
}

function countSolutions(b: Board, limit: number): number {
  const g = b.slice();
  let i = -1;
  for (let k = 0; k < N; k++) {
    if (g[k] === null) {
      i = k;
      break;
    }
  }
  if (i === -1) return 1;
  let count = 0;
  for (let v = 1; v <= 9; v++) {
    if (validAt(g, i, v)) {
      g[i] = v;
      count += countSolutions(g, limit - count);
      if (count >= limit) break;
      g[i] = null;
    }
  }
  return count;
}

function makePuzzle(): { grid: Board; given: boolean[] } {
  const full = fillGrid();
  const grid = full.slice();
  const given: boolean[] = Array(N).fill(true);
  let removed = 0;
  for (const i of shuffle(Array.from({ length: N }, (_, k) => k))) {
    if (removed >= 45) break;
    const backup = grid[i];
    grid[i] = null;
    if (countSolutions(grid, 2) !== 1) {
      grid[i] = backup;
      continue;
    }
    given[i] = false;
    removed++;
  }
  return { grid, given };
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function conflictsAt(g: Board, i: number): boolean {
  const v = g[i];
  if (v === null) return false;
  return !validAt(g, i, v);
}

function isComplete(g: Board): boolean {
  return g.every((v) => v !== null);
}

export function SudokuGame(): ReactNode {
  const [puzzle, setPuzzle] = useState<{ grid: Board; given: boolean[] }>(makePuzzle);
  const [sel, setSel] = useState(-1);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);

  const setCell = (i: number, v: number | null) => {
    if (won || puzzle.given[i]) return;
    if (v !== null && (v < 1 || v > 9)) return;
    setPuzzle((p) => {
      const grid = p.grid.slice();
      grid[i] = v;
      const complete = isComplete(grid);
      const valid = complete && grid.every((c, k) => c === null || validAt(grid, k, c));
      if (valid) setWon(true);
      return { ...p, grid };
    });
    setStarted(true);
    setSel(i);
  };

  const newGame = () => {
    setPuzzle(makePuzzle());
    setSel(-1);
    setStarted(false);
    setSeconds(0);
    setWon(false);
  };

  useEffect(() => {
    if (!started || won) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, won]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT")) e.target.blur();
      if (sel < 0) return;
      const r = rowOf(sel);
      const c = colOf(sel);
      let next = -1;
      if (e.key === "ArrowUp") next = r > 0 ? sel - 9 : sel;
      else if (e.key === "ArrowDown") next = r < 8 ? sel + 9 : sel;
      else if (e.key === "ArrowLeft") next = c > 0 ? sel - 1 : sel;
      else if (e.key === "ArrowRight") next = c < 8 ? sel + 1 : sel;
      if (next >= 0) {
        setSel(next);
        return;
      }
      if (/^[1-9]$/.test(e.key)) setCell(sel, Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete") setCell(sel, null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="xg-sd">
      <style jsx>{`
        .xg-sd {
          width: fit-content;
          margin: 0 auto;
          background: #ece9d8;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          color: #000;
          padding: 8px;
          user-select: none;
          -webkit-user-select: none;
        }
        .xg-sd__bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 2px 8px;
        }
        .xg-sd__stat {
          font-weight: 700;
        }
        .xg-sd__btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          padding: 2px 8px;
          cursor: pointer;
        }
        .xg-sd__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-sd__grid {
          display: grid;
          grid-template-columns: repeat(9, ${CELL}px);
          grid-template-rows: repeat(9, ${CELL}px);
          background: #000;
          gap: 1px;
          border: 2px solid #000;
          width: fit-content;
        }
        .xg-sd__cell {
          width: ${CELL}px;
          height: ${CELL}px;
          padding: 0;
          border: 0;
          box-sizing: border-box;
          background: #fff;
          font-family: inherit;
          font-size: 14px;
          line-height: 1;
          text-align: center;
          cursor: pointer;
        }
        .xg-sd__cell--l3 {
          border-left: 2px solid #000;
        }
        .xg-sd__cell--t3 {
          border-top: 2px solid #000;
        }
        .xg-sd__cell--given {
          font-weight: 700;
        }
        .xg-sd__cell--sel {
          background: #b6d7ff;
        }
        .xg-sd__cell--conflict {
          color: #c00;
          font-weight: 700;
        }
        .xg-sd__pad {
          display: flex;
          gap: 3px;
          padding: 8px 0 4px;
        }
        .xg-sd__num {
          width: ${CELL - 2}px;
          height: ${CELL - 2}px;
          padding: 0;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          color: #000;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          cursor: pointer;
        }
        .xg-sd__num:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-sd__msg {
          font-weight: 700;
          color: #0a246a;
          text-align: center;
          padding: 0 0 6px;
        }
        .xg-sd__hint {
          text-align: center;
        }
      `}</style>
      <div className="xg-sd__bar">
        <span className="xg-sd__stat">Waktu: {fmtTime(seconds)}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="xg-sd__btn" onClick={newGame}>
          Game Baru
        </button>
      </div>
      {won && <div className="xg-sd__msg">Selamat! Anda menang. Waktu: {fmtTime(seconds)}</div>}
      <div className="xg-sd__grid" role="grid" aria-label="Papan Sudoku 9x9">
        {puzzle.grid.map((v, i) => {
          const r = rowOf(i);
          const c = colOf(i);
          const cls = [
            "xg-sd__cell",
            c % 3 === 0 ? "xg-sd__cell--l3" : "",
            r % 3 === 0 ? "xg-sd__cell--t3" : "",
            puzzle.given[i] ? "xg-sd__cell--given" : "",
            sel === i ? "xg-sd__cell--sel" : "",
            v !== null && conflictsAt(puzzle.grid, i) ? "xg-sd__cell--conflict" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={i} type="button" className={cls} onClick={() => setSel(i)} aria-label={`Sel baris ${r + 1} kolom ${c + 1}`}>
              {v ?? ""}
            </button>
          );
        })}
      </div>
      <div className="xg-sd__pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className="xg-sd__num" onClick={() => sel >= 0 && setCell(sel, n)}>
            {n}
          </button>
        ))}
        <button type="button" className="xg-sd__num" onClick={() => sel >= 0 && setCell(sel, null)} aria-label="Hapus">
          X
        </button>
      </div>
      <div className="xg-sd__hint">Klik sel lalu tekan 1-9 atau tombol angka &middot; panah pindah sel &middot; X hapus</div>
    </div>
  );
}
