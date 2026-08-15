"use client";

import { useEffect, useState, type ReactNode } from "react";

const CARD_W = 38;
const CARD_H = 52;
const OVERLAP = 15;

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["\u2663", "\u2666", "\u2665", "\u2660"]; // club, diamond, heart, spade
const SUIT_NAMES = ["Keriting", "Wajik", "Hati", "Sekop"];

type Card = { s: number; r: number; up: boolean };
type Pile = Card[];

type Game = {
  stock: Pile;
  waste: Pile;
  tableau: Pile[];
  found: Pile[];
  moves: number;
  won: boolean;
};

type Sel = { kind: "t" | "w"; pile: number; index: number } | null;

const isRed = (c: Card): boolean => c.s === 1 || c.s === 2;

function shuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) deck.push({ s, r, up: false });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function freshGame(): Game {
  const deck = shuffledDeck();
  const tableau: Pile[] = Array.from({ length: 7 }, (_, i) => {
    const pile: Pile = [];
    for (let k = 0; k <= i; k++) pile.push(deck.pop() as Card);
    pile[pile.length - 1] = { ...pile[pile.length - 1], up: true };
    return pile;
  });
  return { stock: deck, waste: [], tableau, found: [[], [], [], []], moves: 0, won: false };
}

function canFound(c: Card, f: Pile): boolean {
  if (!c.up) return false;
  if (f.length === 0) return c.r === 0;
  const t = f[f.length - 1];
  return t.s === c.s && t.r === c.r - 1;
}

function canTableau(c: Card, t: Pile): boolean {
  if (!c.up) return false;
  if (t.length === 0) return c.r === 12;
  const top = t[t.length - 1];
  return top.up && isRed(top) !== isRed(c) && top.r === c.r + 1;
}

function flipTop(pile: Pile): Pile {
  const last = pile[pile.length - 1];
  if (!last || last.up) return pile;
  const arr = pile.slice();
  arr[arr.length - 1] = { ...last, up: true };
  return arr;
}

function drawStock(g: Game): Game | null {
  if (g.won) return null;
  if (g.stock.length === 0) {
    if (g.waste.length === 0) return null;
    return {
      ...g,
      stock: g.waste.slice().reverse().map((c) => ({ ...c, up: false })),
      waste: [],
      moves: g.moves + 1,
    };
  }
  const stock = g.stock.slice();
  const waste = g.waste.slice();
  waste.push(stock.pop() as Card);
  return { ...g, stock, waste, moves: g.moves + 1 };
}

function moveToTableau(g: Game, sel: Sel, tp: number): Game | null {
  if (!sel || g.won) return null;
  const target = g.tableau[tp];
  let run: Pile;
  let source: number;
  if (sel.kind === "w") {
    if (g.waste.length === 0) return null;
    const c = g.waste[g.waste.length - 1];
    if (!canTableau(c, target)) return null;
    run = [c];
    source = -1;
  } else {
    const src = g.tableau[sel.pile];
    if (sel.index >= src.length || !src[sel.index].up) return null;
    if (!canTableau(src[sel.index], target)) return null;
    run = src.slice(sel.index);
    source = sel.pile;
  }
  const tableau = g.tableau.map((p, i) => (i === tp ? [...p, ...run] : p));
  if (source >= 0) tableau[source] = flipTop(tableau[source].slice(0, sel.index));
  else return { ...g, tableau, waste: g.waste.slice(0, -1), moves: g.moves + 1 };
  return { ...g, tableau, moves: g.moves + 1 };
}

function moveToFound(g: Game, sel: Sel, f: number): Game | null {
  if (!sel || g.won) return null;
  let c: Card;
  let source: number;
  let index: number;
  if (sel.kind === "w") {
    if (g.waste.length === 0) return null;
    c = g.waste[g.waste.length - 1];
    source = -1;
    index = -1;
  } else {
    source = sel.pile;
    index = sel.index;
    const src = g.tableau[source];
    if (index >= src.length || !src[index].up) return null;
    c = src[index];
  }
  if (!canFound(c, g.found[f])) return null;
  const found = g.found.map((p, i) => (i === f ? [...p, c] : p));
  const won = found.every((p) => p.length === 13);
  if (source === -1) return { ...g, found, waste: g.waste.slice(0, -1), moves: g.moves + 1, won };
  const tableau = g.tableau.slice();
  tableau[source] = flipTop(g.tableau[source].filter((_, i) => i !== index));
  return { ...g, tableau, found, moves: g.moves + 1, won };
}

