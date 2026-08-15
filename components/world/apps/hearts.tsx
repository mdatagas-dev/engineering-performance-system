"use client";

import { useEffect, useState, type ReactNode } from "react";

const DIAMOND = 1;
const HEART = 2;
const SPADE = 3;
const SUIT_CHAR = ["\u2663", "\u2666", "\u2665", "\u2660"];
const RANK_CHAR = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const QS = 3 * 13 + 11;
const NAMES = ["Anda", "Barat", "Utara", "Timur"];
const GOAL = 100;

const suit = (id: number): number => Math.floor(id / 13);
const rank = (id: number): number => id % 13;
const isRed = (id: number): boolean => suit(id) === DIAMOND || suit(id) === HEART;

type Phase = "trick" | "roundEnd" | "gameEnd";

interface GameState {
  hands: number[][];
  trick: (number | null)[];
  lead: number;
  taken: number[][];
  roundPts: number[];
  totals: number[];
  trickCount: number;
  broken: boolean;
  phase: Phase;
  moon: number;
}

function sortHand(hand: number[]): number[] {
  return [...hand].sort((a, b) => suit(a) - suit(b) || rank(a) - rank(b));
}

function deal(totals: number[]): GameState {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const hands = [0, 1, 2, 3].map((p) => sortHand(deck.slice(p * 13, p * 13 + 13)));
  const holder = hands.findIndex((h) => h.includes(0));
  return {
    hands,
    trick: [null, null, null, null],
    lead: holder,
    taken: [[], [], [], []],
    roundPts: [0, 0, 0, 0],
    totals,
    trickCount: 0,
    broken: false,
    phase: "trick",
    moon: -1,
  };
}

function legalCards(s: GameState, p: number): number[] {
  const hand = s.hands[p];
  const led = s.trick[s.lead];
  if (led != null) {
    const follow = hand.filter((c) => suit(c) === suit(led));
    const cand = follow.length ? follow : hand;
    if (s.trickCount === 0) {
      const clean = cand.filter((c) => suit(c) !== HEART && c !== QS);
      if (clean.length) return clean;
    }
    return cand;
  }
  if (s.trickCount === 0) return hand.includes(0) ? [0] : [];
  let cand = hand;
  if (!s.broken) {
    const nonHearts = hand.filter((c) => suit(c) !== HEART);
    if (nonHearts.length) cand = nonHearts;
  }
  return cand;
}

function chooseAI(s: GameState, p: number): number {
  const legal = legalCards(s, p);
  return legal.reduce((best, c) => (rank(c) < rank(best) || (rank(c) === rank(best) && c < best) ? c : best));
}

function applyPlay(s: GameState, p: number, card: number): GameState {
  const hands = s.hands.map((h, i) => (i === p ? h.filter((c) => c !== card) : h));
  const trick = s.trick.slice();
  trick[p] = card;
  const broken = s.broken || suit(card) === HEART;
  if (trick.some((c) => c == null)) return { ...s, hands, trick, broken };
  const ledSuit = suit(trick[s.lead] as number);
  let winner = s.lead;
  for (let i = 1; i < 4; i++) {
    const pi = (s.lead + i) % 4;
    const c = trick[pi] as number;
    if (suit(c) === ledSuit && rank(c) > rank(trick[winner] as number)) winner = pi;
  }
  const taken = s.taken.map((a, i) => (i === winner ? [...a, ...trick.filter((c): c is number => c != null)] : a));
  const pts = trick.reduce<number>(
    (sum, c) => (c == null ? sum : sum + (suit(c) === HEART ? 1 : c === QS ? 13 : 0)),
    0,
  );
  const roundPts = s.roundPts.slice();
  roundPts[winner] += pts;
  const trickCount = s.trickCount + 1;
  const cleared = { ...s, hands, taken, roundPts, broken, trick: [null, null, null, null], lead: winner, trickCount };
  if (hands.some((h) => h.length > 0)) return cleared;
  let moon = -1;
  for (let i = 0; i < 4; i++) {
    if (taken[i].filter((c) => suit(c) === HEART).length === 13 && taken[i].includes(QS)) moon = i;
  }
  const gains = [0, 0, 0, 0];
  if (moon >= 0) {
    for (let i = 0; i < 4; i++) gains[i] = i === moon ? -26 : 26;
  } else {
    for (let i = 0; i < 4; i++) gains[i] = roundPts[i];
  }
  const totals = s.totals.map((t, i) => t + gains[i]);
  return {
    ...cleared,
    roundPts: gains,
    totals,
    phase: totals.some((t) => t >= GOAL) ? "gameEnd" : "roundEnd",
    moon,
  };
}

