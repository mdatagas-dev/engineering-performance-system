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
type FSNode = { dirs: Record<string, FSNode>; files: Record<string, number> };

const BANNER: Line[] = [
  { text: "GAS ELECTRONIC OS [Version 95.0]" },
  { text: "(C) GAS ELECTRONIC Corporation 1998-2026.", cls: "win95-term__dim" },
  { text: "" },
  { text: "Ketik 'help' untuk daftar perintah.", cls: "win95-term__dim" },
];

const HELP: { text: string; desc: string }[] = [
  { text: "CD", desc: "ganti direktori" },
  { text: "DIR", desc: "menampilkan isi direktori" },
  { text: "ECHO", desc: "menampilkan teks" },
  { text: "TIME", desc: "waktu saat ini" },
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

const FS: FSNode = {
  dirs: {
    Documents: { dirs: {}, files: { "NOTES.TXT": 42 } },
    "Program Files": {
      dirs: { "GAS ELECTRONIC": { dirs: {}, files: { "OS.EXE": 1998 } } },
      files: {},
    },
    Windows: { dirs: { System32: { dirs: {}, files: { "HAL.DLL": 128 } } }, files: {} },
    SECRETS: { dirs: {}, files: { "FORBIDDEN.TXT": 0 } },
    GAS: { dirs: {}, files: { "MANIFEST.TXT": 777 } },
  },
  files: { "README.TXT": 666, "KONAMI.TXT": 42, "NOTHING.HERE": 0 },
};

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const NOT_FOUND = "Sistem tidak dapat menemukan jalur yang ditentukan.";

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function CommandPromptApp({ onLogin }: Props): ReactNode {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cwd, setCwd] = useState<string[]>([]);
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

  const cwdPath = (): string =>
    cwd.length === 0 ? "C:\\" : `C:\\${cwd.join("\\")}`;

  const resolveNode = (segments: string[]): FSNode => {
    let node: FSNode = FS;
    for (const seg of segments) {
      const next = Object.entries(node.dirs).find(
        ([k]) => k.toLowerCase() === seg.toLowerCase()
      );
      if (!next) return FS;
      node = next[1];
    }
    return node;
  };

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const reply: Line[] = [];
    const push = (text: string, cls?: string) => reply.push({ text, cls });

    if (cmd === "help") {
      push("Daftar perintah yang tersedia:", "win95-term__dim");
      for (const h of HELP) push(`${h.text.padEnd(9)} ${h.desc}`, "win95-term__dim");
    } else if (cmd === "cd") {
      push(cwdPath(), "win95-term__dim");
    } else if (cmd.startsWith("cd ")) {
      const target = raw.trim().slice(3).trim();
      if (target === "\\") {
        setCwd([]);
      } else if (target === "..") {
        if (cwd.length === 0) push(NOT_FOUND, "win95-term__dim");
        else setCwd((prev) => prev.slice(0, -1));
      } else if (target.includes("\\") || target.includes("/")) {
        push(NOT_FOUND, "win95-term__dim");
      } else {
        const node = resolveNode(cwd);
        const found = Object.entries(node.dirs).find(
          ([k]) => k.toLowerCase() === target.toLowerCase()
        );
        if (found) setCwd((prev) => [...prev, found[0]]);
        else push(NOT_FOUND, "win95-term__dim");
      }
    } else if (cmd === "dir") {
      const node = resolveNode(cwd);
      push(" Volume in drive C is THE WORLD", "win95-term__dim");
      push(" Volume Serial Number is 1998-0007", "win95-term__dim");
      push(` Directory of ${cwdPath()}`, "win95-term__dim");
      push("");
      const dirNames = Object.keys(node.dirs).sort();
      for (const d of dirNames) {
        push(`${d.padEnd(13)}<DIR>         16-07-1998  03:33`);
      }
      const fileNames = Object.keys(node.files).sort();
      let totalBytes = 0;
      for (const f of fileNames) {
        const size = node.files[f];
        totalBytes += size;
        push(`${f.padEnd(24)}${String(size).padStart(6)}  13-08-1998  23:59`);
      }
      push("");
      push(`         ${fileNames.length} File(s)  ${totalBytes} bytes`, "win95-term__dim");
      push(`         ${dirNames.length} Dir(s)  64.0 MB free`, "win95-term__dim");
    } else if (cmd === "echo") {
      push("");
    } else if (cmd.startsWith("echo ")) {
      push(raw.trim().slice(5));
    } else if (cmd === "time") {
      const now = new Date();
      push(`${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`);
    } else if (cmd === "cls") {
      setLines([]);
      setHistIdx(-1);
      return;
    } else if (cmd === "ver") {
      push("GAS ELECTRONIC OS Version 95.0 (THE WORLD Build)");
    } else if (cmd === "date") {
      const now = new Date();
      push(`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`);
    } else if (cmd === "about") {
      push("GAS ELECTRONIC OS - Engineering Production System.");
      push("Sebuah dunia arsip produksi yang hidup di dalam mesin. Version 95.0.", "win95-term__dim");
    } else if (cmd === "whoami") {
      push("TAMU", "win95-term__dim");
      push("Clearance: rendah. Verifikasi identitas di ACCESS TERMINAL untuk naik level.", "win95-term__dim");
    } else if (cmd === "access") {
      push("Membuka ACCESS TERMINAL...");
      onLogin();
    } else if (cmd === "secret") {
      push("Rahasia dunia: kode kuno ^ ^ v v < > < > BA membuka mode rahasia.", "win95-term__dim");
      push("Dan logo GAS ELECTRONIC di pojok bawah suka diklik tiga kali.", "win95-term__dim");
    } else if (cmd === "konami") {
      push("^ ^ v v < > < > BA - mode nostalgia dipanggil dari dalam terminal.", "win95-term__dim");
      push("Dunia menatapmu kembali. Jangan sia-siakan perhatiannya.", "win95-term__dim");
    } else if (cmd === "shutdown") {
      push("Memulai shutdown...");
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
    setLines((prev) => [...prev, { text: `${cwdPath()}>${v}` }]);
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
          {cwdPath()}&gt;
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
