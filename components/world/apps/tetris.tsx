"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

const COLS = 10;
const ROWS = 20;
const CELL = 19;

type PieceKind = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
type Cell = [number, number];

const SHAPES: Record<PieceKind, Cell[]> = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]],
};

const COLORS: Record<PieceKind, string> = {
  I: "#00b8d4",
  O: "#f6c400",
  T: "#9c27b0",
  S: "#4caf50",
  Z: "#e53935",
  J: "#1e88e5",
  L: "#ff8f00",
};

const KINDS = Object.keys(SHAPES) as PieceKind[];

type Piece = { kind: PieceKind; rot: number; x: number; y: number };
type Board = (PieceKind | null)[];
type Game = {
  board: Board;
  piece: Piece;
  next: PieceKind;
  score: number;
  lines: number;
  level: number;
  status: "playing" | "over";
  paused: boolean;
};

function randomKind(): PieceKind {
  return KINDS[Math.floor(Math.random() * KINDS.length)];
}

function cellsOf(kind: PieceKind, rot: number): Cell[] {
  let cells = SHAPES[kind];
  for (let i = 0; i < rot; i++) {
    cells = cells.map(([x, y]): Cell => [-y, x]);
    const minX = Math.min(...cells.map(([x]) => x));
    const minY = Math.min(...cells.map(([, y]) => y));
    cells = cells.map(([x, y]): Cell => [x - minX, y - minY]);
  }
  return cells;
}

function collides(board: Board, kind: PieceKind, rot: number, x: number, y: number): boolean {
  return cellsOf(kind, rot).some(([cx, cy]) => {
    const nx = x + cx;
    const ny = y + cy;
    if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
    return ny >= 0 && board[ny * COLS + nx] != null;
  });
}

function emptyRow(): Board {
  return Array.from({ length: COLS }, () => null);
}

function lockAndSpawn(g: Game): Game {
  const board = g.board.slice();
  cellsOf(g.piece.kind, g.piece.rot).forEach(([cx, cy]) => {
    const nx = g.piece.x + cx;
    const ny = g.piece.y + cy;
    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) board[ny * COLS + nx] = g.piece.kind;
  });
  const kept: Board[] = [];
  let cleared = 0;
  for (let y = 0; y < ROWS; y++) {
    const row = board.slice(y * COLS, y * COLS + COLS);
    if (row.every((c) => c != null)) cleared++;
    else kept.push(row);
  }
  while (kept.length < ROWS) kept.unshift(emptyRow());
  const lines = g.lines + cleared;
  const piece = { kind: g.next, rot: 0, x: 3, y: 0 };
  const flat = kept.flat();
  return {
    board: flat,
    piece,
    next: randomKind(),
    score: g.score + [0, 100, 300, 500, 800][cleared] * g.level,
    lines,
    level: 1 + Math.floor(lines / 10),
    status: collides(flat, piece.kind, 0, piece.x, piece.y) ? "over" : "playing",
    paused: false,
  };
}

function freshGame(): Game {
  const board: Board = [];
  for (let i = 0; i < ROWS; i++) board.push(...emptyRow());
  const piece = { kind: randomKind(), rot: 0, x: 3, y: 0 };
  return { board, piece, next: randomKind(), score: 0, lines: 0, level: 1, status: "playing", paused: false };
}

