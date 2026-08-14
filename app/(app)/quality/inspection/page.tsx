"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";
import { RecordStatus } from "@/app/generated/prisma/enums";
import { todayIso } from "@/lib/dashboard/dates";

// Inspeksi Kualitas - input (POST /api/quality/checks) + datagrid dengan
// aksi workflow (Submit / Approve / Lock / Edit / Delete DRAFT).

type QualityCheck = {
  id: string;
  date: string;
  model: string;
  shift: string | null;
  areaId: string | null;
  inspectedQty: number;
  passedQty: number;
  failedQty: number;
  defectCount: number;
  note: string | null;
  status: RecordStatus;
  version: number;
  createdAt: string;
  defects: { defectCode: string; defectName: string; quantity: number }[];
};

type DefectLine = { key: string; defectCode: string; defectName: string; quantity: string };

type FormState = {
  date: string;
  model: string;
  shift: string;
  areaId: string;
  inspectedQty: string;
  passedQty: string;
  failedQty: string;
  defectCount: string;
  note: string;
  defects: DefectLine[];
};

const EMPTY_FORM: FormState = {
  date: "",
  model: "",
  shift: "",
  areaId: "",
  inspectedQty: "",
  passedQty: "",
  failedQty: "",
  defectCount: "",
  note: "",
  defects: [{ key: "d1", defectCode: "", defectName: "", quantity: "" }],
};

const numFmt = new Intl.NumberFormat("id-ID");
const fmtInt = (v: number): string => numFmt.format(v);

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";
const labelClass = "text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400";

