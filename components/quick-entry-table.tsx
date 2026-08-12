"use client";

import { useMemo, useState } from "react";
import { calculateCalculated } from "@/lib/records/calculate";
import {
  BULK_MAX,
  bulkDefaultValues,
  generateBulkRows,
  validateBulkInput,
} from "@/lib/records/bulk";
import {
  buildRecordFromRow,
  parseNumeric,
  recordToDraftValues,
  validateRow,
  type DraftRowValues,
  type NumericField,
} from "@/lib/records/form";
import { buildMockRecordTotal, type MockProductionRecord } from "@/lib/mocks/records";

// Tabel input cepat multi-baris (TASK buat-tabel-input-cepat-multi-baris &
// tambahkan-fitur-tambah-baris-massal): grid editable inline, banyak baris
// sekaligus, kolom calculated (GAP×3, UPPH) live & read-only (reuse
// calculateCalculated). Setiap perubahan langsung di-commit ke store TASK 4
// (satu sumber kebenaran) via onUpdate — baris quick-entry adalah record DRAFT
// di store, jadi tabel total & KPI ikut refresh otomatis.
//
// Keputusan UI:
//  - Baris baru diberi id prefix "qe_" supaya mudah dipisahkan dari record
//    form/seed di halaman.
//  - Typing numeral bebas (draft lokal); store hanya menerima angka ≥ 0 —
//    nilai invalid/negatif ditolak sanitizeNumeric store, validasi akhir ada
//    di "Simpan Semua" (validateRow — jalur SAMA dengan form per-baris).
//  - Bulk (TASK 6): dialog inline count 1-50 + date/shift/model/area default +
//    "Terapkan dari baris 1" per kolom (copy value baris pertama ke baris lain,
//    mis. target UPH sama utk semua model hari itu).

const NUMERIC_FIELDS: { field: NumericField; label: string }[] = [
  { field: "uphTarget", label: "UPH Tgt" },
  { field: "uphResult", label: "UPH Res" },
  { field: "hcStandard", label: "HC Std" },
  { field: "hcActual", label: "HC Act" },
  { field: "plan", label: "Plan" },
  { field: "outputProd", label: "Output" },
  { field: "totalSetup", label: "Setup" },
  { field: "workingHour", label: "WH" },
  { field: "totalSetupPacking", label: "Setup Pack" },
  { field: "workingHourPacking", label: "WH Pack" },
];

const SHIFT_OPTIONS = ["1", "2", "3"];

export type QuickEntryTableProps = {
  /** Baris milik quick-entry (dari store, id prefix "qe_"). */
  rows: MockProductionRecord[];
  /** Semua record terlihat (saved + seed) — konteks duplikat/total. */
  allRecords: MockProductionRecord[];
  userName?: string;
  onAdd: (record: MockProductionRecord) => void;
  onUpdate: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onAddBulk: (records: MockProductionRecord[]) => void;
  /** "Simpan Semua" → persist ulang store. */
  onPersist: () => void;
};

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const numFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const fmt = (v: number): string => numFmt.format(v);
const fmtNull = (v: number | null): string => (v === null ? "—" : fmt(v));

const inputCls =
  "w-full min-w-16 rounded-md border border-slate-950/10 bg-white/70 px-2 py-1.5 text-right text-xs tabular-nums text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100";
const textInputCls = inputCls.replace("text-right", "text-left");
const thCls =
  "sticky top-0 z-10 whitespace-nowrap border-b border-slate-950/10 bg-slate-100/90 px-2 py-2 text-left text-[9px] font-semibold tracking-wider text-slate-600 uppercase backdrop-blur-sm dark:border-white/10 dark:bg-[#111a24]/95 dark:text-slate-400";
const tdCls = "whitespace-nowrap border-b border-slate-950/5 px-2 py-1.5 dark:border-white/5";

