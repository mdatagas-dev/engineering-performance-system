// Mock data untuk rekonstruksi Production Dashboard — frontend-first
// (backend API belum ada). Shape persis mengikuti kontrak yang dipakai
// agent lain: nilai KPI/line/pareto HARUS tetap, jangan diedit bebas.

import pkg from "../../package.json";

export type LineStatus = {
  line: string;
  model: string;
  status: "RUNNING" | "STOP" | "IDLE";
  plan: number;
  actual: number;
  achievementPct: number;
  defect: number;
};

export type OutputTrend = {
  date: string;
  plan: number;
  actual: number;
  target: number;
};

export type ParetoItem = {
  name: string;
  quantity: number;
};

export type Alert = {
  time: string;
  level: "INFO" | "WARNING" | "CRITICAL";
  message: string;
};

export type Document = {
  name: string;
  type: string;
  lastUpdate: string;
};

export type DashboardData = {
  kpis: {
    plan: number;
    actual: number;
    achievementPct: number;
    remaining: number;
    defect: number;
    defectRatePct: number;
  };
  lineStatus: readonly LineStatus[];
  outputTrend: readonly OutputTrend[];
  pareto: readonly ParetoItem[];
  alerts: readonly Alert[];
  documents: readonly Document[];
};

export function getDashboardData(): DashboardData {
  return Object.freeze({
    kpis: Object.freeze({
      plan: 7000,
      actual: 4532,
      achievementPct: 64.74,
      remaining: 2468,
      defect: 123,
      defectRatePct: 2.72,
    }),
    lineStatus: Object.freeze([
      Object.freeze({
        line: "Line 1",
        model: "AN-05CDG",
        status: "RUNNING",
        plan: 1500,
        actual: 1072,
        achievementPct: 71.47,
        defect: 28,
      }),
      Object.freeze({
        line: "Line 2",
        model: "AN-09CDG",
        status: "RUNNING",
        plan: 1500,
        actual: 1018,
        achievementPct: 67.87,
        defect: 31,
      }),
      Object.freeze({
        line: "Line 3",
        model: "AN-12CDG",
        status: "RUNNING",
        plan: 1500,
        actual: 1210,
        achievementPct: 80.67,
        defect: 25,
      }),
      Object.freeze({
        line: "Line 4",
        model: "AN-18CDG",
        status: "STOP",
        plan: 1500,
        actual: 0,
        achievementPct: 0.0,
        defect: 0,
      }),
      Object.freeze({
        line: "Line 5",
        model: "AN-24CDG",
        status: "IDLE",
        plan: 1000,
        actual: 0,
        achievementPct: 0.0,
        defect: 0,
      }),
    ]),
    outputTrend: Object.freeze([
      Object.freeze({ date: "2026-08-03", plan: 1400, actual: 1234, target: 1350 }),
      Object.freeze({ date: "2026-08-04", plan: 1385, actual: 1402, target: 1350 }),
      Object.freeze({ date: "2026-08-05", plan: 1415, actual: 1189, target: 1350 }),
      Object.freeze({ date: "2026-08-06", plan: 1390, actual: 1467, target: 1350 }),
      Object.freeze({ date: "2026-08-07", plan: 1425, actual: 1321, target: 1350 }),
      Object.freeze({ date: "2026-08-10", plan: 1398, actual: 1498, target: 1350 }),
      Object.freeze({ date: "2026-08-11", plan: 1405, actual: 1154, target: 1350 }),
      Object.freeze({ date: "2026-08-12", plan: 1382, actual: 1376, target: 1350 }),
      Object.freeze({ date: "2026-08-13", plan: 1412, actual: 1245, target: 1350 }),
      Object.freeze({ date: "2026-08-14", plan: 1395, actual: 1433, target: 1350 }),
    ]),
    pareto: Object.freeze([
      Object.freeze({ name: "NG Panel", quantity: 46 }),
      Object.freeze({ name: "Gas Leak", quantity: 32 }),
      Object.freeze({ name: "Wiring", quantity: 21 }),
      Object.freeze({ name: "Function", quantity: 14 }),
      Object.freeze({ name: "Others", quantity: 10 }),
    ]),
    alerts: Object.freeze([
      Object.freeze({
        time: "07:45",
        level: "INFO",
        message: "Shift pagi dimulai, seluruh line siap produksi",
      }),
      Object.freeze({
        time: "09:12",
        level: "CRITICAL",
        message: "Line 4 STOP: tekanan udara drop di bawah standar",
      }),
      Object.freeze({
        time: "10:30",
        level: "WARNING",
        message: "Line 2 defect wiring meningkat 30% dari rata-rata",
      }),
      Object.freeze({
        time: "13:05",
        level: "INFO",
        message: "Changeover model AN-12CDG selesai tepat waktu",
      }),
      Object.freeze({
        time: "14:20",
        level: "WARNING",
        message: "Line 5 IDLE menunggu material, ketersediaan di bawah buffer",
      }),
      Object.freeze({
        time: "15:40",
        level: "INFO",
        message: "Inspeksi kualitas akhir selesai, hasil sesuai target",
      }),
    ]),
    documents: Object.freeze([
      Object.freeze({ name: "WI-001", type: "Work Instruction", lastUpdate: "2026-08-01" }),
      Object.freeze({ name: "BOM-004", type: "Bill of Material", lastUpdate: "2026-07-28" }),
      Object.freeze({ name: "DWG-012", type: "Drawing", lastUpdate: "2026-08-05" }),
      Object.freeze({ name: "SOP-002", type: "Standard Operating Procedure", lastUpdate: "2026-07-15" }),
      Object.freeze({ name: "FORM-007", type: "Formulir Inspeksi", lastUpdate: "2026-08-10" }),
    ]),
  });
}

export type SystemInfo = {
  user: string;
  department: string;
  accessLevel: string;
  loginTime: string;
  server: string;
  database: string;
  version: string;
};

export function getSystemInfo(userName: string, roleLabel: string): SystemInfo {
  return Object.freeze({
    user: userName,
    department: "Engineering",
    accessLevel: roleLabel,
    loginTime: new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    server: "EPS-SRV-01",
    database: "Terhubung",
    version: pkg.version,
  });
}