function autoMove(g: Game, sel: Sel): Game | null {
  if (!sel) return null;
  for (let f = 0; f < 4; f++) {
    const next = moveToFound(g, sel, f);
    if (next) return next;
  }
  return null;
}

function CardFace({
  card,
  selected,
  onSelect,
  onDouble,
}: {
  card: Card;
  selected?: boolean;
  onSelect?: () => void;
  onDouble?: () => void;
}): ReactNode {
  const red = isRed(card);
  return (
    <button
      type="button"
      className={`xg-sol__card xg-sol__card--up ${red ? "xg-sol__card--r" : "xg-sol__card--b"} ${selected ? "xg-sol__card--sel" : ""}`}
      onClick={onSelect}
      onDoubleClick={onDouble}
      aria-label={`Kartu ${RANKS[card.r]} ${SUIT_NAMES[card.s]}`}
    >
      <span className="xg-sol__rank">{RANKS[card.r]}</span>
      <span className="xg-sol__suit">{SUITS[card.s]}</span>
    </button>
  );
}

function CardBack(): ReactNode {
  return (
    <div className="xg-sol__card xg-sol__card--down" aria-hidden="true">
      <span className="xg-sol__back">GH</span>
    </div>
  );
}

export function SolitaireGame(): ReactNode {
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

  const clickCard = (p: number, i: number) => {
    if (game.won) return;
    const c = game.tableau[p][i];
    if (!c.up) return;
    if (sel && sel.kind === "t" && sel.pile === p && sel.index === i) {
      setSel(null);
      return;
    }
    if (sel) {
      const next = moveToTableau(game, sel, p);
      if (next) {
        act(() => next);
        return;
      }
      if (!(sel.kind === "t" && sel.pile === p)) setSel({ kind: "t", pile: p, index: i });
      return;
    }
    setSel({ kind: "t", pile: p, index: i });
  };

  const clickEmpty = (p: number) => {
    if (game.won) return;
    if (sel) act((g) => moveToTableau(g, sel, p));
  };

  const clickFound = (f: number) => {
    if (game.won) return;
    if (sel) act((g) => moveToFound(g, sel, f));
  };

  const clickStock = () => {
    if (game.won) return;
    act(drawStock);
  };

  const clickWaste = () => {
    if (game.won) return;
    if (game.waste.length === 0) return;
    if (sel && sel.kind === "w") {
      setSel(null);
      return;
    }
    setSel({ kind: "w", pile: 0, index: 0 });
  };

  const dblCard = (p: number, i: number) => {
    if (game.won) return;
    act((g) => autoMove(g, { kind: "t", pile: p, index: i }));
  };

  const dblWaste = () => {
    if (game.won) return;
    act((g) => autoMove(g, { kind: "w", pile: 0, index: 0 }));
  };

  const selCard = (p: number, i: number): boolean =>
    !!sel && sel.kind === "t" && sel.pile === p && sel.index === i;

  return (
    <div className="xg-sol">
      <style jsx>{`
        .xg-sol {
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
        .xg-sol__bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 2px 8px;
        }
        .xg-sol__stat {
          color: #fff;
          font-weight: 700;
        }
        .xg-sol__btn {
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
        .xg-sol__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-sol__top {
          display: flex;
          gap: 4px;
          padding-bottom: 8px;
        }
        .xg-sol__slot {
          width: ${CARD_W}px;
          height: ${CARD_H}px;
          padding: 0;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.12);
          border: 1px dashed rgba(255, 255, 255, 0.55);
          border-radius: 3px;
        }
        .xg-sol__stock {
          cursor: pointer;
        }
        .xg-sol__found {
          margin-left: 8px;
        }
        .xg-sol__tableau {
          display: flex;
          gap: 4px;
          padding-bottom: 6px;
        }
        .xg-sol__pile {
          position: relative;
          width: ${CARD_W}px;
        }
        .xg-sol__card {
          display: block;
          width: ${CARD_W}px;
          height: ${CARD_H}px;
          padding: 0;
          border: 1px solid #000;
          border-radius: 3px;
          box-sizing: border-box;
        }
        .xg-sol__pile .xg-sol__card {
          margin-top: -${OVERLAP}px;
        }
        .xg-sol__pile .xg-sol__card:first-child {
          margin-top: 0;
        }
        .xg-sol__card--up {
          background: #fff;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 3px 0 0 4px;
          cursor: pointer;
          box-shadow: inset 1px 1px #fff, inset -1px -1px #808080;
        }
        .xg-sol__card--r {
          color: #c00;
        }
        .xg-sol__card--b {
          color: #000;
        }
        .xg-sol__card--sel {
          outline: 2px solid #ffd700;
          outline-offset: -2px;
        }
        .xg-sol__rank {
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
        }
        .xg-sol__suit {
          font-size: 15px;
          line-height: 1.1;
          margin-top: 1px;
        }
        .xg-sol__card--down {
          background: #123a8f;
          background-image: linear-gradient(45deg, rgba(255, 255, 255, 0.08) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.08) 75%, transparent 75%);
          background-size: 12px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: default;
        }
        .xg-sol__back {
          color: rgba(255, 255, 255, 0.75);
          font-weight: 700;
          font-size: 15px;
          letter-spacing: 1px;
        }
        .xg-sol__hint {
          text-align: center;
          color: #fff;
        }
        .xg-sol__msg {
          color: #fff;
          font-weight: 700;
          padding: 0 2px 6px;
          text-align: center;
        }
      `}</style>
      <div className="xg-sol__bar">
        <span className="xg-sol__stat">Langkah: {game.moves}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="xg-sol__btn" onClick={undo} disabled={history.length === 0}>
          Undo
        </button>
        <button type="button" className="xg-sol__btn" onClick={newGame}>
          Game Baru
        </button>
      </div>
      <div className="xg-sol__top">
        <button
          type="button"
          className="xg-sol__slot xg-sol__stock"
          onClick={clickStock}
          aria-label="Tumpukan kartu"
        >
          {game.stock.length > 0 && <CardBack />}
        </button>
        <div className="xg-sol__slot" aria-hidden="true">
          {game.waste.length > 0 && (
            <CardFace
              card={game.waste[game.waste.length - 1]}
              selected={!!sel && sel.kind === "w"}
              onSelect={clickWaste}
              onDouble={dblWaste}
            />
          )}
        </div>
        <div className="xg-sol__found">
          {game.found.map((f, i) => (
            <div
              key={i}
              className="xg-sol__slot"
              style={i > 0 ? { marginLeft: 4 } : undefined}
              onClick={() => clickFound(i)}
              role="button"
              aria-label={`Tumpukan dasar ${SUIT_NAMES[i]}`}
            >
              {f.length > 0 && <CardFace card={f[f.length - 1]} />}
            </div>
          ))}
        </div>
      </div>
      {game.won && <div className="xg-sol__msg">Selamat! Anda menang dalam {game.moves} langkah.</div>}
      <div className="xg-sol__tableau">
        {game.tableau.map((pile, p) => (
          <div key={p} className="xg-sol__pile">
            {pile.length === 0 ? (
              <button type="button" className="xg-sol__slot" onClick={() => clickEmpty(p)} aria-label="Tumpukan kosong" />
            ) : (
              pile.map((c, i) =>
                c.up ? (
                  <CardFace
                    key={i}
                    card={c}
                    selected={selCard(p, i)}
                    onSelect={() => clickCard(p, i)}
                    onDouble={() => dblCard(p, i)}
                  />
                ) : (
                  <CardBack key={i} />
                ),
              )
            )}
          </div>
        ))}
      </div>
      <div className="xg-sol__hint">Klik kartu untuk pilih &middot; klik tujuan untuk pindah &middot; klik dua kali = otomatis &middot; U = Undo &middot; N = baru</div>
    </div>
  );
}
