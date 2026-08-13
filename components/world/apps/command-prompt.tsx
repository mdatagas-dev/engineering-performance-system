"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import "../../../app/win95-apps.css";

type Props = { onLogin: () => void };
type Line = { text: string; cls?: string };

const BANNER: Line[] = [
  { text: "GAS ELECTRONIC OS [Version 95.0]" },
  { text: "(C) GAS ELECTRONIC Corporation 1998-2026.", cls: "win95-term__dim" },
  { text: "" },
  { text: "Ketik 'help' untuk daftar perintah.", cls: "win95-term__dim" },
];

const HELP: { text: string; desc: string }[] = [
  { text: "DIR", desc: "menampilkan isi direktori" },
  { text: "CLS", desc: "membersihkan layar" },
  { text: "VER", desc: "versi sistem" },
  { text: "DATE", desc: "tanggal hari ini" },
  { text: "ABOUT", desc: "tentang sistem" },
  { text: "WHOAMI", desc: "identitas sesi" },
  { text: "ACCESS", desc: "buka ACCESS TERMINAL" },
  { text: "SECRET", desc: "???" },
  { text: "KONAMI", desc: "???" },
  { text: "SHUTDOWN", desc: "mematikan sistem" },
];

const DIR: Line[] = [
  { text: " Volume in drive C is THE WORLD", cls: "win95-term__dim" },
  { text: " Volume Serial Number is 1998-0007", cls: "win95-term__dim" },
  { text: " Directory of C:\\THEWORLD", cls: "win95-term__dim" },
  { text: "" },
  { text: "SECRETS      <DIR>         16-07-1998  03:33" },
  { text: "GAS          <DIR>         08-01-1998  09:00" },
  { text: "README.TXT                666  13-08-1998  23:59" },
  { text: "KONAMI.TXT                 42  13-08-1998  23:59" },
  { text: "NOTHING.HERE                0  06-06-1998  06:06" },
  { text: "" },
  { text: "         3 File(s)    708 bytes", cls: "win95-term__dim" },
  { text: "         2 Dir(s)  64.0 MB free", cls: "win95-term__dim" },
];

export function CommandPromptApp({ onLogin }: Props): ReactNode {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [shutting, setShutting] = useState(false);
  const outRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const shutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (shutTimer.current) clearTimeout(shutTimer.current);
    },
    []
  );

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const reply: Line[] = [];
    const push = (text: string, cls?: string) => reply.push({ text, cls });

    if (cmd === "help") {
      push("Daftar perintah yang tersedia:", "win95-term__dim");
      for (const h of HELP) push(`${h.text.padEnd(9)} ${h.desc}`, "win95-term__dim");
    } else if (cmd === "dir") {
      reply.push(...DIR);
    } else if (cmd === "cls") {
      setLines([]);
      setHistIdx(-1);
      return;
    } else if (cmd === "ver") {
      push("GAS ELECTRONIC OS Version 95.0 (THE WORLD Build)");
    } else if (cmd === "date") {
      push(new Date().toString());
    } else if (cmd === "about") {
      push("GAS ELECTRONIC OS — Engineering Production System.");
      push("Sebuah dunia arsip produksi yang hidup di dalam mesin. Version 95.0.", "win95-term__dim");
    } else if (cmd === "whoami") {
      push("TAMU", "win95-term__dim");
      push("Clearance: rendah. Verifikasi identitas di ACCESS TERMINAL untuk naik level.", "win95-term__dim");
    } else if (cmd === "access") {
      push("Membuka ACCESS TERMINAL…");
      onLogin();
    } else if (cmd === "secret") {
      push("Rahasia dunia: kode kuno ↑↑↓↓←→←→BA membuka mode rahasia.", "win95-term__dim");
      push("Dan logo GAS ELECTRONIC di pojok bawah suka diklik tiga kali.", "win95-term__dim");
    } else if (cmd === "konami") {
      push("↑↑↓↓←→←→BA — mode nostalgia dipanggil dari dalam terminal.", "win95-term__dim");
      push("Dunia menatapmu kembali. Jangan sia-siakan perhatiannya.", "win95-term__dim");
    } else if (cmd === "shutdown") {
      push("Memulai shutdown…");
      setLines((prev) => [...prev, ...reply]);
      setShutting(true);
      shutTimer.current = setTimeout(() => setShutting(false), 2000);
      return;
    } else {
      push(`Perintah tidak dikenal: ${cmd}. Ketik 'help'.`, "win95-term__dim");
    }
    setLines((prev) => [...prev, ...reply]);
    setHistIdx(-1);
  };

  const submit = () => {
    const v = input.trim();
    if (!v) return;
    setHistory((h) => [...h, v]);
    setLines((prev) => [...prev, { text: `C:\\THEWORLD>${v}` }]);
    run(v);
    setInput("");
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const i = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      if (history[i]) {
        setInput(history[i]);
        setHistIdx(i);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const i = histIdx + 1;
      if (history[i]) {
        setInput(history[i]);
        setHistIdx(i);
      } else {
        setInput("");
        setHistIdx(-1);
      }
    }
  };

  return (
    <div className="win95-app win95-term" onClick={() => inputRef.current?.focus()}>
      <div ref={outRef} className="win95-term__out" role="log" aria-label="Output terminal">
        {lines.map((l, i) => (
          <div key={i} className={l.cls ?? ""}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="win95-term__inputrow">
        <span className="win95-term__prompt" aria-hidden>
          C:\THEWORLD&gt;
        </span>
        <input
          ref={inputRef}
          className="win95-term__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          aria-label="Perintah DOS"
        />
      </div>
      {shutting && (
        <div className="win95-term__shutdown" role="alert">
          <div>It&apos;s now safe to turn off your computer.</div>
        </div>
      )}
    </div>
  );
}
