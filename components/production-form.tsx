"use client";

import { useMemo, useState } from "react";
import {
  buildRecordFromRow,
  calcPreview,
  duplicateRowKeys,
  validateRow,
  type DraftRowValues,
  type NumericField,
} from "@/lib/records/form";
import {
  loadSavedRecords,
  mockModelOptions,
  saveSavedRecords,
  type MockProductionRecord,
} from "@/lib/mocks/records";

const NUMERIC_FIELDS: { field: NumericField; label: string; hint?: string }[] = [
  { field: "uphTarget", label: "UPH Target" },
  { field: "uphResult", label: "UPH Result" },
  { field: "hcStandard", label: "HC Standard" },
  { field: "hcActual", label: "HC Actual" },
  { field: "plan", label: "Plan" },
  { field: "outputProd", label: "Output Prod" },
  { field: "totalSetup", label: "Total Setup", hint: "menit" },
  { field: "workingHour", label: "Working Hour", hint: "jam" },
  { field: "totalSetupPacking", label: "Total Setup Packing", hint: "menit" },
  { field: "workingHourPacking", label: "Working Hour Packing", hint: "jam" },
];

// Nilai shift mengikuti data mock (record memakai "1"/"2"); "3" untuk shift ketiga.
const SHIFT_OPTIONS = ["1", "2", "3"];

type Row = {
  key: string;
  date: string;
  model: string;
  shift: string;
  area: string;
  values: DraftRowValues;
};

