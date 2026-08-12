// Diff snapshot dua versi ProductionRecordVersion ("Riwayat Versi Data").
// Snapshot = state data lengkap (raw + calculated + status + version), jadi
// diff cukup membandingkan field per field: hanya yang nilainya berbeda yang
// dimasukkan ke changes. Urutan mengikuti urutan key snapshot a (lalu b untuk
// key tambahan) sehingga deterministik untuk produsen snapshot yang sama.
// null dan key yang tidak ada dianggap sama (serialisasi JSON).

export type Snapshot = Record<string, unknown>;
export type DiffChange = { field: string; before: unknown; after: unknown };

export function diffSnapshots(a: Snapshot | null, b: Snapshot | null): DiffChange[] {
  const left = a ?? {};
  const right = b ?? {};
  const changes: DiffChange[] = [];
  const fields = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const field of fields) {
    const before = field in left ? left[field] ?? null : null;
    const after = field in right ? right[field] ?? null : null;
    if (before !== after) {
      changes.push({ field, before, after });
    }
  }
  return changes;
}
