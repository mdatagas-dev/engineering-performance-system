// Shape meniru respons GET /api/audit (frontend-first; backend butuh DB —
// lihat app/api/audit/route.ts + lib/audit/query.ts). Entri baru dari login
// mock (lib/mocks/accounts.ts) ditulis ke localStorage (eps_mock_audit).
export type MockAuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "UNLOCKED"
  | "USER_ROLE_CHANGED"
  | "KPI_CREATED"
  | "KPI_UPDATED"
  | "KPI_DELETED"
  | "RECORD_STATUS_CHANGED"
  | "RECORD_CORRECTED"
  | "RECORD_UPDATED"
  | "RECORD_DELETED"
  | "BACKUP_RESTORED"
  | "SECURITY_CONFIG_UPDATED";

export type MockAuditItem = {
  id: string;
  action: MockAuditAction;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string;
  userAgent: string;
  createdAt: string; // ISO
  user: { id: string; name: string; email: string };
};

export const AUDIT_KEY = "eps_mock_audit";

export type MockAuditFilter = {
  action?: MockAuditAction | "";
  userId?: string; // eksak — mirip where.userId backend
  search?: string;
  from?: string; // ISO — createdAt >= from
  to?: string; // ISO — createdAt <= to
  page?: number;
  perPage?: number;
};

export type MockAuditPage = {
  items: MockAuditItem[];
  total: number;
  page: number;
  perPage: number;
};

// IP tiruan + UA asli browser untuk entri yang lahir dari login mock
// (browser tidak bisa membaca IP asli klien).
export function clientMeta(): { ip: string; userAgent: string } {
  return {
    ip: "103.104.5.12",
    userAgent: typeof navigator === "undefined" ? "Mock User Agent" : navigator.userAgent,
  };
}

const UA = {
  chrome:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  firefox: "Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  safari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
};

const user = (id: string, name: string, email: string) => ({ id, name, email });