const TH_CLS =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-3 py-2.5 text-left text-[10px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const TD_LEFT = "px-3 py-2 text-xs whitespace-nowrap text-left";
const TD_RIGHT = "px-3 py-2 text-xs whitespace-nowrap text-right tabular-nums";

const STATUS_META: Record<RecordStatus, { label: string; cls: string }> = {
  [RecordStatus.DRAFT]: {
    label: "Draft",
    cls: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400",
  },
  [RecordStatus.SUBMITTED]: {
    label: "Submitted",
    cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  },
  [RecordStatus.REVIEWED]: {
    label: "Reviewed",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  },
  [RecordStatus.APPROVED]: {
    label: "Approved",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  [RecordStatus.LOCKED]: {
    label: "Locked",
    cls: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
};

function StatusBadge({ status }: { status: RecordStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const actionBtn =
  "rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const actionPrimary = `${actionBtn} border-cyan-500/40 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-400`;
const actionEmerald = `${actionBtn} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400`;
const actionViolet = `${actionBtn} border-violet-500/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-400`;
const actionIdle = `${actionBtn} border-slate-950/15 text-slate-600 hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10`;
const actionDanger = `${actionBtn} border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400`;

// GET /api/quality/checks - multi-halaman (pola lib/api/records.ts).
async function fetchAllChecks(): Promise<QualityCheck[]> {
  const all: QualityCheck[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`/api/quality/checks?perPage=100&page=${page}`);
    if (!res.ok) throw new Error(`Gagal memuat data inspeksi (${res.status}).`);
    const data = (await res.json()) as { items: QualityCheck[]; total: number };
    all.push(...data.items);
    if (page * 100 >= data.total || data.items.length === 0) break;
    page += 1;
  }
  return all.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

function toPayload(form: FormState) {
  const defects = form.defects
    .filter((d) => d.defectCode.trim() !== "" || d.defectName.trim() !== "")
    .map((d) => ({
      defectCode: d.defectCode.trim(),
      defectName: d.defectName.trim(),
      quantity: Number(d.quantity) || 0,
    }));
  return {
    date: form.date,
    model: form.model.trim(),
    shift: form.shift === "" ? null : form.shift,
    areaId: form.areaId === "" ? null : form.areaId,
    inspectedQty: Number(form.inspectedQty) || 0,
    passedQty: Number(form.passedQty) || 0,
    failedQty: Number(form.failedQty) || 0,
    defectCount: Number(form.defectCount) || 0,
    note: form.note.trim() === "" ? null : form.note.trim(),
    defects,
  };
}

function validate(form: FormState): string | null {
  if (form.date === "") return "Tanggal wajib diisi.";
  if (form.model.trim() === "") return "Model wajib diisi.";
  const inspectedQty = Number(form.inspectedQty) || 0;
  const passedQty = Number(form.passedQty) || 0;
  const failedQty = Number(form.failedQty) || 0;
  if (inspectedQty <= 0) return "Jumlah inspeksi harus lebih dari 0.";
  if (passedQty + failedQty > inspectedQty) return "Passed + Failed tidak boleh melebihi jumlah inspeksi.";
  for (const d of form.defects) {
    if (d.defectCode.trim() === "" && d.defectName.trim() !== "") return "Baris defect memerlukan kode defect.";
    if (d.defectCode.trim() !== "" && (Number(d.quantity) || 0) <= 0) return "Kuantitas defect harus lebih dari 0.";
  }
  return null;
}

export default function QualityInspectionPage() {
  const session = useSessionGuard("quality.record");
  const authed = session !== null;

  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, date: todayIso() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sumber area (GET /api/users) - pola halaman audit.
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetch("/api/users?perPage=100")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: Array<{ id: string; name: string; area: { id: string; name: string } | null }> } | null) => {
        if (!alive || !data?.items) return;
        const seen = new Map<string, { id: string; name: string }>();
        for (const u of data.items) {
          if (u.area && !seen.has(u.area.id)) seen.set(u.area.id, { id: u.area.id, name: u.area.name });
        }
        setAreas([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    let alive = true;
    fetchAllChecks()
      .then((rs) => {
        if (alive) setChecks(rs);
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : "Gagal memuat data.");
      });
    return () => {
      alive = false;
    };
  }, [authed, reloadKey]);

  const models = useMemo(() => [...new Set(checks.map((c) => c.model))].sort(), [checks]);

  if (!authed) {
    return (
      <div className="grid flex-1 place-items-center">
        <div className="shimmer h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-800/80" />
      </div>
    );
  }

  const setField = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const updateDefect = (key: string, patch: Partial<DefectLine>) =>
    setForm((f) => ({ ...f, defects: f.defects.map((d) => (d.key === key ? { ...d, ...patch } : d)) }));

  const addDefect = () =>
    setForm((f) => ({
      ...f,
      defects: [...f.defects, { key: `d${f.defects.length + 1}-${Date.now()}`, defectCode: "", defectName: "", quantity: "" }],
    }));

  const removeDefect = (key: string) =>
    setForm((f) => ({ ...f, defects: f.defects.length > 1 ? f.defects.filter((d) => d.key !== key) : f.defects }));

  const resetForm = () => {
    setEditingId(null);
    setActionError(null);
    setForm({ ...EMPTY_FORM, date: todayIso() });
  };

  const startEdit = (c: QualityCheck) => {
    setEditingId(c.id);
    setActionError(null);
    setForm({
      date: c.date,
      model: c.model,
      shift: c.shift ?? "",
      areaId: c.areaId ?? "",
      inspectedQty: String(c.inspectedQty),
      passedQty: String(c.passedQty),
      failedQty: String(c.failedQty),
      defectCount: String(c.defectCount),
      note: c.note ?? "",
      defects:
        c.defects.length > 0
          ? c.defects.map((d, i) => ({ key: `d${i + 1}`, defectCode: d.defectCode, defectName: d.defectName, quantity: String(d.quantity) }))
          : [{ key: "d1", defectCode: "", defectName: "", quantity: "" }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const error = validate(form);
    if (error) {
      setActionError(error);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const payload = toPayload(form);
      const res = await fetch(editingId ? `/api/quality/checks/${editingId}` : "/api/quality/checks", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? (editingId ? "Gagal memperbarui inspeksi." : "Gagal menyimpan inspeksi."));
      resetForm();
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menyimpan inspeksi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: QualityCheck) => {
    if (!window.confirm(`Yakin hapus inspeksi ${c.date} / ${c.model} (Draft)?`)) return;
    try {
      const res = await fetch(`/api/quality/checks/${c.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal menghapus inspeksi.");
      setActionError(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus inspeksi.");
    }
  };

  const transition = async (c: QualityCheck, status: RecordStatus) => {
    try {
      const res = await fetch(`/api/quality/checks/${c.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? "Gagal mengubah status inspeksi.");
      setActionError(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal mengubah status inspeksi.");
    }
  };

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col gap-6 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
      <section className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Inspeksi Kualitas</h1>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-cyan-700 uppercase dark:text-cyan-400">
                Quality Record
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Input inspeksi + alur status Draft &gt; Submitted &gt; Approved &gt; Locked{loadError ? ` - ${loadError}` : ""}.
            </p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {fmtInt(checks.length)} inspeksi
          </span>
        </div>
      </section>

      {actionError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-400">
          {actionError}
        </div>
      )}

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{editingId ? `Edit Inspeksi (${editingId.slice(0, 8)})` : "Input Inspeksi Baru"}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {editingId ? "PATCH /api/quality/checks/:id - simpan kembali sebagai Draft." : "POST /api/quality/checks - tersimpan sebagai Draft."}
            </p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className={actionIdle}>
              Batal Edit
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Tanggal</span>
            <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Model</span>
            <input
              type="text"
              value={form.model}
              list="quality-model-options"
              onChange={(e) => setField("model", e.target.value)}
              placeholder="contoh: LV-4000"
              className={inputClass}
            />
            <datalist id="quality-model-options">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Shift</span>
            <select value={form.shift} onChange={(e) => setField("shift", e.target.value)} className={inputClass}>
              <option value="">Shift: -</option>
              {["1", "2", "3"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Area</span>
            <select value={form.areaId} onChange={(e) => setField("areaId", e.target.value)} className={inputClass}>
              <option value="">Semua Area</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Jumlah Inspeksi</span>
            <input type="number" min={0} value={form.inspectedQty} onChange={(e) => setField("inspectedQty", e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Lolos (Passed)</span>
            <input type="number" min={0} value={form.passedQty} onChange={(e) => setField("passedQty", e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Gagal (Failed)</span>
            <input type="number" min={0} value={form.failedQty} onChange={(e) => setField("failedQty", e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Jumlah Defect</span>
            <input type="number" min={0} value={form.defectCount} onChange={(e) => setField("defectCount", e.target.value)} className={inputClass} />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className={labelClass}>Catatan</span>
            <input type="text" value={form.note} onChange={(e) => setField("note", e.target.value)} placeholder="Catatan opsional" className={inputClass} />
          </label>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-semibold tracking-tight">Rincian Defect</h3>
            <button type="button" onClick={addDefect} className={actionPrimary}>
              + Tambah Baris
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {form.defects.map((d) => (
              <div key={d.key} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-950/5 p-3 sm:grid-cols-[1fr_2fr_8rem_auto] dark:border-white/5">
                <input
                  type="text"
                  value={d.defectCode}
                  onChange={(e) => updateDefect(d.key, { defectCode: e.target.value })}
                  placeholder="Kode defect"
                  className={inputClass}
                />
                <input
                  type="text"
                  value={d.defectName}
                  onChange={(e) => updateDefect(d.key, { defectName: e.target.value })}
                  placeholder="Nama defect"
                  className={inputClass}
                />
                <input
                  type="number"
                  min={0}
                  value={d.quantity}
                  onChange={(e) => updateDefect(d.key, { quantity: e.target.value })}
                  placeholder="Qty"
                  className={inputClass}
                />
                <button type="button" onClick={() => removeDefect(d.key)} disabled={form.defects.length <= 1} className={actionDanger}>
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-gradient-to-br from-cyan-500 to-blue-800 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Inspeksi"}
          </button>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Simpan via {editingId ? "PATCH" : "POST"} /api/quality/checks</p>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Datagrid Inspeksi</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              {fmtInt(checks.length)} inspeksi - Edit/Hapus/Submit hanya untuk Draft - backend memvalidasi role.
            </p>
          </div>
        </div>

        {checks.length === 0 ? (
          <div className="mt-6 grid place-items-center rounded-xl border border-dashed border-slate-950/15 py-16 text-center dark:border-white/15">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada data inspeksi</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Isi form di atas lalu klik Simpan Inspeksi{loadError ? ` - ${loadError}` : ""}.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 max-h-[30rem] overflow-auto rounded-xl border border-slate-950/5 dark:border-white/5">
            <table className="w-full min-w-[70rem] border-collapse bg-white/50 text-left dark:bg-white/[0.02]">
              <thead>
                <tr>
                  <th className={TH_CLS}>Tanggal</th>
                  <th className={TH_CLS}>Model</th>
                  <th className={TH_CLS}>Shift</th>
                  <th className={`${TH_CLS} text-right`}>Inspeksi</th>
                  <th className={`${TH_CLS} text-right`}>Lolos</th>
                  <th className={`${TH_CLS} text-right`}>Gagal</th>
                  <th className={`${TH_CLS} text-right`}>Defect</th>
                  <th className={TH_CLS}>Status</th>
                  <th className={TH_CLS}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-cyan-500/[0.04]">
                    <td className={`${TD_LEFT} font-medium tabular-nums`}>{c.date}</td>
                    <td className={`${TD_LEFT} font-semibold`}>{c.model}</td>
                    <td className={TD_LEFT}>{c.shift ?? "-"}</td>
                    <td className={TD_RIGHT}>{fmtInt(c.inspectedQty)}</td>
                    <td className={TD_RIGHT}>{fmtInt(c.passedQty)}</td>
                    <td className={TD_RIGHT}>{fmtInt(c.failedQty)}</td>
                    <td className={TD_RIGHT}>{fmtInt(c.defectCount)}</td>
                    <td className={TD_LEFT}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className={TD_LEFT}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.status === RecordStatus.DRAFT && (
                          <>
                            <button type="button" onClick={() => startEdit(c)} className={actionIdle}>
                              Edit
                            </button>
                            <button type="button" onClick={() => remove(c)} className={actionDanger}>
                              Hapus
                            </button>
                            <button type="button" onClick={() => transition(c, RecordStatus.SUBMITTED)} className={actionPrimary}>
                              Submit
                            </button>
                          </>
                        )}
                        {c.status === RecordStatus.SUBMITTED && (
                          <button type="button" onClick={() => transition(c, RecordStatus.APPROVED)} className={actionEmerald}>
                            Approve
                          </button>
                        )}
                        {c.status === RecordStatus.APPROVED && (
                          <button type="button" onClick={() => transition(c, RecordStatus.LOCKED)} className={actionViolet}>
                            Lock
                          </button>
                        )}
                        {c.status !== RecordStatus.DRAFT && c.status !== RecordStatus.SUBMITTED && c.status !== RecordStatus.APPROVED && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Terkunci</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
