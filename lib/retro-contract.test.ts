// KONTAK antar komponen retro Windows 95 (world/gate/app95/pages/css).
// Test MURNI statis: baca source file via fs + string check. Tanpa render React, tanpa jsdom.
// Skenario: agent berbeda membangun komponen paralel → kontrak ekspor & props dicek PERSIS.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Path relatif dari file test (lib/) ke project root: ../ → root.
// Anchor ke __dirname (bukan cwd) supaya run dari direktori mana pun tetap benar.
const ROOT = path.join(__dirname, "..");
const read = (rel: string): string => readFileSync(path.join(ROOT, rel), "utf8");

const hasAll = (src: string, subs: string[], label: string) => {
  for (const s of subs) {
    assert.ok(src.includes(s), `${label}: harus memuat "${s}"`);
  }
};

describe("world", () => {
  it("win95-icons.tsx: default Win95Icon + named Win95IconName + SEMUA case render", () => {
    const src = read("components/world/win95-icons.tsx");
    hasAll(src, ["export default Win95Icon", "export type Win95IconName"], "win95-icons");
    const names = [
      "my-computer",
      "my-documents",
      "notepad",
      "calculator",
      "minesweeper",
      "command-prompt",
      "system-info",
      "recycle-bin",
      "about",
      "access-terminal",
      "folder",
      "folder-open",
      "file",
      "drive",
      "computer",
      "key",
      "login",
      "wrench",
      "windows-flag",
    ];
    for (const n of names) {
      assert.ok(src.includes(`case "${n}":`), `win95-icons: case render "${n}" hilang`);
    }
  });

  it("window-shell.tsx: default WindowShell + named WinSize/WinPos/WindowShellProps + field lengkap", () => {
    const src = read("components/world/window-shell.tsx");
    hasAll(src, ["export default function WindowShell", "export type WinSize", "export type WinPos", "export type WindowShellProps"], "window-shell");
    const fields = [
      "id",
      "title",
      "icon",
      "focused",
      "minimized",
      "maximized",
      "closing",
      "z",
      "initialPos",
      "initialSize",
      "onFocus",
      "onMinimize",
      "onMaximizeToggle",
      "onClose",
      "children",
    ];
    for (const f of fields) {
      assert.ok(src.includes(`${f}:`), `WindowShellProps: field "${f}" hilang`);
    }
  });

  it("desktop.tsx: default export Desktop", () => {
    const src = read("components/world/desktop.tsx");
    assert.match(src, /export default function Desktop/);
  });

  it("apps/*.tsx: named export + props sesuai kontrak (10 file)", () => {
    const apps: [string, string, string[]][] = [
      ["notepad", "export function NotepadApp", ["file"]],
      ["calculator", "export function CalculatorApp", []],
      ["minesweeper", "export function MinesweeperApp", []],
      ["my-computer", "export function MyComputerApp", ["onOpenNotepad"]],
      ["documents", "export function DocumentsApp", ["onOpenNotepad"]],
      ["system-properties", "export function SystemPropertiesApp", []],
      ["access-terminal", "export function AccessTerminalApp", ["onLogin"]],
      ["recycle-bin", "export function RecycleBinApp", []],
      ["about", "export function AboutApp", ["onClose"]],
      ["command-prompt", "export function CommandPromptApp", ["onLogin"]],
    ];
    for (const [file, exp, props] of apps) {
      const src = read(`components/world/apps/${file}.tsx`);
      assert.ok(src.includes(exp), `${file}.tsx: ${exp} hilang`);
      for (const p of props) {
        const ok = src.includes(`${p}:`) || src.includes(`${p}?:`);
        assert.ok(ok, `${file}.tsx: prop "${p}" hilang`);
      }
    }
  });
});

describe("gate", () => {
  it("login-gate.tsx: default LoginGate + LoginGateProps (onLogin, onSuccess, initialMessage?, alreadyIn?)", () => {
    const src = read("components/gate/login-gate.tsx");
    hasAll(src, ["export default function LoginGate", "export type LoginGateProps"], "login-gate");
    for (const f of ["onLogin", "onSuccess", "initialMessage?", "alreadyIn?"]) {
      assert.ok(src.includes(`${f}`), `LoginGateProps: "${f}" hilang`);
    }
  });
});

describe("app95", () => {
  it("app95-shell.tsx: default App95Shell + 4 named type + props lengkap", () => {
    const src = read("components/app95/app95-shell.tsx");
    hasAll(
      src,
      [
        "export function App95Shell",
        "export default App95Shell",
        "export type App95MenuItem",
        "export type App95ToolbarBtn",
        "export type App95NavItem",
        "export type App95StatusItem",
      ],
      "app95-shell"
    );
    for (const f of ["title", "icon?", "menu?", "toolbar?", "navItems?", "status?", "userLabel?", "onLogout?", "children"]) {
      assert.ok(src.includes(`${f}`), `App95Shell props: "${f}" hilang`);
    }
  });

  it("app95-home-content.tsx: App95HomeContent (named+default) + App95HomeProps (user{name,email,role}, onNavigate?)", () => {
    const src = read("components/app95/app95-home-content.tsx");
    hasAll(src, ["export function App95HomeContent", "export default App95HomeContent", "export type App95HomeProps"], "app95-home-content");
    for (const f of ["name", "email", "role", "onNavigate?"]) {
      assert.ok(src.includes(`${f}`), `App95HomeProps: "${f}" hilang`);
    }
  });
});

describe("pages", () => {
  it("app/page.tsx ada & render <Desktop", () => {
    const p = "app/page.tsx";
    assert.ok(existsSync(p), `${p} harus ada`);
    assert.ok(read(p).includes("<Desktop"), `${p} harus render <Desktop`);
  });

  it("app/login/page.tsx ada & render <LoginGate", () => {
    const p = "app/login/page.tsx";
    assert.ok(existsSync(p), `${p} harus ada`);
    assert.ok(read(p).includes("<LoginGate"), `${p} harus render <LoginGate`);
  });

  it("app/home/page.tsx ada & render <App95Shell", () => {
    const p = "app/home/page.tsx";
    assert.ok(existsSync(p), `${p} harus ada`);
    assert.ok(read(p).includes("<App95Shell"), `${p} harus render <App95Shell`);
  });
});

describe("css", () => {
  it("4 css global ada: win95-window/win95-shell/win95-apps/win95-gate", () => {
    for (const f of ["win95-window.css", "win95-shell.css", "win95-apps.css", "win95-gate.css"]) {
      assert.ok(existsSync(`app/${f}`), `app/${f} harus ada`);
    }
  });

  it("app/layout.tsx meng-import SEMUA 4 css", () => {
    const src = read("app/layout.tsx");
    for (const f of ["win95-window.css", "win95-shell.css", "win95-apps.css", "win95-gate.css"]) {
      assert.ok(src.includes(`import "./${f}"`), `layout.tsx: import "./${f}" hilang`);
    }
  });
});