// Kronologi realistis: login sukses/gagal, gagal beruntun → lock, unlock manual.
export function seedMockAudit(): MockAuditItem[] {
  const now = Date.now();
  const t = (min: number) => new Date(now - min * 60_000).toISOString();
  return [
    {
      id: "aud_seed_101",
      action: "KPI_CREATED",
      entityType: "KPI",
      entityId: "kpi_oee_machining",
      before: null,
      after: {
        key: "kpi_oee_machining",
        name: "OEE Machining Line 1",
        formula: "(good_qty * cycle_time) / available_time",
        unit: "%",
        decimals: 2,
        target: 85,
        higherIsBetter: true,
        warningThreshold: 75,
        criticalThreshold: 65,
        isActive: true,
      },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(1),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_102",
      action: "RECORD_STATUS_CHANGED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-042",
      before: { status: "DRAFT" },
      after: { status: "SUBMITTED", submittedAt: t(3) },
      ip: "103.104.5.12",
      userAgent: UA.firefox,
      createdAt: t(3),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_103",
      action: "RECORD_UPDATED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-042",
      before: { qtyGood: 120, qtyReject: 4 },
      after: { qtyGood: 124, qtyReject: 3 },
      ip: "103.104.5.12",
      userAgent: UA.firefox,
      createdAt: t(6),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_104",
      action: "RECORD_STATUS_CHANGED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-042",
      before: { status: "SUBMITTED" },
      after: { status: "REVIEWED", reviewedAt: t(10) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(10),
      user: user("usr_manager", "Engineering Manager", "manager@eps.local"),
    },
    {
      id: "aud_seed_105",
      action: "RECORD_CORRECTED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-042",
      before: { qtyReject: 3, notes: null },
      after: { qtyReject: 2, notes: "Koreksi hitung reject mesin M-07", correctedAt: t(28) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(28),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_106",
      action: "RECORD_STATUS_CHANGED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-042",
      before: { status: "REVIEWED" },
      after: { status: "APPROVED", approvedAt: t(33) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(33),
      user: user("usr_manager", "Engineering Manager", "manager@eps.local"),
    },
    {
      id: "aud_seed_107",
      action: "USER_ROLE_CHANGED",
      entityType: "USER",
      entityId: "usr_staff_2",
      before: { role: "ENGINEERING_STAFF" },
      after: { role: "ENGINEERING_MANAGER" },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(45),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_108",
      action: "KPI_UPDATED",
      entityType: "KPI",
      entityId: "kpi_oee_machining",
      before: { target: 85, warningThreshold: 75, criticalThreshold: 65 },
      after: { target: 87, warningThreshold: 78, criticalThreshold: 68 },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(60),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_109",
      action: "KPI_CREATED",
      entityType: "KPI",
      entityId: "kpi_scrap_rate",
      before: null,
      after: {
        key: "kpi_scrap_rate",
        name: "Scrap Rate",
        formula: "scrap_qty / total_qty * 100",
        unit: "%",
        decimals: 2,
        target: 2,
        higherIsBetter: false,
        warningThreshold: 3,
        criticalThreshold: 5,
        isActive: true,
      },
      ip: "103.104.5.12",
      userAgent: UA.edge,
      createdAt: t(95),
      user: user("usr_manager", "Engineering Manager", "manager@eps.local"),
    },
    {
      id: "aud_seed_110",
      action: "RECORD_STATUS_CHANGED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-031",
      before: { status: "APPROVED" },
      after: { status: "LOCKED", lockedAt: t(150) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(150),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_111",
      action: "KPI_UPDATED",
      entityType: "KPI",
      entityId: "kpi_scrap_rate",
      before: { target: 2, isActive: true },
      after: { target: 1.5, isActive: true },
      ip: "103.104.5.12",
      userAgent: UA.edge,
      createdAt: t(250),
      user: user("usr_manager", "Engineering Manager", "manager@eps.local"),
    },
    {
      id: "aud_seed_112",
      action: "USER_ROLE_CHANGED",
      entityType: "USER",
      entityId: "usr_manager_2",
      before: { role: "ENGINEERING_MANAGER" },
      after: { role: "ENGINEERING_STAFF" },
      ip: "103.104.5.12",
      userAgent: UA.safari,
      createdAt: t(380),
      user: user("usr_superadmin", "Super Admin", "superadmin@eps.local"),
    },
    {
      id: "aud_seed_113",
      action: "BACKUP_RESTORED",
      entityType: "BACKUP",
      entityId: "backup_run_003",
      before: { filePath: "backups/2026-08-08/full.sql.gz", sizeBytes: 48261120 },
      after: { filePath: "backups/2026-08-08/full.sql.gz", sizeBytes: 48261120, restoredAt: t(600) },
      ip: "103.104.5.12",
      userAgent: UA.safari,
      createdAt: t(600),
      user: user("usr_superadmin", "Super Admin", "superadmin@eps.local"),
    },
    {
      id: "aud_seed_114",
      action: "KPI_UPDATED",
      entityType: "KPI",
      entityId: "kpi_changeover_time",
      before: { decimals: 0, target: 45, isActive: true },
      after: { decimals: 1, target: 40, isActive: true },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(750),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_115",
      action: "RECORD_CORRECTED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-08-015",
      before: { qtyGood: 88, shift: "DAY" },
      after: { qtyGood: 90, shift: "DAY", correctedAt: t(1000) },
      ip: "103.104.5.12",
      userAgent: UA.firefox,
      createdAt: t(1000),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_116",
      action: "KPI_DELETED",
      entityType: "KPI",
      entityId: "kpi_manual_entry_rate",
      before: { key: "kpi_manual_entry_rate", name: "Manual Entry Rate", isActive: true, isDeleted: false },
      after: { isDeleted: true, deletedAt: t(1600) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(1600),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_117",
      action: "RECORD_DELETED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-07-199",
      before: { status: "DRAFT", qtyGood: 0 },
      after: null,
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(2200),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_118",
      action: "BACKUP_RESTORED",
      entityType: "BACKUP",
      entityId: "backup_run_001",
      before: { filePath: "backups/2026-07-30/full.sql.gz", sizeBytes: 41943040 },
      after: { filePath: "backups/2026-07-30/full.sql.gz", sizeBytes: 41943040, restoredAt: t(2400) },
      ip: "103.104.5.12",
      userAgent: UA.safari,
      createdAt: t(2400),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_119",
      action: "RECORD_DELETED",
      entityType: "PRODUCTION_RECORD",
      entityId: "REC-2026-07-188",
      before: { status: "DRAFT", qtyReject: 12 },
      after: null,
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(3000),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_120",
      action: "KPI_DELETED",
      entityType: "KPI",
      entityId: "kpi_legacy_utilization",
      before: { key: "kpi_legacy_utilization", name: "Legacy Utilization", isActive: true, isDeleted: false },
      after: { isDeleted: true, deletedAt: t(3200) },
      ip: "103.104.5.12",
      userAgent: UA.edge,
      createdAt: t(3200),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_001",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_admin",
      before: null,
      after: { lastLoginAt: t(2) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(2),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_002",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_staff",
      before: { failedLoginAttempts: 0 },
      after: { failedLoginAttempts: 1 },
      ip: "114.10.88.201",
      userAgent: UA.firefox,
      createdAt: t(8),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_003",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_viewer",
      before: { failedLoginAttempts: 1 },
      after: { failedLoginAttempts: 2 },
      ip: "45.137.66.9",
      userAgent: UA.edge,
      createdAt: t(15),
      user: user("usr_viewer", "Viewer", "viewer@eps.local"),
    },
    {
      id: "aud_seed_004",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_viewer",
      before: { failedLoginAttempts: 2 },
      after: { failedLoginAttempts: 3 },
      ip: "45.137.66.9",
      userAgent: UA.edge,
      createdAt: t(18),
      user: user("usr_viewer", "Viewer", "viewer@eps.local"),
    },
    {
      id: "aud_seed_005",
      action: "ACCOUNT_LOCKED",
      entityType: "USER",
      entityId: "usr_viewer",
      before: { failedLoginAttempts: 3, lockedUntil: null },
      after: { failedLoginAttempts: 0, lockoutCount: 1, lockedUntil: t(-27) },
      ip: "45.137.66.9",
      userAgent: UA.edge,
      createdAt: t(20),
      user: user("usr_viewer", "Viewer", "viewer@eps.local"),
    },
    {
      id: "aud_seed_006",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_viewer",
      before: { failedLoginAttempts: 0 },
      after: { failedLoginAttempts: 1 },
      ip: "45.137.66.9",
      userAgent: UA.edge,
      createdAt: t(22),
      user: user("usr_viewer", "Viewer", "viewer@eps.local"),
    },
    {
      id: "aud_seed_007",
      action: "UNLOCKED",
      entityType: "USER",
      entityId: "usr_viewer",
      before: { lockedUntil: t(-25), lockoutCount: 1 },
      after: { lockedUntil: null },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(35),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_008",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_manager",
      before: null,
      after: { lastLoginAt: t(40) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(40),
      user: user("usr_manager", "Engineering Manager", "manager@eps.local"),
    },
    {
      id: "aud_seed_009",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_superadmin",
      before: { failedLoginAttempts: 0 },
      after: { failedLoginAttempts: 1 },
      ip: "103.104.5.12",
      userAgent: UA.safari,
      createdAt: t(75),
      user: user("usr_superadmin", "Super Admin", "superadmin@eps.local"),
    },
    {
      id: "aud_seed_010",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_superadmin",
      before: null,
      after: { lastLoginAt: t(90) },
      ip: "103.104.5.12",
      userAgent: UA.safari,
      createdAt: t(90),
      user: user("usr_superadmin", "Super Admin", "superadmin@eps.local"),
    },
    {
      id: "aud_seed_011",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_staff",
      before: { failedLoginAttempts: 1 },
      after: { failedLoginAttempts: 2 },
      ip: "103.104.5.12",
      userAgent: UA.firefox,
      createdAt: t(120),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_012",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_staff",
      before: null,
      after: { lastLoginAt: t(240) },
      ip: "103.104.5.12",
      userAgent: UA.firefox,
      createdAt: t(240),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_013",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_admin",
      before: null,
      after: { lastLoginAt: t(420) },
      ip: "103.104.5.12",
      userAgent: UA.chrome,
      createdAt: t(420),
      user: user("usr_admin", "Admin", "admin@eps.local"),
    },
    {
      id: "aud_seed_014",
      action: "LOGIN_FAILED",
      entityType: "USER",
      entityId: "usr_staff",
      before: { failedLoginAttempts: 0 },
      after: { failedLoginAttempts: 1 },
      ip: "114.10.88.201",
      userAgent: UA.firefox,
      createdAt: t(1080),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
    {
      id: "aud_seed_015",
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: "usr_viewer",
      before: null,
      after: { lastLoginAt: t(1440) },
      ip: "114.10.88.201",
      userAgent: UA.firefox,
      createdAt: t(1440),
      user: user("usr_viewer", "Viewer", "viewer@eps.local"),
    },
    {
      id: "aud_seed_016",
      action: "ACCOUNT_LOCKED",
      entityType: "USER",
      entityId: "usr_staff",
      before: { failedLoginAttempts: 5, lockedUntil: null },
      after: { failedLoginAttempts: 0, lockoutCount: 2, lockedUntil: t(-1300) },
      ip: "45.137.66.9",
      userAgent: UA.edge,
      createdAt: t(2900),
      user: user("usr_staff", "Engineering Staff", "staff@eps.local"),
    },
  ];
}

export function loadMockAudit(): MockAuditItem[] {
  if (typeof window === "undefined") return seedMockAudit();
  const raw = window.localStorage.getItem(AUDIT_KEY);
  if (!raw) return seedMockAudit();
  try {
    const parsed = JSON.parse(raw) as MockAuditItem[];
    return Array.isArray(parsed) ? parsed : seedMockAudit();
  } catch {
    return seedMockAudit();
  }
}

export function saveMockAudit(list: MockAuditItem[]): void {
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify(list));
}

export function appendMockAudit(entry: Omit<MockAuditItem, "id" | "createdAt">): MockAuditItem {
  const item: MockAuditItem = { ...entry, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const next = [item, ...loadMockAudit()];
  if (typeof window !== "undefined") saveMockAudit(next);
  return item;
}

// Filter + pagination murni, meniru lib/audit/query.ts (search lintas
// action/user/ip; dari/sampai pada createdAt; page 1-based, default 20).
export function filterAudit(items: MockAuditItem[], params: MockAuditFilter = {}): MockAuditPage {
  const perPage = Math.min(100, Math.max(1, Number(params.perPage ?? 20) || 20));
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const search = params.search?.trim().toLowerCase() ?? "";
  const from = params.from ? new Date(params.from) : null;
  const to = params.to ? new Date(params.to) : null;

  const filtered = items
    .filter((it) => {
      if (params.action && it.action !== params.action) return false;
      if (params.userId && it.user.id !== params.userId) return false;
      if (search) {
        const hay = `${it.action} ${it.entityType} ${it.entityId} ${it.ip} ${it.user.name} ${it.user.email}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      const t = new Date(it.createdAt).getTime();
      if (from && !Number.isNaN(from.getTime()) && t < from.getTime()) return false;
      if (to && !Number.isNaN(to.getTime()) && t > to.getTime()) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const start = (page - 1) * perPage;
  return { items: filtered.slice(start, start + perPage), total: filtered.length, page, perPage };
}