function emptyValues(): DraftRowValues {
  return {
    uphTarget: "",
    uphResult: "",
    hcStandard: "",
    hcActual: "",
    plan: "",
    outputProd: "",
    totalSetup: "",
    workingHour: "",
    totalSetupPacking: "",
    workingHourPacking: "",
  };
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function emptyRow(): Row {
  return { key: crypto.randomUUID(), date: todayISO(), model: "", shift: "", area: "", values: emptyValues() };
}

const numFmt = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt2 = (v: number): string => numFmt.format(v);

const inputClass =
  "w-full rounded-lg border border-slate-950/15 bg-white/70 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder-slate-500";

const labelClass =
  "text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400";

function gapClass(v: number, lowerIsGood = false): string {
  if (v === 0) return "text-slate-400 dark:text-slate-500";
  const good = lowerIsGood ? v < 0 : v > 0;
  return good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function PreviewCell({
  label,
  value,
  gap,
  lowerIsGood,
}: {
  label: string;
  value: number | null | undefined;
  gap?: boolean;
  lowerIsGood?: boolean;
}) {
  const empty = value === undefined || value === null;
  const cls = empty
    ? "text-slate-400 dark:text-slate-500"
    : gap
      ? gapClass(value, lowerIsGood)
      : "text-slate-700 dark:text-slate-300";
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${cls}`}>{empty ? "—" : fmt2(value)}</span>
    </span>
  );
}

export type ProductionFormProps = {
  existingRecords: MockProductionRecord[];
  userName?: string;
  onSaved: (saved: MockProductionRecord[]) => void;
};

// Form isian harian multi-baris: tiap baris = 12 raw input (date, model, shift,
// area opsional, 10 numerik) + preview kalkulasi instan (GAP UPH/HC/OP, UPPH).
// Simpan = mock ke localStorage (eps_mock_records) lalu emit onSaved supaya
// tabel halaman ikut refresh. Backend CRUD menggantikan di fase nanti.
export default function ProductionForm({ existingRecords, userName, onSaved }: ProductionFormProps) {
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const dupKeys = useMemo(
    () =>
      duplicateRowKeys(
        rows,
        existingRecords.map((r) => ({ date: r.date, model: r.model, shift: r.shift }))
      ),
    [rows, existingRecords]
  );

  function updateField(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function updateValue(key: string, field: NumericField, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, values: { ...r.values, [field]: value } } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
    setMessage(null);
  }

  function removeRow(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  function handleSave() {
    setAttempted(true);
    setMessage(null);
    const invalid = rows.filter((r) => Object.keys(validateRow(r)).length > 0);
    if (invalid.length > 0) {
      setMessage({ kind: "err", text: `Tidak tersimpan — ${invalid.length} baris belum lengkap/valid.` });
      return;
    }
    const current = loadSavedRecords(window.localStorage);
    const created = rows.map((r) =>
      buildRecordFromRow({
        id: crypto.randomUUID(),
        date: r.date,
        model: r.model,
        shift: r.shift.trim() === "" ? null : r.shift.trim(),
        area:
          r.area.trim() === ""
            ? null
            : { id: `area_form_${crypto.randomUUID()}`, name: r.area.trim(), lineCode: null },
        values: r.values,
        createdByName: userName ?? "Engineering Staff",
      })
    );
    const next = [...created, ...current];
    saveSavedRecords(window.localStorage, next);
    onSaved(next);
    setRows([emptyRow()]);
    setAttempted(false);
    setMessage({ kind: "ok", text: `${created.length} record disimpan (mock) ke ${"eps_mock_records"}.` });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Form Isian Harian</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Multi-baris · preview GAP/UPPH live saat ketik · simpan mock ke localStorage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-slate-950/15 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-950/5 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Tambah Baris
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-90"
          >
            Simpan
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

      <datalist id="eps-mock-models">
        {mockModelOptions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {rows.map((row, i) => {
        const errors = validateRow(row);
        const preview = calcPreview(row.values);
        const dup = dupKeys.has(row.key);
        return (
          <div
            key={row.key}
            className={`rounded-xl border p-4 transition-colors ${
              dup ? "border-amber-500/40 bg-amber-500/[0.03]" : "border-slate-950/10 bg-white/40 dark:border-white/10 dark:bg-white/[0.02]"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-slate-950/10 bg-slate-950/[0.03] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Baris {i + 1}
                </span>
                {dup && (
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    Duplikat date+model+shift
                  </span>
                )}
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Hapus baris ${i + 1}`}
                  className="rounded-md border border-rose-500/30 px-2 py-1 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                >
                  Hapus Baris
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Date</span>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => updateField(row.key, { date: e.target.value })}
                  aria-invalid={attempted && errors.date ? true : undefined}
                  className={inputClass}
                />
                {attempted && errors.date && <p className="text-[11px] text-rose-600 dark:text-rose-400">{errors.date}</p>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Model</span>
                <input
                  type="text"
                  list="eps-mock-models"
                  value={row.model}
                  onChange={(e) => updateField(row.key, { model: e.target.value })}
                  placeholder="ex. LV-3000"
                  aria-invalid={attempted && errors.model ? true : undefined}
                  className={inputClass}
                />
                {attempted && errors.model && <p className="text-[11px] text-rose-600 dark:text-rose-400">{errors.model}</p>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Shift</span>
                <select
                  value={row.shift}
                  onChange={(e) => updateField(row.key, { shift: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Shift: —</option>
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Area / Line</span>
                <input
                  type="text"
                  value={row.area}
                  onChange={(e) => updateField(row.key, { area: e.target.value })}
                  placeholder="opsional, ex. L1"
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {NUMERIC_FIELDS.map(({ field, label, hint }) => {
                const err = attempted ? errors[field] : undefined;
                return (
                  <label key={field} className="flex flex-col gap-1.5">
                    <span className={labelClass}>
                      {label}
                      {hint ? ` (${hint})` : ""}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={row.values[field]}
                      onChange={(e) => updateValue(row.key, field, e.target.value)}
                      placeholder="0"
                      aria-invalid={err ? true : undefined}
                      className={inputClass}
                    />
                    {err && <p className="text-[11px] text-rose-600 dark:text-rose-400">{err}</p>}
                  </label>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-dashed border-slate-950/10 bg-slate-950/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                Preview kalkulasi
              </span>
              <PreviewCell label="GAP UPH" value={preview?.gapUph} gap />
              <PreviewCell label="GAP HC" value={preview?.gapHc} gap lowerIsGood />
              <PreviewCell label="GAP OP" value={preview?.gapOp} gap />
              <PreviewCell label="UPPH" value={preview?.upph} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
