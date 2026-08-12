// Mock konfigurasi KPI (halaman /kpi, "Pengaturan KPI") — frontend-first.
// Shape meniru prisma KpiConfig. CRUD ringan + persist localStorage
// (eps_mock_kpi) + audit KPI_CREATED/KPI_UPDATED/KPI_DELETED.

import { appendMockAudit, clientMeta } from "@/lib/mocks/audit";

export type MockKpiConfig = {
  id: string;
  key: string;
  name: string;
  formula: string;
  unit: string;
  decimals: number;
  target: number;
  higherIsBetter: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  definition: string | null;
  sourceData: string | null;
  isActive: boolean;
  isDeleted: boolean;
};

export const KPI_STORAGE_KEY = "eps_mock_kpi";

export function seedMockKpi(): MockKpiConfig[] {
  return [
    {
      id: "kpi_uph",
      key: "uph",
      name: "UPH (Unit per Hour)",
      formula: "UPH Result / Working Hour",
      unit: "unit/jam",
      decimals: 2,
      target: 90,
      higherIsBetter: true,
      warningThreshold: 85,
      criticalThreshold: 80,
      definition: "Produktivitas unit per jam kerja.",
      sourceData: "Daily Production Record",
      isActive: true,
      isDeleted: false,
    },
    {
      id: "kpi_gap_op",
      key: "gap_op",
      name: "GAP Output",
      formula: "Output Prod - Plan",
      unit: "unit",
      decimals: 2,
      target: 0,
      higherIsBetter: true,
      warningThreshold: -40,
      criticalThreshold: -100,
      definition: "Selisih output terhadap plan harian.",
      sourceData: "Daily Production Record",
      isActive: true,
      isDeleted: false,
    },
    {
      id: "kpi_upph",
      key: "upph",
      name: "UPPH (Unit per Person per Hour)",
      formula: "UPH Result / HC Actual",
      unit: "unit/orang/jam",
      decimals: 2,
      target: 2.8,
      higherIsBetter: true,
      warningThreshold: 2.5,
      criticalThreshold: 2.2,
      definition: "Efisiensi tenaga kerja per jam.",
      sourceData: "Daily Production Record",
      isActive: true,
      isDeleted: false,
    },
  ];
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadMockKpi(storage: StorageLike | null | undefined): MockKpiConfig[] {
  if (!storage) return seedMockKpi();
  try {
    const raw = storage.getItem(KPI_STORAGE_KEY);
    if (!raw) return seedMockKpi();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockKpiConfig[]) : seedMockKpi();
  } catch {
    return seedMockKpi();
  }
}

export function saveMockKpi(storage: StorageLike, items: MockKpiConfig[]): void {
  storage.setItem(KPI_STORAGE_KEY, JSON.stringify(items));
}

// Validasi payload KPI (mock mirror backend lib/kpi/validation.ts):
// key unik + alnum/-/_, name wajib, target number, thresholds wajib < target
// (higherIsBetter) dengan warning > critical. Return pesan error atau null.
export function validateKpiInput(
  input: Partial<MockKpiConfig>,
  existing: MockKpiConfig[]
): string | null {
  const key = input.key?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9_-]+$/.test(key)) return "Key hanya boleh huruf kecil, angka, '-' atau '_'.";
  if (existing.some((k) => k.key === key && k.id !== input.id)) return "Key sudah dipakai.";
  if (!input.name?.trim()) return "Nama wajib diisi.";
  if (typeof input.target !== "number" || !Number.isFinite(input.target)) return "Target harus angka.";
  const higher = input.higherIsBetter !== false;
  if (higher) {
    if (input.warningThreshold != null && input.warningThreshold >= input.target)
      return "Warning threshold harus di bawah target (higher is better).";
    if (input.criticalThreshold != null && input.criticalThreshold >= input.target)
      return "Critical threshold harus di bawah target.";
    if (
      input.warningThreshold != null &&
      input.criticalThreshold != null &&
      input.criticalThreshold >= input.warningThreshold
    )
      return "Critical threshold harus di bawah warning threshold.";
  }
  return null;
}

export function auditKpi(action: "KPI_CREATED" | "KPI_UPDATED" | "KPI_DELETED", before: unknown, after: unknown) {
  appendMockAudit({
    action,
    entityType: "KPI",
    entityId: (after as MockKpiConfig | null)?.id ?? (before as MockKpiConfig | null)?.id ?? "kpi",
    before: before as Record<string, unknown> | null,
    after: after as Record<string, unknown> | null,
    ip: clientMeta().ip,
    userAgent: clientMeta().userAgent,
    user: { id: "mock-user", name: "Mock User", email: "mock-user@eps.local" },
  });
}
