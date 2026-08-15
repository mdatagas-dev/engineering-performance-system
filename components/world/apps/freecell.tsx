"use client";

import { useEffect, useState, type ReactNode } from "react";

const CARD_W = 36;
const CARD_H = 50;
const OVERLAP = 20;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["\u2663", "\u2666", "\u2665", "\u2660"];
const SUIT_NAMES = ["Keriting", "Wajik", "Hati", "Sekop"];

type Card = { s: number; r: number };
type Pile = Card[];

type Game = {
  cols: Pile[];
  free: (Card | null)[];
  found: Pile[];
  moves: number;
  won: boolean;
};

type Sel = { from: "c" | "f"; i: number } | null;

const isRed = (c: Card): boolean => c.s === 1 || c.s === 2;

function freshGame(): Game {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ s, r });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const cols: Pile[] = Array.from({ length: 8 }, (_, c) => deck.slice(c * 6, c * 6 + 6));
  for (let c = 0; c < 4; c++) cols[c].push(deck[48 + c]);
  return { cols, free: [null, null, null, null], found: [[], [], [], []], moves: 0, won: false };
}

function canFound(c: Card, f: Pile): boolean {
  if (f.length === 0) return c.r === 0;
  const t = f[f.length - 1];
  return t.s === c.s && t.r === c.r - 1;
}

function canCol(c: Card, col: Pile): boolean {
  if (col.length === 0) return true;
  const t = col[col.length - 1];
  return isRed(t) !== isRed(c) && t.r === c.r + 1;
}

function pick(g: Game, sel: Sel): Card | null {
  if (!sel) return null;
  if (sel.from === "f") return g.free[sel.i];
  const col = g.cols[sel.i];
  return col.length ? col[col.length - 1] : null;
}

function moveTo(g: Game, sel: Sel, dst: { kind: "free"; i: number } | { kind: "found"; i: number } | { kind: "col"; i: number }): Game | null {
  if (!sel) return null;
  const c = pick(g, sel);
  if (!c) return null;
  if (dst.kind === "free") {
    if (g.free[dst.i] !== null) return null;
    const free = g.free.slice();
    free[dst.i] = c;
    if (sel.from === "f") free[sel.i] = null;
    else {
      const cols = g.cols.slice();
      cols[sel.i] = cols[sel.i].slice(0, -1);
      return { ...g, cols, free, moves: g.moves + 1 };
    }
    return { ...g, free, moves: g.moves + 1 };
  }
  if (dst.kind === "found") {
    if (!canFound(c, g.found[dst.i])) return null;
    const found = g.found.map((p, i) => (i === dst.i ? [...p, c] : p));
    const won = found.every((p) => p.length === 13);
    if (sel.from === "f") {
      const free = g.free.slice();
      free[sel.i] = null;
      return { ...g, free, found, moves: g.moves + 1, won };
    }
    const cols = g.cols.slice();
    cols[sel.i] = cols[sel.i].slice(0, -1);
    return { ...g, cols, found, moves: g.moves + 1, won };
  }
  if (!canCol(c, g.cols[dst.i])) return null;
  const cols = g.cols.slice();
  if (sel.from === "f") {
    const free = g.free.slice();
    free[sel.i] = null;
    cols[dst.i] = [...cols[dst.i], c];
    return { ...g, cols, free, moves: g.moves + 1 };
  }
  cols[sel.i] = cols[sel.i].slice(0, -1);
  cols[dst.i] = [...cols[dst.i], c];
  return { ...g, cols, moves: g.moves + 1 };
}

function autoMove(g: Game, sel: Sel): Game | null {
  if (!sel) return null;
  for (let i = 0; i < 4; i++) {
    const next = moveTo(g, sel, { kind: "found", i });
    if (next) return next;
  }
  return null;
}

