"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const SIZE = 20;
const CELL = 19;

type Pt = { x: number; y: number };
type Dir = Pt;
type Status = "playing" | "over";
type Game = {
  snake: Pt[];
  food: Pt;
  score: number;
  status: Status;
  paused: boolean;
};

const KEYS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  W: { x: 0, y: -1 },
  S: { x: 0, y: 1 },
  A: { x: -1, y: 0 },
  D: { x: 1, y: 0 },
};

function spawnFood(snake: Pt[]): Pt {
  for (;;) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

function freshGame(): Game {
  const snake: Pt[] = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  return { snake, food: spawnFood(snake), score: 0, status: "playing", paused: false };
}

export function SnakeGame(): ReactNode {
  const [game, setGame] = useState<Game>(freshGame);
  const dirRef = useRef<Dir>({ x: 1, y: 0 });

  const tick = useCallback(() => {
    setGame((g) => {
      if (g.status !== "playing" || g.paused) return g;
      const dir = dirRef.current;
      const head = g.snake[0];
      const nx = head.x + dir.x;
      const ny = head.y + dir.y;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return { ...g, status: "over" };
      const grow = nx === g.food.x && ny === g.food.y;
      const body = grow ? g.snake : g.snake.slice(0, -1);
      if (body.some((s) => s.x === nx && s.y === ny)) return { ...g, status: "over" };
      const snake = [{ x: nx, y: ny }, ...g.snake];
      if (grow) snake.pop();
      return {
        ...g,
        snake,
        score: grow ? g.score + 1 : g.score,
        food: grow ? spawnFood(snake) : g.food,
      };
    });
  }, []);

  const togglePause = useCallback(() => {
    setGame((g) => (g.status === "playing" ? { ...g, paused: !g.paused } : g));
  }, []);

  const reset = useCallback(() => {
    dirRef.current = { x: 1, y: 0 };
    setGame(freshGame());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.key === " " || e.key.toLowerCase() === "p") {
        togglePause();
        return;
      }
      const d = KEYS[e.key];
      if (!d) return;
      const cur = dirRef.current;
      if (d.x === -cur.x && d.y === -cur.y) return;
      if (d.x === cur.x && d.y === cur.y) return;
      dirRef.current = d;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);

  useEffect(() => {
    if (game.status !== "playing" || game.paused) return;
    const speed = Math.max(50, 170 - game.snake.length * 2);
    const t = setInterval(tick, speed);
    return () => clearInterval(t);
  }, [game.status, game.paused, game.snake.length, tick]);

  const bodySet = new Set(game.snake.map((p) => `${p.x},${p.y}`));
  const foodKey = `${game.food.x},${game.food.y}`;

  return (
    <div className="xg-snake">
      <div className="xg-snake__bar">
        <div className="xg-snake__score">
          Skor: <b>{game.score}</b>
        </div>
        <div className="xg-snake__btns">
          <button type="button" className="xg-snake__btn" onClick={togglePause} disabled={game.status !== "playing"}>
            {game.paused ? "Lanjut" : "Jeda"}
          </button>
          <button type="button" className="xg-snake__btn" onClick={reset}>
            Game Baru
          </button>
        </div>
      </div>
      <div className="xg-snake__frame">
        <div className="xg-snake__board" role="grid" aria-label="Papan Ular 20x20">
          {Array.from({ length: SIZE * SIZE }, (_, i) => {
            const x = i % SIZE;
            const y = Math.floor(i / SIZE);
            const k = `${x},${y}`;
            const isHead = k === `${game.snake[0].x},${game.snake[0].y}`;
            const cls =
              k === foodKey
                ? "xg-snake__cell xg-snake__cell--food"
                : isHead
                  ? "xg-snake__cell xg-snake__cell--head"
                  : bodySet.has(k)
                    ? "xg-snake__cell xg-snake__cell--body"
                    : "xg-snake__cell";
            return <div key={i} className={cls} />;
          })}
          {(game.status === "over" || game.paused) && (
            <div className="xg-snake__overlay">
              {game.status === "over" ? (
                <>
                  <div className="xg-snake__overlay-title">Game Over</div>
                  <div className="xg-snake__overlay-sub">Skor: {game.score}</div>
                  <button type="button" className="xg-snake__btn" onClick={reset}>
                    Main Lagi
                  </button>
                </>
              ) : (
                <>
                  <div className="xg-snake__overlay-title">Jeda</div>
                  <div className="xg-snake__overlay-sub">Tekan Spasi/P untuk lanjut</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="xg-snake__hint">Panah/WASD gerak &middot; Spasi/P jeda</div>
      <style jsx>{`
        .xg-snake {
          width: fit-content;
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          background: #ece9d8;
          padding: 8px;
          user-select: none;
        }
        .xg-snake__bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 4px 8px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          margin-bottom: 8px;
        }
        .xg-snake__score {
          color: #000;
        }
        .xg-snake__btns {
          display: flex;
          gap: 6px;
        }
        .xg-snake__btn {
          font-family: "Tahoma", "MS Sans Serif", sans-serif;
          font-size: 11px;
          padding: 3px 10px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
          cursor: pointer;
        }
        .xg-snake__btn:active {
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
        }
        .xg-snake__btn:disabled {
          color: #808080;
          cursor: default;
        }
        .xg-snake__frame {
          display: inline-block;
          padding: 4px;
          background: #ece9d8;
          border: 2px solid;
          border-top-color: #fff;
          border-left-color: #fff;
          border-bottom-color: #808080;
          border-right-color: #808080;
        }
        .xg-snake__board {
          position: relative;
          display: grid;
          grid-template-columns: repeat(${SIZE}, ${CELL}px);
          grid-template-rows: repeat(${SIZE}, ${CELL}px);
          border: 2px solid;
          border-top-color: #808080;
          border-left-color: #808080;
          border-bottom-color: #fff;
          border-right-color: #fff;
          background: #c7c29f;
          overflow: hidden;
        }
        .xg-snake__cell {
          background: #d2cdbb;
        }
        .xg-snake__cell--body {
          background: #4caf50;
        }
        .xg-snake__cell--head {
          background: #2e7d32;
        }
        .xg-snake__cell--food {
          background: #d32f2f;
          border-radius: 50%;
          transform: scale(0.62);
        }
        .xg-snake__overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(236, 233, 216, 0.92);
        }
        .xg-snake__overlay-title {
          font-size: 20px;
          font-weight: 700;
          color: #000;
        }
        .xg-snake__overlay-sub {
          color: #000;
        }
        .xg-snake__hint {
          margin-top: 6px;
          color: #000;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