export function TetrisGame(): ReactNode {
  const [game, setGame] = useState<Game>(freshGame);

  const stepDown = useCallback(() => {
    setGame((g) => {
      if (g.status !== "playing" || g.paused) return g;
      if (!collides(g.board, g.piece.kind, g.piece.rot, g.piece.x, g.piece.y + 1)) {
        return { ...g, piece: { ...g.piece, y: g.piece.y + 1 } };
      }
      return lockAndSpawn(g);
    });
  }, []);

  const move = useCallback((dx: number) => {
    setGame((g) => {
      if (g.status !== "playing" || g.paused) return g;
      if (!collides(g.board, g.piece.kind, g.piece.rot, g.piece.x + dx, g.piece.y)) {
        return { ...g, piece: { ...g.piece, x: g.piece.x + dx } };
      }
      return g;
    });
  }, []);

  const rotate = useCallback(() => {
    setGame((g) => {
      if (g.status !== "playing" || g.paused) return g;
      const rot = (g.piece.rot + 1) % 4;
      const tryAt = (x: number) =>
        collides(g.board, g.piece.kind, rot, x, g.piece.y) ? null : { ...g, piece: { ...g.piece, rot, x } };
      return tryAt(g.piece.x) ?? tryAt(g.piece.x - 1) ?? tryAt(g.piece.x + 1) ?? g;
    });
  }, []);

  const hardDrop = useCallback(() => {
    setGame((g) => {
      if (g.status !== "playing" || g.paused) return g;
      let y = g.piece.y;
      while (!collides(g.board, g.piece.kind, g.piece.rot, g.piece.x, y + 1)) y++;
      return lockAndSpawn({ ...g, piece: { ...g.piece, y } });
    });
  }, []);

  const togglePause = useCallback(() => {
    setGame((g) => (g.status === "playing" ? { ...g, paused: !g.paused } : g));
  }, []);

  const reset = useCallback(() => setGame(freshGame()), []);

  useEffect(() => {
    if (game.status !== "playing" || game.paused) return;
    const speed = Math.max(80, 750 - (game.level - 1) * 70);
    const t = setInterval(stepDown, speed);
    return () => clearInterval(t);
  }, [game.status, game.paused, game.level, stepDown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") e.target.blur();
      switch (e.key) {
        case "ArrowLeft":
          move(-1);
          break;
        case "ArrowRight":
          move(1);
          break;
        case "ArrowDown":
          stepDown();
          break;
        case "ArrowUp":
          rotate();
          break;
        case " ":
          hardDrop();
          break;
        default:
          if (e.key === "p" || e.key === "P") togglePause();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, stepDown, rotate, hardDrop, togglePause]);

  const active = new Map<number, PieceKind>();
  cellsOf(game.piece.kind, game.piece.rot).forEach(([cx, cy]) => {
    const nx = game.piece.x + cx;
    const ny = game.piece.y + cy;
    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) active.set(ny * COLS + nx, game.piece.kind);
  });
  const nextCells = cellsOf(game.next, 0);
  const nmin = Math.min(...nextCells.map(([x]) => x));
  const nmax = Math.max(...nextCells.map(([x]) => x));
  const noff = Math.floor((4 - (nmax - nmin + 1)) / 2) - nmin;

  return (
    <div className="xg-t">
      <style jsx>{`
        .xg-t {
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
        .xg-t__bar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 2px 4px 6px;
        }
        .xg-t__stat b {
          font-size: 13px;
        }
        .xg-t__nextbox {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-left: auto;
          padding: 3px 4px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
        }
        .xg-t__next-label {
          font-weight: 700;
        }
        .xg-t__next {
          display: grid;
          grid-template-columns: repeat(4, 12px);
          grid-template-rows: repeat(4, 12px);
          gap: 1px;
          background: #111318;
          padding: 2px;
        }
        .xg-t__nc--on {
          box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.35), inset -1px -1px 0 rgba(0, 0, 0, 0.3);
        }
        .xg-t__frame {
          display: inline-block;
          padding: 4px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
        }
        .xg-t__well {
          position: relative;
          display: grid;
          grid-template-columns: repeat(${COLS}, ${CELL}px);
          grid-template-rows: repeat(${ROWS}, ${CELL}px);
          background: #111318;
          overflow: hidden;
        }
        .xg-t__cell--on {
          box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.4), inset -2px -2px 0 rgba(0, 0, 0, 0.32);
        }
        .xg-t__overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(236, 233, 216, 0.92);
        }
        .xg-t__overlay-title {
          font-size: 20px;
          font-weight: 700;
        }
        .xg-t__overlay-sub {
          color: #000;
        }
        .xg-t__ctrl {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 2px 0;
        }
        .xg-t__spacer {
          flex: 1;
        }
        .xg-t__btn {
          font-family: inherit;
          font-size: 11px;
          color: #000;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          padding: 3px 9px;
          cursor: pointer;
        }
        .xg-t__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
          padding: 4px 8px 2px 10px;
        }
        .xg-t__hint {
          margin-top: 5px;
          text-align: center;
          color: #000;
        }
      `}</style>
      <div className="xg-t__bar">
        <div className="xg-t__stat">
          Skor <b>{game.score}</b>
        </div>
        <div className="xg-t__stat">
          Baris <b>{game.lines}</b>
        </div>
        <div className="xg-t__stat">
          Level <b>{game.level}</b>
        </div>
        <div className="xg-t__nextbox">
          <span className="xg-t__next-label">Berikutnya</span>
          <div className="xg-t__next">
            {Array.from({ length: 16 }, (_, i) => {
              const on = nextCells.some(([x, y]) => x + noff === i % 4 && y === Math.floor(i / 4));
              return (
                <span
                  key={i}
                  className={`xg-t__nc ${on ? "xg-t__nc--on" : ""}`}
                  style={on ? { backgroundColor: COLORS[game.next] } : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="xg-t__frame">
        <div className="xg-t__well" role="grid" aria-label="Papan Tetris 10x20">
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const kind = game.board[i] ?? active.get(i);
            return (
              <span
                key={i}
                className={`xg-t__cell ${kind ? "xg-t__cell--on" : ""}`}
                style={kind ? { backgroundColor: COLORS[kind] } : undefined}
              />
            );
          })}
          {(game.status === "over" || game.paused) && (
            <div className="xg-t__overlay">
              {game.status === "over" ? (
                <>
                  <div className="xg-t__overlay-title">Game Over</div>
                  <div className="xg-t__overlay-sub">
                    Skor: {game.score} &middot; Level: {game.level}
                  </div>
                  <button type="button" className="xg-t__btn" onClick={reset}>
                    Main Lagi
                  </button>
                </>
              ) : (
                <>
                  <div className="xg-t__overlay-title">Jeda</div>
                  <div className="xg-t__overlay-sub">Tekan Spasi / P untuk lanjut</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="xg-t__ctrl">
        <button type="button" className="xg-t__btn" onClick={togglePause}>
          {game.paused ? "Lanjut" : "Jeda"}
        </button>
        <button type="button" className="xg-t__btn" onClick={reset}>
          Game Baru
        </button>
        <span className="xg-t__spacer" />
        <button type="button" className="xg-t__btn" onClick={() => move(-1)} aria-label="Geser kiri">
          Left
        </button>
        <button type="button" className="xg-t__btn" onClick={() => move(1)} aria-label="Geser kanan">
          Right
        </button>
        <button type="button" className="xg-t__btn" onClick={stepDown} aria-label="Turun">
          Down
        </button>
        <button type="button" className="xg-t__btn" onClick={rotate} aria-label="Putar">
          Rot
        </button>
        <button type="button" className="xg-t__btn" onClick={hardDrop} aria-label="Jatuh cepat">
          Drop
        </button>
      </div>
      <div className="xg-t__hint">Kiri/Kanan/Bawah gerak &middot; Atas putar &middot; Spasi jatuh cepat &middot; P jeda</div>
    </div>
  );
}
