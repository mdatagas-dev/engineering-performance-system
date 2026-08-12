"use client";

import { useEffect, useState } from "react";
import { sessionStartedAt } from "@/lib/mocks/session";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function SessionClock() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(sessionStartedAt).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono tabular-nums text-sm font-semibold text-cyan-600 dark:text-cyan-400">{fmt(elapsed)}</span>;
}
