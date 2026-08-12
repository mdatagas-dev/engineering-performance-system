"use client";

import { useEffect, useRef, useState } from "react";
import { formatRemaining } from "@/lib/mocks/format-remaining";

export type LockoutNoticeProps = {
  lockedUntil?: string | number;
  remainingSeconds?: number;
  onCountdownEnd?: () => void;
  // Pesan kustom sebelum "Coba lagi dalam {sisa}." (default: pesan lockout akun).
  message?: string;
};

export default function LockoutNotice({ lockedUntil, remainingSeconds, onCountdownEnd, message }: LockoutNoticeProps) {
  const [deadline] = useState(() =>
    lockedUntil !== undefined
      ? new Date(lockedUntil).getTime()
      : Date.now() + (remainingSeconds ?? 0) * 1000
  );
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, deadline - Date.now()));
  const endFired = useRef(false);

  useEffect(() => {
    if (remainingMs <= 0) {
      if (!endFired.current) {
        endFired.current = true;
        onCountdownEnd?.();
      }
      return;
    }
    const id = setInterval(() => setRemainingMs(Math.max(0, deadline - Date.now())), 1000);
    return () => clearInterval(id);
  }, [remainingMs, deadline, onCountdownEnd]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <p>
        {message ?? "Akun terkunci sementara. Terlalu banyak percobaan login."} Coba lagi dalam{" "}
        <span className="font-mono font-semibold tabular-nums">{formatRemaining(remainingMs)}</span>.
      </p>
    </div>
  );
}
