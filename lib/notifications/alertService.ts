// Integrasi evaluator ambang KPI dengan penyimpanan notifikasi (phase 1 backend).
// Murni terhadap DB: semua akses data lewat deps injeksi, jadi test pakai fake
// tanpa DB nyata. Produksi mengikat deps ke transaction client via makeAlertDeps(tx).
// Pemanggil masa depan (task produksi) tinggal:
//   await prisma.$transaction(async (tx) => {
//     await evaluateAndCreateAlerts({ values: [{ key: "uph", value: 65 }], recipientId }, makeAlertDeps(tx));
//   });
//
// Dedup: dalam ALERT_DEDUP_WINDOW_MINUTES, KPI_ALERT dengan recipient + link + severity
// yang sama di-skip (tidak insert duplikat). Identitas KPI memakai link (Notification
// tidak punya kolom kpiKey); default `/kpi/${key}` bila pemanggil tidak memberi link.

import { Prisma } from "@/app/generated/prisma/client";
import { KpiConfigModel } from "@/app/generated/prisma/models/KpiConfig";
import { NotificationModel } from "@/app/generated/prisma/models/Notification";
import {
  createKpiAlertNotification,
  evaluateKpiValue,
  type KpiAlertNotificationData,
  type KpiEvaluationStatus,
} from "@/lib/kpi/evaluator";

export const ALERT_DEDUP_WINDOW_MINUTES = 60;

export type AlertValue = {
  key: string;
  value: number;
  link?: string;
};

export type EvaluateAndCreateAlertsInput = {
  values: AlertValue[];
  recipientId: string;
};

export type RecentAlertQuery = {
  recipientId: string;
  link: string | null;
  severity: "WARNING" | "CRITICAL";
  since: Date;
};

export type AlertDeps = {
  findKpiByKey(key: string): Promise<KpiConfigModel | null>;
  findRecentAlert(query: RecentAlertQuery): Promise<NotificationModel | null>;
  createAlert(data: KpiAlertNotificationData): Promise<NotificationModel>;
  now(): Date;
};

export type AlertOutcome = {
  key: string;
  status: KpiEvaluationStatus;
  created: boolean;
  reason?: string;
};

export function makeAlertDeps(tx: Prisma.TransactionClient): AlertDeps {
  return {
    findKpiByKey: (key) =>
      tx.kpiConfig.findFirst({ where: { key, isDeleted: false, isActive: true } }),
    findRecentAlert: (q) =>
      tx.notification.findFirst({
        where: {
          recipientId: q.recipientId,
          type: "KPI_ALERT",
          severity: q.severity,
          createdAt: { gte: q.since },
          ...(q.link ? { link: q.link } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
    createAlert: (data) => tx.notification.create({ data }),
    now: () => new Date(),
  };
}

export async function evaluateAndCreateAlerts(
  input: EvaluateAndCreateAlertsInput,
  deps: AlertDeps,
  options: { dedupWindowMinutes?: number } = {}
): Promise<AlertOutcome[]> {
  const windowMinutes = Math.max(1, options.dedupWindowMinutes ?? ALERT_DEDUP_WINDOW_MINUTES);
  const outcomes: AlertOutcome[] = [];

  for (const { key, value, link } of input.values) {
    const kpi = await deps.findKpiByKey(key);
    if (!kpi) {
      // Tanpa konfigurasi KPI tidak bisa dievaluasi — laporkan, jangan insert.
      outcomes.push({ key, status: "ERROR", created: false, reason: "Konfigurasi KPI tidak ditemukan." });
      continue;
    }

    const result = evaluateKpiValue({
      key,
      value,
      target: kpi.target,
      warningThreshold: kpi.warningThreshold,
      criticalThreshold: kpi.criticalThreshold,
      higherIsBetter: kpi.higherIsBetter,
    });

    const outcome: AlertOutcome = { key, status: result.status, created: false };

    if (result.status === "WARNING" || result.status === "CRITICAL") {
      const alert = createKpiAlertNotification(
        { name: kpi.name, unit: kpi.unit, decimals: kpi.decimals, higherIsBetter: kpi.higherIsBetter },
        result,
        { recipientId: input.recipientId, link: link ?? `/kpi/${key}` }
      );
      if (alert) {
        const since = new Date(deps.now().getTime() - windowMinutes * 60_000);
        const existing = await deps.findRecentAlert({
          recipientId: input.recipientId,
          link: alert.link ?? null,
          severity: alert.severity,
          since,
        });
        if (!existing) {
          await deps.createAlert(alert);
          outcome.created = true;
        }
      }
    }

    outcomes.push(outcome);
  }

  return outcomes;
}
