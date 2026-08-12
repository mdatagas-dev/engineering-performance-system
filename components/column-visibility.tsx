"use client";

export type ColumnDef = {
  id: string;
  label: string;
  /** Kolom wajib (Date/Model/Shift) — checkbox terkunci, selalu tampil. */
  required?: boolean;
};

// Panel kontrol tampil/tidaknya kolom Tabel Produksi Harian — stateless;
// state + persistensi localStorage dikelola halaman pemakai.
export default function ColumnVisibility({
  columns,
  visible,
  onToggle,
  onReset,
}: {
  columns: readonly ColumnDef[];
  visible: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const shown = columns.filter((c) => visible.has(c.id)).length;

  return (
    <section className="glass-card p-4" aria-label="Preferensi kolom tabel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Preferensi Kolom</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {shown}/{columns.length} kolom tampil · Date, Model &amp; Shift selalu tampil.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-950/15 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-950/5 disabled:pointer-events-none disabled:opacity-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
        >
          Reset ke default
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {columns.map((c) => {
          const checked = visible.has(c.id);
          const required = c.required === true;
          return (
            <label
              key={c.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition select-none ${
                required
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300"
                  : checked
                    ? "border-slate-950/20 bg-white/70 text-slate-700 dark:border-white/20 dark:bg-white/[0.06] dark:text-slate-200"
                    : "border-slate-950/10 bg-slate-950/[0.03] text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={required}
                onChange={() => onToggle(c.id)}
                className="h-3.5 w-3.5 accent-cyan-600 disabled:cursor-not-allowed"
              />
              <span>{c.label}</span>
              {required && (
                <span className="rounded bg-cyan-500/15 px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                  selalu
                </span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}