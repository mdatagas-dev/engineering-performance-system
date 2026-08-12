"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Konfirmasi generik untuk aksi sensitif/destruktif (toggle nonaktif, ubah
// peran). Tutup: tombol batal, klik backdrop, atau Esc.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="glass-card relative w-full max-w-md p-6"
      >
        <h2 id="confirm-dialog-title" className="text-base font-bold tracking-tight">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "rounded-lg bg-gradient-to-r from-rose-600 to-red-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:opacity-90"
                : "rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
