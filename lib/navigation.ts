export type NavItem = {
  key: string;
  label: string;
  href?: string;
  children?: NavItem[];
};

export type Shortcut = {
  key: string;
  label: string;
  href: string;
};

export const NAV_TREE: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    children: [
      { key: "dashboard.main", label: "Main Dashboard", href: "/dashboard" },
      { key: "dashboard.trend", label: "Trend Analysis", href: "/analisis-tren" },
    ],
  },
  {
    key: "production",
    label: "Production",
    children: [
      { key: "production.daily", label: "Daily Monitoring", href: "/production/daily-monitoring" },
      { key: "production.line", label: "Line Status", href: "/production/line-status" },
      { key: "production.output", label: "Output Report", href: "/production/output-report" },
      { key: "production.defect", label: "Defect Report", href: "/production/defect-report" },
    ],
  },
  {
    key: "data-entry",
    label: "Data Entry",
    children: [
      { key: "data-entry.manual", label: "Input Manual", href: "/data-entry/records" },
      { key: "data-entry.table", label: "Production Table", href: "/production-table" },
      { key: "data-entry.approvals", label: "Approvals", href: "/data-entry/approvals" },
      { key: "data-entry.locks", label: "Lock Records", href: "/data-entry/locks" },
      { key: "data-entry.import", label: "Import", href: "/import" },
      { key: "data-entry.export", label: "Export", href: "/export" },
    ],
  },
  {
    key: "quality",
    label: "Quality",
    children: [
      { key: "quality.inspection", label: "Inspection", href: "/quality/inspection" },
      { key: "quality.defects", label: "Defect Analysis", href: "/quality/defects" },
      { key: "quality.pareto", label: "Pareto Chart", href: "/quality/analysis" },
      { key: "quality.trend", label: "Quality Trend", href: "/quality/trend" },
      { key: "quality.dashboard", label: "Quality Dashboard", href: "/quality" },
      { key: "quality.report", label: "Quality Report", href: "/quality/report" },
    ],
  },
  {
    key: "engineering",
    label: "Engineering",
    children: [
      { key: "engineering.wi", label: "WI Management", href: "/engineering/wi-management" },
      { key: "engineering.bom", label: "BOM Management", href: "/engineering/bom-management" },
      { key: "engineering.drawing", label: "Drawing Management", href: "/engineering/drawing-management" },
      { key: "engineering.cr", label: "Change Request", href: "/engineering/change-request" },
      { key: "engineering.improvement", label: "Improvement", href: "/engineering/improvement" },
    ],
  },
  {
    key: "support",
    label: "Support",
    children: [
      { key: "support.document", label: "Document Center", href: "/support/document-center" },
      { key: "support.training", label: "Training Modul", href: "/support/training-material" },
      { key: "support.announcement", label: "Announcement", href: "/support/announcement" },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    children: [
      { key: "administration.kpi", label: "KPI Configuration", href: "/kpi" },
      { key: "administration.users", label: "User Management", href: "/users" },
      { key: "administration.audit", label: "Audit Trail", href: "/audit" },
      { key: "administration.sessions", label: "Active Sessions", href: "/sessions" },
    ],
  },
  { key: "settings", label: "Settings", href: "/settings" },
];

export const SYSTEM_SHORTCUTS: Shortcut[] = [
  { key: "s1", label: "Daily Report", href: "/production/daily-monitoring" },
  { key: "s2", label: "Line Status", href: "/production/line-status" },
  { key: "s3", label: "Defect Report", href: "/production/defect-report" },
  { key: "s4", label: "WI Management", href: "/engineering/wi-management" },
  { key: "s5", label: "BOM Management", href: "/engineering/bom-management" },
  { key: "s6", label: "Drawing", href: "/engineering/drawing-management" },
  { key: "s7", label: "Change Request", href: "/engineering/change-request" },
  { key: "s8", label: "Improvement", href: "/engineering/improvement" },
  { key: "s9", label: "Announcement", href: "/support/announcement" },
];
