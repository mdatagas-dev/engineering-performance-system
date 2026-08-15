"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { type: PieceType; color: Color };
type Board = (Piece | null)[];
type Mode = "ai" | "hotseat";

type Game = {
  board: Board;
  turn: Color;
  status: "playing" | "over";
  winner: Color | null;
  mode: Mode;
  sel: number | null;
  moves: number[];
};

const WHITE_GLYPH: Record<PieceType, string> = { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" };
const BLACK_GLYPH: Record<PieceType, string> = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
const PIECE_NAME: Record<PieceType, string> = {
  K: "Raja",
  Q: "Menteri",
  R: "Benteng",
  B: "Gajah",
  N: "Kuda",
  P: "Pion",
};
const BACK: PieceType[] = ["R", "N", "B", "Q", "K", "B", "N", "R"];
const KNIGHT: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];

function freshBoard(): Board {
  const b: Board = Array.from({ length: 64 }, () => null);
  for (let x = 0; x < 8; x++) {
    b[x] = { type: BACK[x], color: "b" };
    b[8 + x] = { type: "P", color: "b" };
    b[48 + x] = { type: "P", color: "w" };
    b[56 + x] = { type: BACK[x], color: "w" };
  }
  return b;
}

function freshGame(mode: Mode): Game {
  return { board: freshBoard(), turn: "w", status: "playing", winner: null, mode, sel: null, moves: [] };
}

function legalTargets(board: Board, idx: number): number[] {
  const p = board[idx];
  if (!p) return [];
  const x = idx % 8;
  const y = Math.floor(idx / 8);
  const out: number[] = [];
  const add = (nx: number, ny: number) => {
    if (nx < 0 || nx > 7 || ny < 0 || ny > 7) return;
    const t = board[ny * 8 + nx];
    if (!t || t.color !== p.color) out.push(ny * 8 + nx);
  };
  const addEnemy = (nx: number, ny: number) => {
    if (nx < 0 || nx > 7 || ny < 0 || ny > 7) return;
    const t = board[ny * 8 + nx];
    if (t && t.color !== p.color) out.push(ny * 8 + nx);
  };
  const ray = (dx: number, dy: number) => {
    let nx = x + dx;
    let ny = y + dy;
    while (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 7) {
      const t = board[ny * 8 + nx];
      if (!t) out.push(ny * 8 + nx);
      else {
        if (t.color !== p.color) out.push(ny * 8 + nx);
        break;
      }
      nx += dx;
      ny += dy;
    }
  };
  switch (p.type) {
    case "P": {
      const dir = p.color === "w" ? -1 : 1;
      const one = y + dir;
      if (one >= 0 && one <= 7 && !board[one * 8 + x]) {
        add(x, one);
        const two = y + dir * 2;
        if ((p.color === "w" ? y === 6 : y === 1) && two >= 0 && two <= 7 && !board[two * 8 + x]) add(x, two);
      }
      addEnemy(x - 1, one);
      addEnemy(x + 1, one);
      break;
    }
    case "N":
      for (const [dx, dy] of KNIGHT) add(x + dx, y + dy);
      break;
    case "B":
      ray(1, 1);
      ray(1, -1);
      ray(-1, 1);
      ray(-1, -1);
      break;
    case "R":
      ray(1, 0);
      ray(-1, 0);
      ray(0, 1);
      ray(0, -1);
      break;
    case "Q":
      ray(1, 0);
      ray(-1, 0);
      ray(0, 1);
      ray(0, -1);
      ray(1, 1);
      ray(1, -1);
      ray(-1, 1);
      ray(-1, -1);
      break;
    case "K":
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          add(x + dx, y + dy);
        }
      }
      break;
  }
  return out;
}

function moveTo(g: Game, from: number, to: number): Game {
  const p = g.board[from];
  if (!p) return g;
  const nb = g.board.slice();
  nb[from] = null;
  const captured = nb[to];
  const promote = p.type === "P" && (p.color === "w" ? Math.floor(to / 8) === 0 : Math.floor(to / 8) === 7);
  nb[to] = promote ? { type: "Q", color: p.color } : p;
  if (captured && captured.type === "K") {
    return { ...g, board: nb, sel: null, moves: [], status: "over", winner: p.color };
  }
  return { ...g, board: nb, sel: null, moves: [], turn: g.turn === "w" ? "b" : "w" };
}

