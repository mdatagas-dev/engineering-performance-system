"use client";

import { useEffect, useState, type ReactNode } from "react";

const PATTERNS = [
  "1B", "2B", "3B", "4B", "5B", "6B", "7B", "8B", "9B",
  "1C", "2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C",
  "E", "S", "W", "N", "Red",
];

function tileColor(p: string): string {
  if (p.endsWith("B")) return "#0a7a0a";
  if (p.endsWith("C")) return "#1a5bd4";
  switch (p) {
    case "E":
      return "#0a7a0a";
    case "S":
    case "Red":
      return "#c00000";
    case "W":
      return "#1a5bd4";
    default:
      return "#111";
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(): (string | null)[] {
  const counts = new Map<string, number>();
  for (const p of PATTERNS) counts.set(p, 2);
  for (let i = 0; i < 9; i++) {
    const p = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    counts.set(p, (counts.get(p) as number) + 2);
  }
  const tiles: string[] = [];
  counts.forEach((c, p) => {
    for (let i = 0; i < c; i++) tiles.push(p);
  });
  return shuffle(tiles);
}

export function MahjongGame(): ReactNode {
  const [tiles, setTiles] = useState<(string | null)[]>(() => buildTiles());
  const [sel, setSel] = useState<number | null>(null);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (!started || won) return;
    const t = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [started, won]);

  const click = (i: number) => {
    if (won || tiles[i] == null) return;
    if (sel == null) {
      setSel(i);
      setStarted(true);
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    const a = tiles[sel] as string;
    const b = tiles[i] as string;
    if (a === b) {
      const next = tiles.slice();
      next[sel] = null;
      next[i] = null;
      setTiles(next);
      setSel(null);
      setMatches((m) => m + 1);
      if (next.every((t) => t == null)) setWon(true);
    } else {
      setSel(i);
    }
  };

  const newGame = () => {
    setTiles(buildTiles());
    setSel(null);
    setMatches(0);
    setSeconds(0);
    setStarted(false);
    setWon(false);
  };

  return (
    <div className="xg-app xg-m">
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
        .xg-m__top {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px 2px;
        }
        .xg-m__label {
          font-weight: 700;
        }
        .xg-m__count {
          background: #000;
          color: #f00;
          font-family: "Courier New", monospace;
          font-size: 14px;
          font-weight: 700;
          padding: 2px 6px;
          border: 1px solid #808080;
          min-width: 44px;
          text-align: center;
        }
        .xg-m__board {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 3px;
          padding: 8px;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }
        .xg-mt {
          height: 44px;
          padding: 0;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }
        .xg-mt:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-mt--sel {
          background: #d6c9a8;
          outline: 2px solid #ff0;
          outline-offset: -2px;
        }
        .xg-mt--gone {
          visibility: hidden;
        }
        .xg-m__bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 4px;
          font-weight: 700;
        }
        .xg-m__win {
          text-align: center;
          padding: 6px;
          font-weight: 700;
          font-size: 12px;
        }
        .xg-m__help {
          text-align: center;
          color: #555;
          padding: 0 10px 8px;
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
      <div className="xg-m__top">
        <span className="xg-m__label">Pemasangan:</span>
        <span className="xg-m__count">{String(matches).padStart(2, "0")}</span>
        <span className="xg-m__label">Waktu:</span>
        <span className="xg-m__count">{String(seconds).padStart(3, "0")}</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="xg-btn" onClick={newGame}>
          Game Baru
        </button>
      </div>
      <div className="xg-m__board" role="grid" aria-label="Papan Mahjong">
        {tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            className={`xg-mt ${sel === i && t != null ? "xg-mt--sel" : ""} ${t == null ? "xg-mt--gone" : ""}`}
            style={t != null ? { color: tileColor(t) } : undefined}
            onClick={() => click(i)}
            disabled={t == null}
            aria-label={t != null ? `Ubin ${t}` : "Kosong"}
          >
            {t}
          </button>
        ))}
      </div>
      {won && (
        <div className="xg-m__win">Selamat! Mahjong selesai dalam {seconds} detik.</div>
      )}
      <div className="xg-m__bar">
        {!won && <span>{tiles.filter((t) => t != null).length} ubin tersisa</span>}
        {won && <span>0 ubin tersisa</span>}
      </div>
      <div className="xg-m__help">
        Aturan sederhana: dua ubin sama boleh dihapus dari posisi mana pun (tanpa aturan ubin bebas).
      </div>
    </div>
  );
}