function CardFace({
  id,
  small,
  disabled,
  highlight,
  onClick,
}: {
  id: number;
  small?: boolean;
  disabled?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}): ReactNode {
  const red = isRed(id);
  return (
    <button
      type="button"
      className={`xg-hc ${small ? "xg-hc--small" : ""} ${red ? "xg-hc--r" : "xg-hc--b"} ${highlight ? "xg-hc--lead" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Kartu ${RANK_CHAR[rank(id)]} ${suit(id) === HEART ? "Hati" : suit(id) === SPADE ? "Sekop" : suit(id) === DIAMOND ? "Wajik" : "Keriting"}`}
    >
      <span className="xg-hc__r">{RANK_CHAR[rank(id)]}</span>
      <span className="xg-hc__s">{SUIT_CHAR[suit(id)]}</span>
    </button>
  );
}

function seatPos(p: number): string {
  return p === 1 ? "w" : p === 2 ? "n" : "e";
}

export function HeartsGame(): ReactNode {
  const [s, setS] = useState<GameState>(() => deal([0, 0, 0, 0]));

  useEffect(() => {
    if (s.phase !== "trick") return;
    const t = setTimeout(() => {
      setS((prev) => {
        if (prev.phase !== "trick") return prev;
        const filled = prev.trick.filter((c) => c != null).length;
        const toAct = (prev.lead + filled) % 4;
        if (toAct === 0) return prev;
        return applyPlay(prev, toAct, chooseAI(prev, toAct));
      });
    }, 500);
    return () => clearTimeout(t);
  }, [s.phase, s.lead, s.trick]);

  const filled = s.trick.filter((c) => c != null).length;
  const turn = (s.lead + filled) % 4;
  const humanTurn = s.phase === "trick" && turn === 0;
  const legal = s.phase === "trick" && turn === 0 ? legalCards(s, 0) : [];

  const play = (card: number) => {
    setS((prev) => {
      const f = prev.trick.filter((c) => c != null).length;
      if (prev.phase !== "trick" || (prev.lead + f) % 4 !== 0) return prev;
      if (!legalCards(prev, 0).includes(card)) return prev;
      return applyPlay(prev, 0, card);
    });
  };

  const newRound = () => setS((prev) => deal(prev.totals));
  const newGame = () => setS(deal([0, 0, 0, 0]));

  let banner = "";
  if (s.phase === "roundEnd" || s.phase === "gameEnd") {
    banner =
      s.phase === "gameEnd"
        ? `Permainan selesai! Pemenang: ${NAMES[s.totals.indexOf(Math.min(...s.totals))]} (${Math.min(...s.totals)} poin).`
        : "Ronde selesai.";
    if (s.moon >= 0) banner += ` ${NAMES[s.moon]} menembak bulan: -26 poin.`;
  }

  return (
    <div className="xg-app xg-h">
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
        .xg-h__score {
          display: flex;
          gap: 6px;
          padding: 6px 8px 4px;
        }
        .xg-h__pl {
          flex: 1;
          min-width: 0;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          padding: 3px 6px;
        }
        .xg-h__pl-name {
          font-weight: 700;
        }
        .xg-h__pl-total {
          float: right;
          font-weight: 700;
        }
        .xg-h__pl-round {
          color: #555;
          margin-left: 4px;
        }
        .xg-h__pl--on {
          outline: 2px solid #ff0;
          outline-offset: -2px;
        }
        .xg-h__table {
          position: relative;
          flex: 1;
          min-height: 150px;
          margin: 4px 8px;
          background: #7ab36f;
          border: 2px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-h__seat {
          position: absolute;
          font-weight: 700;
          background: #ece9d8;
          border: 1px solid #808080;
          padding: 1px 6px;
        }
        .xg-h__seat--n {
          top: 4px;
          left: 50%;
          transform: translateX(-50%);
        }
        .xg-h__seat--w {
          left: 4px;
          top: 50%;
          transform: translateY(-50%);
        }
        .xg-h__seat--e {
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
        }
        .xg-h__seat--on {
          color: #c00;
        }
        .xg-h__trick {
          position: absolute;
          transform: translate(-50%, -50%);
        }
        .xg-h__trick--n {
          left: 50%;
          top: 34px;
        }
        .xg-h__trick--w {
          left: 82px;
          top: 50%;
        }
        .xg-h__trick--e {
          left: calc(100% - 82px);
          top: 50%;
        }
        .xg-h__trick--s {
          left: 50%;
          top: calc(100% - 40px);
        }
        .xg-h__hand {
          display: flex;
          justify-content: center;
          gap: 3px;
          padding: 6px 8px 4px;
        }
        .xg-hc {
          width: 32px;
          height: 44px;
          padding: 0;
          background: #fff;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          font-family: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .xg-hc--r {
          color: #c00;
        }
        .xg-hc--b {
          color: #000;
        }
        .xg-hc__r {
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
        }
        .xg-hc__s {
          font-size: 16px;
          line-height: 1.1;
        }
        .xg-hc:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .xg-hc--lead {
          outline: 2px solid #ff0;
          outline-offset: -2px;
        }
        .xg-hc--small {
          width: 26px;
          height: 36px;
          cursor: default;
          pointer-events: none;
        }
        .xg-hc--small .xg-hc__r {
          font-size: 9px;
        }
        .xg-hc--small .xg-hc__s {
          font-size: 13px;
        }
        .xg-h__status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px 8px;
        }
        .xg-h__msg {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
      <div className="xg-h__score">
        {NAMES.map((n, p) => (
          <div key={n} className={`xg-h__pl ${turn === p && s.phase === "trick" ? "xg-h__pl--on" : ""}`}>
            <span className="xg-h__pl-name">{n}</span>
            <span className="xg-h__pl-round">({s.roundPts[p]})</span>
            <span className="xg-h__pl-total">{s.totals[p]}</span>
          </div>
        ))}
      </div>
      <div className="xg-h__table">
        {[1, 2, 3].map((p) => (
          <div key={p} className={`xg-h__seat xg-h__seat--${seatPos(p)} ${turn === p && s.phase === "trick" ? "xg-h__seat--on" : ""}`}>
            {NAMES[p]} - {s.hands[p].length}
          </div>
        ))}
        {s.trick.map((c, p) =>
          c != null ? (
            <div key={p} className={`xg-h__trick xg-h__trick--${p === 0 ? "s" : seatPos(p)}`}>
              <CardFace id={c} small />
            </div>
          ) : null,
        )}
      </div>
      <div className="xg-h__hand">
        {s.hands[0].map((c) => (
          <CardFace
            key={c}
            id={c}
            highlight={s.trickCount === 0 && c === 0}
            disabled={!humanTurn || !legal.includes(c)}
            onClick={() => play(c)}
          />
        ))}
      </div>
      <div className="xg-h__status">
        <span className="xg-h__msg">
          {s.phase === "trick" && (
            <>
              Giliran: <strong>{NAMES[turn]}</strong>
              {s.trickCount === 0 ? " (tipe pertama, tanpa hati)" : ""}
              {s.trickCount > 0 && !s.broken ? " - hati belum dibuka" : ""}
              {!humanTurn ? " - AI berpikir..." : " - klik kartu"}
            </>
          )}
          {banner && <strong>{banner}</strong>}
        </span>
        {s.phase === "roundEnd" && (
          <button type="button" className="xg-btn" onClick={newRound}>
            Ronde Baru
          </button>
        )}
        {s.phase === "gameEnd" && (
          <button type="button" className="xg-btn" onClick={newGame}>
            Game Baru
          </button>
        )}
      </div>
    </div>
  );
}
