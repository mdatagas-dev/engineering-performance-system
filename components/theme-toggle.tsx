"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("eps-theme", cb);
  return () => window.removeEventListener("eps-theme", cb);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return true; // default dark (industrial)
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("eps-theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("eps-theme"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle tema"
      className="grid h-9 w-9 place-items-center rounded-full border border-slate-950/10 text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
