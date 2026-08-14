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
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  {
    key: "production",
    label: "Production",
    children: [
      { key: "production.daily", label: "Daily Monitoring", href: "/production/daily-monitoring" },
      { key: "production.line", label: "Line Status", href: "/production/line-status" },
      { key: "production.output", label: "Output Report", href: "/production/output-report" },
      { key: "production.defect", label: "Defect Report", href: "/production/defect-report" },
      { key: "production.cttakt", label: "CT & Takt Time", href: "/production/ct-takt-time" },
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
    key: "maintenance",
    label: "Maintenance",
    children: [
      { key: "maintenance.machine", label: "Machine Status", href: "/maintenance/machine-status" },
      { key: "maintenance.pm", label: "Preventive Maintenance", href: "/maintenance/preventive-maintenance" },
      { key: "maintenance.cm", label: "Corrective Maintenance", href: "/maintenance/corrective-maintenance" },
      { key: "maintenance.log", label: "Maintenance Log", href: "/maintenance/maintenance-log" },
    ],
  },
  {
    key: "support",
    label: "Support",
    children: [
      { key: "support.document", label: "Document Center", href: "/support/document-center" },
      { key: "support.training", label: "Training Material", href: "/support/training-material" },
      { key: "support.announcement", label: "Announcement", href: "/support/announcement" },
    ],
  },
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
