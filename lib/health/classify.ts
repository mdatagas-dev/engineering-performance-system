import { HealthStatus } from "@/app/generated/prisma/enums";

// Klasifikasi kesehatan DB untuk GET /api/health.
// error → DOWN; latency >= DEGRADED_LATENCY_MS → DEGRADED; selain itu UP.
// Threshold DEGRADED = 1000ms, konsisten dengan SLOW_QUERY_THRESHOLD_MS
// di lib/prisma.ts (query di atas 1s sudah dianggap slow).
export const DEGRADED_LATENCY_MS = 1000;

export type DbProbe = {
  latencyMs: number | null;
  error: unknown;
};

export function classifyDbHealth(probe: DbProbe): HealthStatus {
  if (probe.error) return HealthStatus.DOWN;
  if (probe.latencyMs !== null && probe.latencyMs >= DEGRADED_LATENCY_MS) {
    return HealthStatus.DEGRADED;
  }
  return HealthStatus.UP;
}