function CardFace({ card, selected, onClick, onDouble }: { card: Card; selected?: boolean; onClick?: () => void; onDouble?: () => void }): ReactNode {
  const red = isRed(card);
  return (
    <button
      type="button"
      className={`xg-fc__card xg-fc__card--up ${red ? "xg-fc__card--r" : "xg-fc__card--b"} ${selected ? "xg-fc__card--sel" : ""}`}
      onClick={onClick}
      onDoubleClick={onDouble}
      aria-label={`Kartu ${RANKS[card.r]} ${SUIT_NAMES[card.s]}`}
    >
      <span className="xg-fc__rank">{RANKS[card.r]}</span>
      <span className="xg-fc__suit">{SUITS[card.s]}</span>
    </button>
  );
}

export function FreeCellGame(): ReactNode {
  const [game, setGame] = useState<Game>(freshGame);
  const [sel, setSel] = useState<Sel>(null);
  const [history, setHistory] = useState<Game[]>([]);

  const act = (fn: (g: Game) => Game | null) => {
    const next = fn(game);
    if (!next) return;
    setHistory((h) => [...h.slice(-299), game]);
    setGame(next);
    setSel(null);
  };

  const newGame = () => {
    setGame(freshGame());
    setSel(null);
    setHistory([]);
  };

  const undo = () => {
    if (history.length === 0) return;
    setHistory((h) => h.slice(0, -1));
    setGame(history[history.length - 1]);
    setSel(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") e.target.blur();
      if (e.key === "u" || e.key === "U") undo();
      else if (e.key === "n" || e.key === "N") newGame();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const clickCol = (c: number) => {
    if (game.won) return;
    const col = game.cols[c];
    if (col.length === 0) {
      if (sel) act((g) => moveTo(g, sel, { kind: "col", i: c }));
      return;
    }
    if (sel && sel.from === "c" && sel.i === c) {
      setSel(null);
      return;
    }
    if (sel) {
      const next = moveTo(game, sel, { kind: "col", i: c });
      if (next) {
        act(() => next);
        return;
      }
      if (!(sel.from === "c" && sel.i === c)) setSel({ from: "c", i: c });
      return;
    }
    setSel({ from: "c", i: c });
  };

  const clickFree = (i: number) => {
    if (game.won) return;
    const f = game.free[i];
    if (sel && sel.from === "f" && sel.i === i) {
      setSel(null);
      return;
    }
    if (sel) {
      const next = moveTo(game, sel, { kind: "free", i });
      if (next) {
        act(() => next);
        return;
      }
      if (f) setSel({ from: "f", i });
      return;
    }
    if (f) setSel({ from: "f", i });
  };

  const clickFound = (i: number) => {
    if (game.won) return;
    if (sel) act((g) => moveTo(g, sel, { kind: "found", i }));
  };

  const dblTop = (c: number) => {
    if (game.won) return;
    if (game.cols[c].length > 0) act((g) => autoMove(g, { from: "c", i: c }));
  };

  const dblFree = (i: number) => {
    if (game.won) return;
    if (game.free[i]) act((g) => autoMove(g, { from: "f", i }));
  };

  const isTopSel = (c: number): boolean => !!sel && sel.from === "c" && sel.i === c;

  return (
    <div className="xg-fc">
      <style jsx>{`
        .xg-fc {
          width: fit-content;
          margin: 0 auto;
          background: #3f7f3f;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          color: #000;
          padding: 8px;
          user-select: none;
          -webkit-user-select: none;
        }
        .xg-fc__bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 2px 8px;
        }
        .xg-fc__stat {
          color: #fff;
          font-weight: 700;
        }
        .xg-fc__btn {
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
        .xg-fc__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-fc__top {
          display: flex;
          gap: 2px;
          padding-bottom: 8px;
        }
        .xg-fc__slot {
          width: ${CARD_W}px;
          height: ${CARD_H}px;
          padding: 0;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.12);
          border: 1px dashed rgba(255, 255, 255, 0.55);
          border-radius: 3px;
          cursor: pointer;
        }
        .xg-fc__found {
          display: flex;
          gap: 2px;
          margin-left: 8px;
        }
        .xg-fc__board {
          display: flex;
          gap: 2px;
          padding-bottom: 6px;
        }
        .xg-fc__col {
          position: relative;
          width: ${CARD_W}px;
        }
        .xg-fc__card {
          display: block;
          width: ${CARD_W}px;
          height: ${CARD_H}px;
          padding: 0;
          border: 1px solid #000;
          border-radius: 3px;
          box-sizing: border-box;
        }
        .xg-fc__col .xg-fc__card {
          margin-top: -${OVERLAP}px;
        }
        .xg-fc__col .xg-fc__card:first-child {
          margin-top: 0;
        }
        .xg-fc__card--up {
          background: #fff;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 3px 0 0 4px;
          cursor: pointer;
          box-shadow: inset 1px 1px #fff, inset -1px -1px #808080;
        }
        .xg-fc__card--r {
          color: #c00;
        }
        .xg-fc__card--b {
          color: #000;
        }
        .xg-fc__card--sel {
          outline: 2px solid #ffd700;
          outline-offset: -2px;
        }
        .xg-fc__rank {
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
        }
        .xg-fc__suit {
          font-size: 14px;
          line-height: 1.1;
          margin-top: 1px;
        }
        .xg-fc__col .xg-fc__card--plain {
          pointer-events: none;
        }
        .xg-fc__hint {
          text-align: center;
          color: #fff;
        }
        .xg-fc__msg {
          color: #fff;
          font-weight: 700;
          padding: 0 2px 6px;
          text-align: center;
        }
      `}</style>
      <div className="xg-fc__bar">
        <span className="xg-fc__stat">Langkah: {game.moves}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="xg-fc__btn" onClick={undo} disabled={history.length === 0}>
          Undo
        </button>
        <button type="button" className="xg-fc__btn" onClick={newGame}>
          Game Baru
        </button>
      </div>
      <div className="xg-fc__top">
        <div style={{ display: "flex", gap: 2 }}>
          {game.free.map((f, i) => (
            <div
              key={i}
              className="xg-fc__slot"
              onClick={() => clickFree(i)}
              role="button"
              aria-label={`Sel bebas ${i + 1}`}
            >
              {f && <CardFace card={f} selected={!!sel && sel.from === "f" && sel.i === i} onDouble={() => dblFree(i)} />}
            </div>
          ))}
        </div>
        <div className="xg-fc__found">
          {game.found.map((f, i) => (
            <div key={i} className="xg-fc__slot" onClick={() => clickFound(i)} role="button" aria-label={`Tumpukan dasar ${SUIT_NAMES[i]}`}>
              {f.length > 0 && <CardFace card={f[f.length - 1]} />}
            </div>
          ))}
        </div>
      </div>
      {game.won && <div className="xg-fc__msg">Selamat! Anda menang dalam {game.moves} langkah.</div>}
      <div className="xg-fc__board">
        {game.cols.map((col, c) => (
          <div key={c} className="xg-fc__col" role="button" aria-label={`Kolom ${c + 1}`}>
            {col.length === 0 ? (
              <div className="xg-fc__slot" onClick={() => clickCol(c)} />
            ) : (
              col.map((card, i) => {
                const isTop = i === col.length - 1;
                return isTop ? (
                  <CardFace key={i} card={card} selected={isTopSel(c)} onClick={() => clickCol(c)} onDouble={() => dblTop(c)} />
                ) : (
                  <div key={i} className="xg-fc__card xg-fc__card--up xg-fc__card--plain">
                    <span className={`xg-fc__rank ${isRed(card) ? "xg-fc__card--r" : "xg-fc__card--b"}`}>{RANKS[card.r]}</span>
                    <span className={`xg-fc__suit ${isRed(card) ? "xg-fc__card--r" : "xg-fc__card--b"}`}>{SUITS[card.s]}</span>
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
      <div className="xg-fc__hint">Klik kartu atas untuk pilih &middot; klik tujuan &middot; klik dua kali = ke dasar &middot; U = Undo &middot; N = baru</div>
    </div>
  );
}
