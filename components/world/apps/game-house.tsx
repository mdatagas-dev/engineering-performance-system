"use client";

import { useState, type ReactNode } from "react";
import WinXpIcon, { type WinXpIconName } from "../winxp-icons";
import { MinesweeperApp } from "./minesweeper";
import { SolitaireGame } from "./solitaire";
import { FreeCellGame } from "./freecell";
import { HeartsGame } from "./hearts";
import { MahjongGame } from "./mahjong";
import { PinballGame } from "./pinball";
import { SnakeGame } from "./snake";
import { TetrisGame } from "./tetris";
import { ChessGame } from "./chess";
import { SudokuGame } from "./sudoku";
import "../../../app/winxp-apps.css";

type Panel =
  | { kind: "game"; game: string }
  | { kind: "settings" }
  | { kind: "help" }
  | null;

const GAMES: { name: string; icon: WinXpIconName }[] = [
  { name: "Solitaire", icon: "file" },
  { name: "Minesweeper", icon: "minesweeper" },
  { name: "FreeCell", icon: "file" },
  { name: "Hearts", icon: "file" },
  { name: "Mahjong", icon: "file" },
  { name: "Pinball", icon: "file" },
  { name: "Snake", icon: "file" },
  { name: "Tetris", icon: "file" },
  { name: "Chess", icon: "file" },
  { name: "Sudoku", icon: "file" },
];

const GAME_COMPONENTS: Record<string, () => ReactNode> = {
  Solitaire: SolitaireGame,
  Minesweeper: MinesweeperApp,
  FreeCell: FreeCellGame,
  Hearts: HeartsGame,
  Mahjong: MahjongGame,
  Pinball: PinballGame,
  Snake: SnakeGame,
  Tetris: TetrisGame,
  Chess: ChessGame,
  Sudoku: SudokuGame,
};

const SCORES = [
  { game: "Minesweeper", player: "Administrator", score: "124 detik", date: "12/08/2026" },
  { game: "Solitaire", player: "Operator Lini 1", score: "2:48", date: "11/08/2026" },
  { game: "Tetris", player: "Tim QA", score: "41.200", date: "10/08/2026" },
  { game: "Snake", player: "Administrator", score: "87", date: "09/08/2026" },
];

export function GameHouseApp(): ReactNode {
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const active = panel?.kind === "game" ? GAMES.find((g) => g.name === panel.game) : null;
  const ActiveGame = panel?.kind === "game" ? GAME_COMPONENTS[panel.game] : null;

  return (
    <div className="xpa-app xpa-gh" onMouseDown={() => setSelected(null)}>
      <div className="xpa-gh__top">
        <div className="xpa-gh__title">
          <WinXpIcon name="game-house" size={24} />
          <span style={{ verticalAlign: "middle" }}> GAS ELECTRONIC Game House</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" className="xpa-btn" onClick={() => setPanel({ kind: "settings" })}>
            Settings
          </button>
          <button type="button" className="xpa-btn" onClick={() => setPanel({ kind: "help" })}>
            Help
          </button>
        </div>
      </div>
      <div className="xpa-gh__grid">
        {GAMES.map((g) => (
          <button
            key={g.name}
            type="button"
            className={`xpa-gh__tile ${selected === g.name ? "xpa-gh__tile--selected" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelected(g.name);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setPanel({ kind: "game", game: g.name });
            }}
          >
            <WinXpIcon name={g.icon} size={32} />
            <span>{g.name}</span>
          </button>
        ))}
      </div>
      <div className="xpa-gh__sub">Papan Skor (mock)</div>
      <div className="xpa-gh__score">
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Player</th>
              <th>Score</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {SCORES.map((s) => (
              <tr key={`${s.game}-${s.date}`}>
                <td>{s.game}</td>
                <td>{s.player}</td>
                <td>{s.score}</td>
                <td>{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {active && ActiveGame && (
        <div className="xpa-dialog" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-dialog__box xpa-gh__panel" role="dialog" aria-modal="true" aria-label={active.name}>
            <div className="xpa-gh__panel-title">
              <span>
                <WinXpIcon name={active.icon} size={16} />
                <span style={{ verticalAlign: "middle" }}> {active.name}</span>
              </span>
              <button type="button" className="xpa-btn" onClick={() => setPanel(null)}>
                Close
              </button>
            </div>
            <div className="xpa-gh__panel-body">
              <ActiveGame />
            </div>
          </div>
        </div>
      )}
      {panel?.kind === "settings" && (
        <div className="xpa-dialog" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-dialog__box" role="dialog" aria-modal="true" aria-label="Settings Game House">
            <div className="xpa-dialog__title">
              <WinXpIcon name="control-panel" size={16} />
              Settings
            </div>
            <div className="xpa-dialog__body">
              <div className="xpa-cp__row">
                <span>Efek suara</span>
                <span className="xpa-cp__ok">On (mock)</span>
              </div>
              <div className="xpa-cp__row">
                <span>Tema kartu</span>
                <span>Robot</span>
              </div>
              <p className="xpa-cp__muted">Pengaturan disimpan secara lokal (tidak benar-benar).</p>
              <div className="xpa-dialog__actions">
                <button type="button" className="xpa-btn" onClick={() => setPanel(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {panel?.kind === "help" && (
        <div className="xpa-dialog" onMouseDown={(e) => e.stopPropagation()}>
          <div className="xpa-dialog__box" role="dialog" aria-modal="true" aria-label="Bantuan Game House">
            <div className="xpa-dialog__title">
              <WinXpIcon name="help" size={16} />
              Help
            </div>
            <div className="xpa-dialog__body">
              <p>Game House GAS ELECTRONIC.</p>
              <p className="xpa-cp__muted">
                Klik dua kali sebuah game untuk memainkannya. Semua game sudah dapat dimainkan.
              </p>
              <p className="xpa-cp__muted">
                Kontrol: Snake = panah / WASD untuk gerak. Tetris = panah untuk gerak dan rotasi,
                spasi untuk jatuh cepat. Sudoku = angka 1-9 untuk mengisi, panah untuk pindah sel.
                Pinball = A / L untuk flipper kiri-kanan. Solitaire, FreeCell dan Hearts = klik kartu,
                klik dua kali untuk memindah. Mahjong = klik dua ubin yang sama untuk memasangkan.
                Chess = klik bidak lalu klik petak tujuan. Minesweeper = klik kiri untuk membuka,
                klik kanan untuk bendera.
              </p>
              <p className="xpa-cp__muted">Papan skor hanya contoh statis.</p>
              <div className="xpa-dialog__actions">
                <button type="button" className="xpa-btn" onClick={() => setPanel(null)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
