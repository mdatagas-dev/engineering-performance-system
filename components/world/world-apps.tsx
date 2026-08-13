"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import pkg from "@/package.json";

/* ============================================================
   Konten jendela THE WORLD — tiap app punya cerita & fungsi.
   ============================================================ */

export function AboutApp() {
  return (
    <div>
      <p className="text-[15px] font-semibold text-[#e6f0ff]">GAS ELECTRONIC — Engineering Production System</p>
      <p className="mt-1 text-xs text-[#7c8db5]">v{pkg.version} · THE WORLD build · {new Date().getFullYear()}</p>
      <hr className="world-hr" />
      <p>
        Ini bukan dashboard. Ini sebuah <span className="text-[#9fe8d8]">dunia</span> — arsip hidup dari
        sistem produksi yang mencatat setiap detak lini, setiap shift, setiap unit yang lahir.
      </p>
      <p className="mt-3">
        Dunia ini disusun seperti sistem operasi kuno yang ditemukan kembali: jendela yang bisa
        diseret, terminal yang bisa diajak bicara, dan arsip yang terus bertumbuh.
      </p>
      <hr className="world-hr" />
      <ul className="flex flex-col gap-1.5 text-xs text-[#93a9d8]">
        <li>▸ Tiap ikon di desktop membuka satu pintu.</li>
        <li>▸ Terminal mengerti beberapa perintah — coba ketik <span className="text-[#9fe8d8]">help</span>.</li>
        <li>▸ Dunia ini menyimpan rahasia. Yang sabar akan menemukannya.</li>
      </ul>
    </div>
  );
}

const METERS: { label: string; value: number; text: string }[] = [
  { label: "CORE LOAD", value: 42, text: "42%" },
  { label: "MEMORY", value: 68, text: "6.8 / 10 GB" },
  { label: "ARCHIVE INDEX", value: 87, text: "87% tergambar" },
  { label: "SIGNAL INTEGRITY", value: 99, text: "99.4%" },
];

export function SystemApp() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => (v + 1) % 1000), 1800);
    return () => clearInterval(t);
  }, []);
  const drift = METERS.map((m, i) => Math.min(99, Math.max(5, m.value + ((tick + i * 7) % 11) - 5)));

  return (
    <div>
      <p className="text-[13px] font-semibold text-[#e6f0ff]">SISTEM — status dunia</p>
      <p className="mt-0.5 text-xs text-[#7c8db5]">Telemetri waktu-nyata · simulasi lokal</p>
      <div className="mt-4 flex flex-col gap-3">
        {METERS.map((m, i) => (
          <div key={m.label}>
            <div className="mb-1 flex items-center justify-between text-[10.5px]">
              <span className="font-mono tracking-wider text-[#7c8db5]">{m.label}</span>
              <span className="font-mono text-[#c6d6f5]">{m.text}</span>
            </div>
            <div className="world-meter">
              <div className="world-meter__fill" style={{ width: `${drift[i]}%` }} />
            </div>
          </div>
        ))}
      </div>
      <hr className="world-hr" />
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <dt className="text-[10px] tracking-wider text-[#5b6c94] uppercase">UPTIME</dt>
          <dd className="mt-0.5 font-mono text-[#c6d6f5]">{formatUptime(tick)}</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <dt className="text-[10px] tracking-wider text-[#5b6c94] uppercase">WORLD CORE</dt>
          <dd className="mt-0.5 font-mono text-[#9fe8d8]">ONLINE</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <dt className="text-[10px] tracking-wider text-[#5b6c94] uppercase">THREAT</dt>
          <dd className="mt-0.5 font-mono text-[#4ade80]">NEGLIGIBLE</dd>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <dt className="text-[10px] tracking-wider text-[#5b6c94] uppercase">CLEARANCE</dt>
          <dd className="mt-0.5 font-mono text-[#fbbf24]">GUEST</dd>
        </div>
      </dl>
    </div>
  );
}