export function ChessGame(): ReactNode {
  const [game, setGame] = useState<Game>(() => freshGame("ai"));
  const [cursor, setCursor] = useState(60);

  const click = useCallback((idx: number) => {
    setCursor(idx);
    setGame((g) => {
      if (g.status !== "playing") return g;
      if (g.mode === "ai" && g.turn === "b") return g;
      if (g.sel != null && g.moves.includes(idx)) return moveTo(g, g.sel, idx);
      const p = g.board[idx];
      if (p && p.color === g.turn) return { ...g, sel: idx, moves: legalTargets(g.board, idx) };
      return { ...g, sel: null, moves: [] };
    });
  }, []);

  const reset = useCallback(() => setGame(freshGame(game.mode)), [game.mode]);

  const toggleMode = useCallback(() => {
    setGame((g) => freshGame(g.mode === "ai" ? "hotseat" : "ai"));
  }, []);

  useEffect(() => {
    if (game.mode !== "ai" || game.turn !== "b" || game.status !== "playing") return;
    const t = setTimeout(() => {
      setGame((g) => {
        if (g.mode !== "ai" || g.turn !== "b" || g.status !== "playing") return g;
        const moves: [number, number][] = [];
        g.board.forEach((p, i) => {
          if (!p || p.color !== "b") return;
          legalTargets(g.board, i).forEach((to) => moves.push([i, to]));
        });
        if (!moves.length) return { ...g, status: "over", winner: "w", sel: null, moves: [] };
        const [from, to] = moves[Math.floor(Math.random() * moves.length)];
        return moveTo(g, from, to);
      });
    }, 500);
    return () => clearTimeout(t);
  }, [game.mode, game.turn, game.status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") e.target.blur();
      switch (e.key) {
        case "ArrowUp":
          setCursor((c) => (c >= 8 ? c - 8 : c));
          return;
        case "ArrowDown":
          setCursor((c) => (c < 56 ? c + 8 : c));
          return;
        case "ArrowLeft":
          setCursor((c) => (c % 8 > 0 ? c - 1 : c));
          return;
        case "ArrowRight":
          setCursor((c) => (c % 8 < 7 ? c + 1 : c));
          return;
        case "Enter":
        case " ":
          click(cursor);
          return;
        case "Escape":
          setGame((g) => ({ ...g, sel: null, moves: [] }));
          return;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, click]);

  const statusText =
    game.status === "over"
      ? game.winner === "w"
        ? "Putih menang! Raja tertangkap."
        : "Hitam menang! Raja tertangkap."
      : game.mode === "ai" && game.turn === "b"
        ? "Komputer berpikir..."
        : `Giliran: ${game.turn === "w" ? "Putih" : "Hitam"}`;

  return (
    <div className="xg-c">
      <style jsx>{`
        .xg-c {
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
        .xg-c__bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2px 2px 6px;
        }
        .xg-c__status {
          font-weight: 700;
          white-space: nowrap;
        }
        .xg-c__spacer {
          flex: 1;
        }
        .xg-c__frame {
          display: inline-block;
          padding: 4px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
        }
        .xg-c__board {
          display: grid;
          grid-template-columns: repeat(8, 37px);
          grid-template-rows: repeat(8, 37px);
          border: 1px solid #7a6a45;
        }
        .xg-c__sq {
          position: relative;
          width: 37px;
          height: 37px;
          padding: 0;
          border: 0;
          cursor: pointer;
          font: inherit;
          box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.45), inset -1px -1px 0 rgba(0, 0, 0, 0.28);
        }
        .xg-c__sq--light {
          background: #e8d5a3;
        }
        .xg-c__sq--dark {
          background: #a97c50;
        }
        .xg-c__sq--sel {
          outline: 2px solid #c00000;
          outline-offset: -2px;
        }
        .xg-c__sq--cursor {
          outline: 2px dotted #003c74;
          outline-offset: -2px;
        }
        .xg-c__sq--capture {
          box-shadow: inset 0 0 0 2px #c00000;
        }
        .xg-c__pc {
          position: relative;
          z-index: 1;
          display: block;
          font-size: 29px;
          line-height: 37px;
          text-align: center;
        }
        .xg-c__pc--w {
          color: #fff;
          text-shadow: 0 0 1px #000, 0 1px 0 #666, 1px 0 0 #666;
        }
        .xg-c__pc--b {
          color: #111;
          text-shadow: 0 0 1px #fff;
        }
        .xg-c__dot {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 10px;
          height: 10px;
          margin: -5px 0 0 -5px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
          z-index: 0;
        }
        .xg-c__btn {
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
        .xg-c__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
          padding: 4px 8px 2px 10px;
        }
        .xg-c__hint {
          margin-top: 5px;
          text-align: center;
          color: #000;
        }
      `}</style>
      <div className="xg-c__bar">
        <span className="xg-c__status">{statusText}</span>
        <span className="xg-c__spacer" />
        <button type="button" className="xg-c__btn" onClick={toggleMode}>
          {game.mode === "ai" ? "Lawan: Komputer" : "Lawan: 2 Pemain"}
        </button>
        <button type="button" className="xg-c__btn" onClick={reset}>
          Game Baru
        </button>
      </div>
      <div className="xg-c__frame">
        <div className="xg-c__board" role="grid" aria-label="Papan Catur 8x8">
          {game.board.map((p, i) => {
            const x = i % 8;
            const y = Math.floor(i / 8);
            const isDark = (x + y) % 2 === 1;
            const isSel = game.sel === i;
            const isTarget = game.moves.includes(i);
            const cls = [
              "xg-c__sq",
              isDark ? "xg-c__sq--dark" : "xg-c__sq--light",
              isSel ? "xg-c__sq--sel" : cursor === i ? "xg-c__sq--cursor" : "",
              isTarget && p ? "xg-c__sq--capture" : "",
            ].join(" ");
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                className={cls}
                onClick={() => click(i)}
                aria-label={p ? `${p.color === "w" ? "Putih" : "Hitam"} ${PIECE_NAME[p.type]} di kolom ${x + 1}, baris ${8 - y}` : `Petak kolom ${x + 1}, baris ${8 - y}`}
              >
                {p && (
                  <span className={`xg-c__pc xg-c__pc--${p.color}`}>
                    {p.color === "w" ? WHITE_GLYPH[p.type] : BLACK_GLYPH[p.type]}
                  </span>
                )}
                {isTarget && !p && <span className="xg-c__dot" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="xg-c__hint">
        Klik bidak lalu petak tujuan &middot; Panah + Enter untuk keyboard &middot; Raja tertangkap = kalah
      </div>
    </div>
  );
}
