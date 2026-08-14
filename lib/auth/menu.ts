import { RoleName } from "@/app/generated/prisma/enums";

export type MenuItem = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  children?: MenuItem[];
};

interface MenuNode extends MenuItem {
  permission?: string;
  children?: MenuNode[];
}

const MENU_TREE: MenuNode[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", permission: "dashboard.view" },
  { key: "trends", label: "Analisis Tren", href: "/analisis-tren", icon: "trend", permission: "dashboard.view" },
  {
    key: "quality",
    label: "Quality",
    icon: "trend",
    children: [
      { key: "quality.dashboard", label: "Quality Dashboard", href: "/quality", permission: "quality.view" },
      { key: "quality.inspection", label: "Inspection Data", href: "/quality/inspection", permission: "quality.record" },
      { key: "quality.defects", label: "Defect Records", href: "/quality/defects", permission: "quality.view" },
      { key: "quality.analysis", label: "Defect Analysis", href: "/quality/analysis", permission: "quality.view" },
      { key: "quality.trend", label: "Quality Trend", href: "/quality/trend", permission: "quality.view" },
      { key: "quality.report", label: "Quality Report", href: "/quality/report", permission: "quality.view" },
    ],
  },
  {
    key: "data-entry",
    label: "Data Entry",
    icon: "entry",
    children: [
      { key: "data-entry.records", label: "Input Manual", href: "/data-entry/records", permission: "record.create" },
      { key: "data-entry.production-table", label: "Production Table", href: "/production-table", permission: "dashboard.view" },
      { key: "data-entry.approvals", label: "Approvals", href: "/data-entry/approvals", permission: "record.approve" },
      { key: "data-entry.locks", label: "Lock Records", href: "/data-entry/locks", permission: "record.lock" },
    ],
  },
  {
    key: "transfer",
    label: "Import/Export",
    icon: "transfer",
    children: [
      { key: "transfer.import", label: "Import", href: "/import", permission: "import.run" },
      { key: "transfer.export", label: "Export", href: "/export", permission: "export.run" },
    ],
  },
  { key: "settings", label: "Pengaturan", href: "/settings", icon: "settings", permission: "dashboard.view" },
];

export function getMenuFor(session: { role: string; permissions: string[] }): MenuItem[] {
  const isSuperAdmin = session.role === RoleName.SUPER_ADMIN;
  return filterMenu(MENU_TREE, (permission) => isSuperAdmin || session.permissions.includes(permission));
}

// Terima role string (getMenuFor) atau { name } (MockUser sesi) — satu helper
// untuk dua bentuk user yang dipakai di frontend.
export function roleOf(user: { role: string | { name: string } }): string {
  return typeof user.role === "string" ? user.role : user.role.name;
}

// Super-admin memegang semua izin; sisanya cek permission list dari role.
export function canAccess(user: { role: string | { name: string }; permissions: string[] }, permission: string): boolean {
  return roleOf(user) === RoleName.SUPER_ADMIN || user.permissions.includes(permission);
}

// Menu sesi dihitung ulang dari role/permission user yang login — bukan statis.
export function resolveSessionMenu(user: { role: string | { name: string }; permissions: string[] }): MenuItem[] {
  return getMenuFor({ role: roleOf(user), permissions: user.permissions });
}

function filterMenu(items: MenuNode[], has: (permission: string) => boolean): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (item.permission && !has(item.permission)) continue;
    const children = item.children ? filterMenu(item.children, has) : undefined;
    if (children?.length === 0 && !item.href) continue;
    result.push({
      key: item.key,
      label: item.label,
      href: item.href,
      icon: item.icon,
      ...(children && children.length > 0 ? { children } : {}),
    });
  }
  return result;
}
