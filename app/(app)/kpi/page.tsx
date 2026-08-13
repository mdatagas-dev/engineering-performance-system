"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { validateKpiInput, type MockKpiConfig } from "@/lib/mocks/kpi";
import { formatDecimal } from "@/lib/production-table/format";

const EMPTY: MockKpiConfig = {
  id: "",
  key: "",
  name: "",
  formula: "",
  unit: "",
  decimals: 2,
  target: 0,
  higherIsBetter: true,
  warningThreshold: null,
  criticalThreshold: null,
  definition: null,
  sourceData: null,
  isActive: true,
  isDeleted: false,
};

// KPI dari API tidak membawa isDeleted (server sudah menyaring soft-delete).
type ApiKpiItem = Omit<MockKpiConfig, "isDeleted"> & { isDeleted?: boolean };

function thresholdLabel(t: number | null, higher: boolean): string {
  if (t === null) return "—";
  return higher ? `≥ ${t}` : `≤ ${t}`;
}

export default function KpiPage() {
  const session = useSessionGuard("kpi.configure");
  const [items, setItems] = useState<MockKpiConfig[]>([]);
  const [editing, setEditing] = useState<MockKpiConfig | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MockKpiConfig>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<"ok" | "err">("ok");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/kpi?perPage=100")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Gagal memuat KPI."))))
      .then((data: { items?: ApiKpiItem[] }) => setItems((data.items ?? []).filter((k) => k.isDeleted !== true) as MockKpiConfig[]))
      .catch(() => undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/kpi?perPage=100")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Gagal memuat KPI."))))
      .then((data: { items?: ApiKpiItem[] }) => {
        if (alive) setItems((data.items ?? []).filter((k) => k.isDeleted !== true) as MockKpiConfig[]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => items.filter((k) => !k.isDeleted), [items]);

  if (!session) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  function flash(msg: string, kind: "ok" | "err" = "ok") {
    setNoticeKind(kind);
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3000);
  }

  function openCreate() {
    setForm({ ...EMPTY });
    setFormError(null);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(k: MockKpiConfig) {
    setForm({ ...k });
    setFormError(null);
    setEditing(k);
    setCreating(false);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const err = validateKpiInput(form, items);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    try {
      const body = {
        key: form.key,
        name: form.name,
        formula: form.formula,
        unit: form.unit,
        decimals: form.decimals,
        target: form.target,
        higherIsBetter: form.higherIsBetter,
        warningThreshold: form.warningThreshold,
        criticalThreshold: form.criticalThreshold,
        definition: form.definition,
        sourceData: form.sourceData,
        isActive: form.isActive,
      };
      const res = await fetch(
        creating ? "/api/kpi" : `/api/kpi/${encodeURIComponent(editing?.key ?? form.key)}`,
        {
          method: creating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creating ? body : { ...body, key: undefined }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menyimpan KPI.");
      await load();
      flash(creating ? "KPI dibuat." : "KPI diperbarui.");
      closeDialog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal menyimpan KPI.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(k: MockKpiConfig) {
    try {
      const res = await fetch(`/api/kpi/${encodeURIComponent(k.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !k.isActive }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah status KPI.");
      await load();
      flash(k.isActive ? "KPI dinonaktifkan." : "KPI diaktifkan.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Gagal mengubah status KPI.", "err");
    }
  }

  async function remove(k: MockKpiConfig) {
    if (!window.confirm(`Hapus KPI "${k.name}"?`)) return;
    try {
      const res = await fetch(`/api/kpi/${encodeURIComponent(k.key)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus KPI.");
      await load();
      flash("KPI dihapus.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Gagal menghapus KPI.", "err");
    }
  }

  const numInput =
    "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-100";
  const labelCls = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pengaturan KPI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Konfigurasi indikator, target &amp; ambang peringatan.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90"
        >
          + Tambah KPI
        </button>
      </div>

      {notice && (
        <p
          role="status"
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            noticeKind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          {notice}
        </p>
      )}

      <section className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">Belum ada KPI.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-950/10 text-[11px] tracking-wide text-slate-500 uppercase dark:border-white/10 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Formula</th>
                  <th className="px-4 py-3 text-right font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Arah</th>
                  <th className="px-4 py-3 font-medium">Ambang</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-950/5 dark:divide-white/5">
                {rows.map((k) => (
                  <tr key={k.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                    <td className="px-4 py-3 font-mono text-xs text-cyan-700 dark:text-cyan-400">{k.key}</td>
                    <td className="px-4 py-3 font-medium">
                      {k.name}
                      {k.unit && <span className="ml-1.5 text-[10px] text-slate-400">({k.unit})</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{k.formula}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatDecimal(k.target)}</td>
                    <td className="px-4 py-3 text-[11px]">
                      {k.higherIsBetter ? (
                        <span className="text-emerald-700 dark:text-emerald-400">↑ semakin besar</span>
                      ) : (
                        <span className="text-rose-700 dark:text-rose-400">↓ semakin kecil</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      Warn {thresholdLabel(k.warningThreshold, k.higherIsBetter)} · Crit{" "}
                      {thresholdLabel(k.criticalThreshold, k.higherIsBetter)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                          k.isActive
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {k.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(k)}
                          className="rounded-md border border-slate-950/15 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(k)}
                          className="rounded-md border border-slate-950/15 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:hover:bg-white/10"
                        >
                          {k.isActive ? "Nonaktif" : "Aktif"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(k)}
                          className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="glass-card w-full max-w-lg rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight">{creating ? "Tambah KPI" : "Edit KPI"}</h2>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Tutup"
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-950/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {formError && (
              <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-400">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-key">Key</label>
                <input
                  id="kpi-key"
                  value={form.key}
                  disabled={Boolean(editing)}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  className={numInput}
                  placeholder="uph_rate"
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-name">Nama</label>
                <input
                  id="kpi-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={numInput}
                  placeholder="UPH (Unit per Hour)"
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls} htmlFor="kpi-formula">Formula</label>
                <input
                  id="kpi-formula"
                  value={form.formula}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                  className={numInput}
                  placeholder="UPH Result / Working Hour"
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-unit">Unit</label>
                <input
                  id="kpi-unit"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className={numInput}
                  placeholder="unit/jam"
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-target">Target</label>
                <input
                  id="kpi-target"
                  type="number"
                  step="any"
                  value={Number.isFinite(form.target) ? form.target : ""}
                  onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                  className={numInput}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-warn">Warning Threshold</label>
                <input
                  id="kpi-warn"
                  type="number"
                  step="any"
                  value={form.warningThreshold ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, warningThreshold: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={numInput}
                />
              </div>
              <div className="col-span-1">
                <label className={labelCls} htmlFor="kpi-crit">Critical Threshold</label>
                <input
                  id="kpi-crit"
                  type="number"
                  step="any"
                  value={form.criticalThreshold ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, criticalThreshold: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className={numInput}
                />
              </div>
              <div className="col-span-2 flex items-center gap-4 text-xs">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.higherIsBetter}
                    onChange={(e) => setForm({ ...form, higherIsBetter: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-cyan-600"
                  />
                  Semakin besar semakin baik
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-3.5 w-3.5 rounded accent-cyan-600"
                  />
                  Aktif
                </label>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-600/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