function formatUptime(seed: number): string {
  const h = 3 + (seed % 11);
  const m = (seed * 7) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String((seed * 13) % 60).padStart(2, "0")}`;
}

const FILES = [
  { icon: "▤", name: "L1_SHIFT_A_2026-08-13.csv", meta: "1.2 KB" },
  { icon: "▥", name: "PLAN_AGUSTUS.prd", meta: "encrypted" },
  { icon: "▦", name: "MANIFEST_RIWAYAT.txt", meta: "24 baris" },
  { icon: "◈", name: "KUNCI_WORLD.key", meta: "—" },
  { icon: "▣", name: "LOG_BOOT_096.log", meta: "read-only" },
  { icon: "▤", name: "L2_SHIFT_C_2026-08-12.csv", meta: "980 B" },
];

export function ArchiveApp() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div>
      <p className="text-[13px] font-semibold text-[#e6f0ff]">ARSIP — digital archive</p>
      <p className="mt-0.5 text-xs text-[#7c8db5]">
        {FILES.length} entri · sebagian terkunci untuk guest
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {FILES.map((f) => (
          <div
            key={f.name}
            className={`world-file ${selected === f.name ? "!border-cyan-300/40 !bg-cyan-400/10" : ""}`}
            onClick={() => setSelected(f.name)}
            onDoubleClick={() => setSelected(f.name)}
          >
            <span className="world-file__icon">{f.icon}</span>
            <span className="world-file__name">{f.name}</span>
            <span className="world-file__meta">{f.meta}</span>
          </div>
        ))}
      </div>
      {selected && (
        <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-[#93a9d8]">
          <span className="font-mono text-[#9fe8d8]">$ preview {selected}</span>
          {"\n"}Berkas terindeks. Konten penuh tersedia setelah verifikasi identitas di ACCESS TERMINAL.
        </p>
      )}
    </div>
  );
}

const DOC_SECTIONS = [
  { h: "01 · Cara masuk", body: "Buka ACCESS TERMINAL di desktop. Identitas terverifikasi = pintu ke dunia dalam." },
  { h: "02 · Berkeliling", body: "Seret judul jendela untuk memindahkannya. Klik ✕ menutup, – meminimalkan ke bilah bawah." },
  { h: "03 · Terminal", body: "Jendela TERMINAL menerima perintah teks. help menampilkan daftar." },
  { h: "04 · Arsip", body: "ARSIP menyimpan jejak data produksi. Sebagian terkunci — buka lewat akses." },
];

export function DocumentApp() {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[#e6f0ff]">DOKUMEN — manual penjelajah</p>
      <p className="mt-0.5 text-xs text-[#7c8db5]">edisi {new Date().getFullYear()} · bahasa: id</p>
      <hr className="world-hr" />
      <div className="flex flex-col gap-3">
        {DOC_SECTIONS.map((s) => (
          <div key={s.h}>
            <p className="text-xs font-semibold text-[#cfe0ff]">{s.h}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#93a9d8]">{s.body}</p>
          </div>
        ))}
      </div>
      <hr className="world-hr" />
      <p className="text-[11px] text-[#5b6c94]">
        Catatan kecil: dunia ini menyukai yang penasaran. Beberapa hal tidak tertulis di manual.
      </p>
    </div>
  );
}

/* ---------- TERMINAL ---------- */

type TermLine = { text: string; tone?: "cmd" | "ok" | "warn" | "err" | "dim" };

const BANNER = [
  "GAS ELECTRONIC OS — terminal",
  "tipe 'help' untuk daftar perintah.",
];

type TerminalHandlers = {
  onAccess: () => void;
};

export function TerminalApp({ onAccess }: TerminalHandlers) {
  const [lines, setLines] = useState<TermLine[]>([
    { text: BANNER[0], tone: "ok" },
    { text: BANNER[1], tone: "dim" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase();
    const reply: TermLine[] = [{ text: `guest@world:~$ ${raw}`, tone: "cmd" }];
    if (cmd === "") {
      // kosong
    } else if (cmd === "help") {
      reply.push(
        { text: "perintah yang dikenal:", tone: "ok" },
        { text: "  help       — daftar ini", tone: "dim" },
        { text: "  about      — tentang dunia", tone: "dim" },
        { text: "  ls         — isi arsip", tone: "dim" },
        { text: "  status     — telemetri sistem", tone: "dim" },
        { text: "  whoami     — identitas sesi", tone: "dim" },
        { text: "  date       — waktu dunia", tone: "dim" },
        { text: "  access     — buka ACCESS TERMINAL", tone: "dim" },
        { text: "  clear      — bersihkan layar", tone: "dim" },
        { text: "  secret     — ???", tone: "dim" }
      );
    } else if (cmd === "about") {
      reply.push({ text: "GAS ELECTRONIC · Engineering Production System — dunia arsip produksi yang terus hidup.", tone: "ok" });
    } else if (cmd === "ls") {
      reply.push(
        { text: "ABOUT  SYSTEM  ARCHIVE  DOCUMENT  TERMINAL  ACCESS_TERMINAL", tone: "ok" },
        { text: "3 entri terkunci (guest)", tone: "dim" }
      );
    } else if (cmd === "status") {
      reply.push({ text: "core: ONLINE · memori: 68% · arsip: 87% · threat: negligible", tone: "ok" });
    } else if (cmd === "whoami") {
      reply.push({ text: "guest — clearance rendah. Verifikasi di ACCESS TERMINAL untuk naik level.", tone: "ok" });
    } else if (cmd === "date") {
      reply.push({ text: new Date().toLocaleString("id-ID"), tone: "ok" });
    } else if (cmd === "access") {
      reply.push({ text: "Membuka ACCESS TERMINAL…", tone: "ok" });
      onAccess();
    } else if (cmd === "secret" || cmd === "easter egg" || cmd === "easter") {
      reply.push(
        { text: "Kau menemukan satu. Coba: klik logo dunia di pojok bawah 3×,", tone: "warn" },
        { text: "atau ketik 'konami' di sini.", tone: "warn" }
      );
    } else if (cmd === "konami") {
      reply.push({ text: "↑↑↓↓←→←→BA — mode dunia diaktifkan.", tone: "ok" });
      onKonamiFlag();
    } else if (cmd === "clear") {
      setLines([]);
      setHistIdx(-1);
      return;
    } else {
      reply.push({ text: `perintah tidak dikenal: ${cmd}. ketik 'help'.`, tone: "err" });
    }
    setLines((prev) => [...prev, ...reply]);
    setHistIdx(-1);
  };

  // Konami via terminal → beri isyarat; pengaktifan visual di orkestrator.
  const onKonamiFlag = () => window.dispatchEvent(new CustomEvent("world:konami"));

  const submit = () => {
    const v = input.trim();
    if (!v) return;
    setHistory((h) => [...h, v]);
    run(v);
    setInput("");
  };

  return (
    <div
      className="term"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
          if (history[idx]) {
            setInput(history[idx]);
            setHistIdx(idx);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const idx = histIdx + 1;
          if (history[idx]) {
            setInput(history[idx]);
            setHistIdx(idx);
          } else {
            setInput("");
            setHistIdx(-1);
          }
        }
      }}
    >
      <div ref={outRef} className="term__out">
        {lines.map((l, i) => (
          <div key={i} className={`term__line--${l.tone ?? "dim"}`}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="term__input-row">
        <span className="term__prompt">guest@world:~$</span>
        <input
          ref={inputRef}
          className="term__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          spellCheck={false}
          autoComplete="off"
          aria-label="Perintah terminal"
        />
        <span className="term__cursor" />
      </div>
    </div>
  );
}

/* ---------- ACCESS TERMINAL ---------- */

type AccessProps = {
  onEnter: () => void; // navigasi ke /login
  delay: number; // jeda animasi "verifikasi" (ms)
};

export function AccessApp({ onEnter, delay }: AccessProps) {
  const [state, setState] = useState<"idle" | "scanning" | "granted">("idle");
  useEffect(() => {
    if (state !== "scanning") return;
    const t = setTimeout(() => setState("granted"), delay);
    return () => clearTimeout(t);
  }, [state, delay]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
      <div
        className="grid h-16 w-16 place-items-center rounded-2xl border border-cyan-300/40 bg-cyan-400/10 font-mono text-lg font-bold text-cyan-200 shadow-[0_0_30px_rgb(94_234_212/0.35)]"
        style={{ animation: "world-icon-pulse 2.4s ease-in-out infinite" }}
      >
        ⌘
      </div>
      <div>
        <p className="text-sm font-semibold tracking-wide text-[#e6f0ff]">ACCESS TERMINAL</p>
        <p className="mt-1 text-[11px] text-[#7c8db5]">Gerbang ke dunia dalam — verifikasi identitas dibutuhkan</p>
      </div>

      {state === "idle" && (
        <button
          type="button"
          className="rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-5 py-2.5 text-xs font-semibold tracking-widest text-cyan-100 uppercase transition hover:bg-cyan-400/20 hover:shadow-[0_0_24px_rgb(56_189_248/0.35)]"
          onClick={() => setState("scanning")}
        >
          Mulai Verifikasi
        </button>
      )}
      {state === "scanning" && (
        <div className="flex flex-col items-center gap-2">
          <div className="world-meter w-56">
            <div
              className="world-meter__fill"
              style={{ width: "100%", animation: "world-access-scan 1.2s linear forwards" }}
            />
          </div>
          <p className="font-mono text-[11px] text-[#9fe8d8]">memverifikasi identitas…</p>
        </div>
      )}
      {state === "granted" && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-mono text-xs text-[#4ade80]">✓ identitas diakui — pintu terbuka</p>
          <button
            type="button"
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-xs font-semibold tracking-widest text-white uppercase shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
            onClick={onEnter}
          >
            Masuk ke Dunia
          </button>
        </div>
      )}
    </div>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