function gapClass(v: number, lowerIsGood = false): string {
  if (v === 0) return "text-slate-400 dark:text-slate-500";
  const good = lowerIsGood ? v < 0 : v > 0;
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function CalcCell({ value, gap, lowerIsGood }: { value: number | null; gap?: boolean; lowerIsGood?: boolean }) {
  if (value === null) return <span className="text-slate-400 dark:text-slate-500">—</span>;
  return (
    <span className={`font-semibold tabular-nums ${gap ? gapClass(value, lowerIsGood) : "text-slate-700 dark:text-slate-300"}`}>
      {fmt(value)}
    </span>
  );
}

export default function QuickEntryTable({
  rows,
  allRecords,
  userName,
  onAdd,
  onUpdate,
  onRemove,
  onAddBulk,
  onPersist,
}: QuickEntryTableProps) {
  // Draft teks mentah per sel (kunci `${id}:${field}`) — input tidak pernah
  // "menyentak" saat store menolak nilai invalid (negatif/non-angka).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({ count: "5", date: todayISO(), shift: "1", model: "", areaName: "" });
  const [bulkError, setBulkError] = useState<string | null>(null);

  const total = useMemo(() => buildMockRecordTotal(rows), [rows]);

  function draftOf(id: string, field: string): string | undefined {
    return drafts[`${id}:${field}`];
  }

  function setDraft(id: string, field: string, value: string) {
    setDrafts((d) => ({ ...d, [`${id}:${field}`]: value }));
  }

  function commit(id: string, field: string, patch: Record<string, unknown>) {
    if (Object.keys(patch).length > 0) onUpdate(id, patch);
  }

  // Nilai numerik untuk preview kalkulasi: draft bila bisa di-parse (negatif
  // boleh demi typing bebas), fallback nilai tersimpan.
  function calcFor(r: MockProductionRecord) {
    const nums = {} as Record<string, number>;
    for (const { field } of NUMERIC_FIELDS) {
      const raw = draftOf(r.id, field);
      nums[field] = raw !== undefined ? (parseNumeric(raw) ?? r[field]) : r[field];
    }
    return calculateCalculated({
      uphTarget: nums.uphTarget,
      uphResult: nums.uphResult,
      hcStandard: nums.hcStandard,
      hcActual: nums.hcActual,
      plan: nums.plan,
      outputProd: nums.outputProd,
    });
  }

  // Nilai mapres utk validasi Simpan Semua — gabungan record + draft (jalur
  // validateRow SAMA dengan form per-baris → konsistensi simpan vs preview).
  function draftValuesOf(r: MockProductionRecord): DraftRowValues {
    const base = recordToDraftValues(r);
    const out = { ...base };
    for (const { field } of NUMERIC_FIELDS) {
      const d = draftOf(r.id, field);
      if (d !== undefined) out[field] = d;
    }
    return out;
  }

  function addEmptyRow() {
    onAdd(
      buildRecordFromRow({
        id: `qe_${crypto.randomUUID()}`,
        date: todayISO(),
        model: "",
        shift: "1",
        area: null,
        values: bulkDefaultValues(),
        createdByName: userName ?? "Engineering Staff",
      })
    );
    setMessage(null);
  }

  function handleSaveAll() {
    setAttempted(true);
    setMessage(null);
    const invalid = rows
      .map((r) => ({ r, errors: validateRow({ date: r.date, model: r.model, values: draftValuesOf(r) }) }))
      .filter((x) => Object.keys(x.errors).length > 0);
    if (invalid.length > 0) {
      setMessage({
        kind: "err",
        text: `Tidak tersimpan — ${invalid.length} baris belum valid (periksa sel yang ditandai / draf belum valid).`,
      });
      return;
    }
    onPersist();
    setAttempted(false);
    setDrafts({});
    setMessage({ kind: "ok", text: `${rows.length} baris valid — tersimpan ke eps_mock_records.` });
  }

  // "Terapkan dari baris 1": copy nilai baris pertama (draft bila ada) ke semua
  // baris lain utk kolom itu — mis. target UPH sama utk semua model hari itu.
  function applyColumn(field: NumericField | "date" | "model" | "shift") {
    if (rows.length < 2) return;
    const first = rows[0];
    const value = field === "date" ? first.date : field === "model" ? first.model : field === "shift" ? (first.shift ?? "") : draftOf(first.id, field) ?? first[field];
    for (const r of rows.slice(1)) {
      const patch = { [field]: typeof value === "number" ? String(value) : value };
      onUpdate(r.id, patch);
      setDraft(r.id, field as string, typeof value === "number" ? String(value) : (value as string));
    }
    setMessage(null);
  }

  function applyBulk() {
    const model = bulk.model.trim();
    const err = validateBulkInput({
      count: Number(bulk.count),
      date: bulk.date,
      model,
      shift: bulk.shift,
      areaName: bulk.areaName,
      makeId: (i) => `qe_${i}_${crypto.randomUUID()}`,
    });
    if (err) {
      setBulkError(err);
      return;
    }
    onAddBulk(
      generateBulkRows({
        count: Number(bulk.count),
        date: bulk.date,
        model,
        shift: bulk.shift,
        areaName: bulk.areaName,
        makeId: (i) => `qe_${i}_${crypto.randomUUID()}`,
        createdByName: userName ?? "Engineering Staff",
      })
    );
    setBulkOpen(false);
    setBulkError(null);
    setMessage({ kind: "ok", text: `${bulk.count} baris ditambahkan ke grid (DRAFT, tersimpan ke mock).` });
  }

  const lastRow = rows[rows.length - 1]?.id;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Input Cepat Multi-Baris</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Edit inline langsung ke store · Enter di baris terakhir menambah baris · GAP/UPPH live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setBulkOpen((v) => !v);
              setBulkError(null);
            }}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Tambah Banyak Baris
          </button>
          <button
            type="button"
            onClick={addEmptyRow}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
          >
            + Baris
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
          >
            Simpan Semua
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Dialog "Tambah Banyak Baris" (TASK 6): count 1-50 + default date/shift/model/area. */}
      {bulkOpen && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Jumlah ({BULK_MAX} maks)</span>
              <input
                type="number"
                min={1}
                max={BULK_MAX}
                value={bulk.count}
                onChange={(e) => setBulk((b) => ({ ...b, count: e.target.value }))}
                className={`${textInputCls} w-20`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Tanggal</span>
              <input type="date" value={bulk.date} onChange={(e) => setBulk((b) => ({ ...b, date: e.target.value }))} className={`${textInputCls} w-36`} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Shift</span>
              <select value={bulk.shift} onChange={(e) => setBulk((b) => ({ ...b, shift: e.target.value }))} className={textInputCls}>
                <option value="">—</option>
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Model</span>
              <input
                type="text"
                list="eps-mock-models"
                value={bulk.model}
                onChange={(e) => setBulk((b) => ({ ...b, model: e.target.value }))}
                placeholder="ex. LV-3000"
                className={`${textInputCls} w-36`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Area (opsional)</span>
              <input
                type="text"
                value={bulk.areaName}
                onChange={(e) => setBulk((b) => ({ ...b, areaName: e.target.value }))}
                placeholder="ex. L1"
                className={`${textInputCls} w-24`}
              />
            </label>
            <button
              type="button"
              onClick={applyBulk}
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
            >
              Tambah Baris
            </button>
          </div>
          {bulkError && <p className="mt-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">{bulkError}</p>}
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Baris baru diisi nilai default (0 / WH 8) — kolom boleh diedit setelahnya; nilai yang sama bisa diterapkan via
            tombol &ldquo;dari baris 1&rdquo; di header kolom.
          </p>
        </div>
      )}

      <datalist id="eps-mock-models">
        {[...new Set(allRecords.map((r) => r.model))].sort().map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-950/5 dark:border-white/5">
        <table className="w-full min-w-[1280px] border-collapse bg-white/50 text-left dark:bg-white/[0.02]">
          <thead>
            <tr>
              <th className={thCls} title="Terapkan dari baris 1">Date</th>
              <th className={thCls} title="Terapkan dari baris 1">Model</th>
              <th className={thCls}>Shift</th>
              {NUMERIC_FIELDS.slice(0, 6).map(({ field, label }) => (
                <th key={field} className={`${thCls} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => applyColumn(field)}
                      title="Terapkan nilai baris 1 ke semua baris"
                      className="rounded border border-slate-950/10 px-1 text-[8px] text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-cyan-700 dark:border-white/10 dark:text-slate-400 dark:hover:text-cyan-400"
                    >
                      dari 1
                    </button>
                  </span>
                </th>
              ))}
              {["GAP UPH", "GAP HC", "GAP OP", "UPPH"].map((l) => (
                <th key={l} className={`${thCls} text-right`}>{l}</th>
              ))}
              {NUMERIC_FIELDS.slice(6).map(({ field, label }) => (
                <th key={field} className={`${thCls} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => applyColumn(field)}
                      title="Terapkan nilai baris 1 ke semua baris"
                      className="rounded border border-slate-950/10 px-1 text-[8px] text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-cyan-700 dark:border-white/10 dark:text-slate-400 dark:hover:text-cyan-400"
                    >
                      dari 1
                    </button>
                  </span>
                </th>
              ))}
              <th className={thCls} aria-label="Hapus baris" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const calc = calcFor(r);
              const errors = attempted ? validateRow({ date: r.date, model: r.model, values: draftValuesOf(r) }) : null;
              const rowBad = errors !== null && Object.keys(errors).length > 0;
              const isLast = r.id === lastRow;
              const rowCls = rowBad
                ? "bg-rose-500/[0.04]"
                : i % 2 === 1
                  ? "bg-slate-950/[0.015] dark:bg-white/[0.015]"
                  : "";
              return (
                <tr key={r.id} className={rowCls}>
                  <td className={tdCls}>
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => commit(r.id, "date", { date: e.target.value })}
                      aria-invalid={errors?.date ? true : undefined}
                      className={`${textInputCls} w-32`}
                    />
                    {rowBad && <p className="mt-0.5 text-[9px] text-rose-600 dark:text-rose-400">{errors!.date ?? errors!.model}</p>}
                  </td>
                  <td className={tdCls}>
                    <input
                      type="text"
                      list="eps-mock-models"
                      value={r.model}
                      onChange={(e) => commit(r.id, "model", { model: e.target.value })}
                      placeholder="Model"
                      className={`${textInputCls} w-24`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isLast) {
                          e.preventDefault();
                          addEmptyRow();
                        }
                      }}
                    />
                  </td>
                  <td className={tdCls}>
                    <select value={r.shift ?? ""} onChange={(e) => commit(r.id, "shift", { shift: e.target.value })} className={`${textInputCls} w-14`}>
                      <option value="">—</option>
                      {SHIFT_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  {NUMERIC_FIELDS.slice(0, 6).map(({ field }) => (
                    <td key={field} className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={draftOf(r.id, field) ?? r[field]}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft(r.id, field, v);
                          commit(r.id, field, { [field]: v });
                        }}
                        aria-invalid={errors?.[field] ? true : undefined}
                        className={inputCls}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && isLast) {
                            e.preventDefault();
                            addEmptyRow();
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className={`${tdCls} text-right`}><CalcCell value={calc.gapUph} gap /></td>
                  <td className={`${tdCls} text-right`}><CalcCell value={calc.gapHc} gap lowerIsGood /></td>
                  <td className={`${tdCls} text-right`}><CalcCell value={calc.gapOp} gap /></td>
                  <td className={`${tdCls} text-right`}><CalcCell value={calc.upph} /></td>
                  {NUMERIC_FIELDS.slice(6).map(({ field }) => (
                    <td key={field} className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={draftOf(r.id, field) ?? r[field]}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft(r.id, field, v);
                          commit(r.id, field, { [field]: v });
                        }}
                        aria-invalid={errors?.[field] ? true : undefined}
                        className={inputCls}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && isLast) {
                            e.preventDefault();
                            addEmptyRow();
                          }
                        }}
                      />
                    </td>
                  ))}
                  <td className={tdCls}>
                    <button
                      type="button"
                      onClick={() => onRemove(r.id)}
                      aria-label={`Hapus baris ${r.model || i + 1}`}
                      title="Hapus baris"
                      className="rounded-md border border-rose-500/30 px-2 py-1 text-[10px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={18} className="px-3 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  Belum ada baris — klik &ldquo;+ Baris&rdquo; atau &ldquo;Tambah Banyak Baris&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
          {/* Preview total — sticky bottom, GAP & UPPH dihitung DARI total. */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="sticky bottom-0 z-10 bg-cyan-500/10 text-slate-800 dark:bg-cyan-500/[0.08] dark:text-cyan-100">
                <td className="px-2 py-2 text-[9px] font-bold tracking-wider whitespace-nowrap uppercase">Total · {total.count}</td>
                <td className="px-2 py-2 text-[9px] font-bold tracking-wider whitespace-nowrap uppercase" colSpan={2}>—</td>
                {NUMERIC_FIELDS.slice(0, 6).map(({ field }) => (
                  <td key={field} className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums">{fmt(total[field])}</td>
                ))}
                <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums"><CalcCell value={total.gapUph} gap /></td>
                <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums"><CalcCell value={total.gapHc} gap lowerIsGood /></td>
                <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums"><CalcCell value={total.gapOp} gap /></td>
                <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums">{fmtNull(total.upph)}</td>
                {NUMERIC_FIELDS.slice(6).map(({ field }) => (
                  <td key={field} className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap tabular-nums">{fmt(total[field])}</td>
                ))}
                <td className="px-2 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}