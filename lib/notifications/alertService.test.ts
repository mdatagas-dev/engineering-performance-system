import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_DEDUP_WINDOW_MINUTES,
  evaluateAndCreateAlerts,
  type AlertDeps,
  type RecentAlertQuery,
} from "./alertService";
import type { KpiAlertNotificationData } from "@/lib/kpi/evaluator";
import type { KpiConfigModel } from "@/app/generated/prisma/models/KpiConfig";
import type { NotificationModel } from "@/app/generated/prisma/models/Notification";

const NOW = new Date("2026-01-01T00:00:00Z");

function makeKpi(overrides: Partial<KpiConfigModel> = {}): KpiConfigModel {
  return {
    id: "kpi-1",
    key: "uph",
    name: "UPH",
    formula: "",
    unit: "",
    decimals: 0,
    target: 85,
    higherIsBetter: true,
    warningThreshold: 80,
    criticalThreshold: 70,
    definition: null,
    sourceData: null,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    updatedBy: null,
    deletedBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<NotificationModel> = {}): NotificationModel {
  return {
    id: "n-1",
    type: "KPI_ALERT",
    title: "UPH: Ambang Kritis",
    message: "UPH di bawah ambang kritis: 69 < 70",
    severity: "CRITICAL",
    link: "/kpi/uph",
    isRead: false,
    readAt: null,
    isArchived: false,
    archivedAt: null,
    recipientId: "u-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

type Store = {
  kpis: Map<string, KpiConfigModel>;
  alerts: NotificationModel[];
  recentByKey: Map<string, NotificationModel>;
};

function makeDeps(store: Store): { deps: AlertDeps; created: KpiAlertNotificationData[] } {
  const created: KpiAlertNotificationData[] = [];
  return {
    created,
    deps: {
      findKpiByKey: async (key) => store.kpis.get(key) ?? null,
      findRecentAlert: async (q: RecentAlertQuery) => {
        const alert = store.recentByKey.get(queryKey(q));
        return alert && alert.createdAt >= q.since ? alert : null;
      },
      createAlert: async (data) => {
        created.push(data);
        return makeAlert({ ...data, recipientId: data.recipientId });
      },
      now: () => NOW,
    },
  };
}

function queryKey(q: RecentAlertQuery): string {
  return [q.recipientId, q.link ?? "", q.severity].join("|");
}

const BASE_STORE: Store = {
  kpis: new Map([["uph", makeKpi()]]),
  alerts: [],
  recentByKey: new Map(),
};

describe("evaluateAndCreateAlerts", () => {
  it("CRITICAL value -> insert KPI_ALERT, outcome created=true", async () => {
    const { deps, created } = makeDeps(BASE_STORE);
    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-1" },
      deps
    );

    assert.deepEqual(out, [{ key: "uph", status: "CRITICAL", created: true }]);
    assert.equal(created.length, 1);
    assert.equal(created[0].type, "KPI_ALERT");
    assert.equal(created[0].severity, "CRITICAL");
    assert.equal(created[0].recipientId, "u-1");
    assert.equal(created[0].link, "/kpi/uph");
    assert.match(created[0].message, /69 < 70/);
  });

  it("dedup: alert serupa dalam window -> skip, tidak insert", async () => {
    const store: Store = {
      ...BASE_STORE,
      recentByKey: new Map(),
    };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert({ createdAt: NOW })
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-1" },
      deps
    );

    assert.deepEqual(out, [{ key: "uph", status: "CRITICAL", created: false }]);
    assert.equal(created.length, 0);
  });

  it("dedup window lewat -> alert lama tidak menekan, insert baru", async () => {
    const store: Store = {
      ...BASE_STORE,
      recentByKey: new Map(),
    };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert({ createdAt: new Date(NOW.getTime() - ALERT_DEDUP_WINDOW_MINUTES * 2 * 60_000) })
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-1" },
      deps
    );

    assert.equal(out[0].created, true);
    assert.equal(created.length, 1);
  });

  it("severity berbeda -> tidak terdedup, insert", async () => {
    const store: Store = {
      ...BASE_STORE,
      recentByKey: new Map(),
    };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert()
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 75 }], recipientId: "u-1" },
      deps
    );

    assert.deepEqual(out, [{ key: "uph", status: "WARNING", created: true }]);
    assert.equal(created.length, 1);
  });

  it("link/kpi berbeda -> tidak terdedup, insert", async () => {
    const store: Store = {
      ...BASE_STORE,
      kpis: new Map([["uph", makeKpi()], ["hc", makeKpi({ key: "hc", name: "HC" })]]),
      recentByKey: new Map(),
    };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert()
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "hc", value: 69 }], recipientId: "u-1" },
      deps
    );

    assert.equal(out[0].created, true);
    assert.equal(created.length, 1);
    assert.equal(created[0].link, "/kpi/hc");
  });

  it("recipient berbeda -> tidak terdedup, insert", async () => {
    const store: Store = { ...BASE_STORE, recentByKey: new Map() };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert()
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-2" },
      deps
    );

    assert.equal(out[0].created, true);
    assert.equal(created.length, 1);
    assert.equal(created[0].recipientId, "u-2");
  });

  it("link kustom dipakai sebagai identitas dedup", async () => {
    const store: Store = { ...BASE_STORE, recentByKey: new Map() };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/area-1/tv|CRITICAL`,
      makeAlert({ link: "/area-1/tv" })
    );

    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69, link: "/area-1/tv" }], recipientId: "u-1" },
      deps
    );

    assert.equal(out[0].created, false);
    assert.equal(created.length, 0);
  });

  it("nilai OK -> tidak ada alert", async () => {
    const { deps, created } = makeDeps(BASE_STORE);
    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 90 }], recipientId: "u-1" },
      deps
    );

    assert.deepEqual(out, [{ key: "uph", status: "OK", created: false }]);
    assert.equal(created.length, 0);
  });

  it("nilai NaN -> ERROR, tidak ada alert", async () => {
    const { deps, created } = makeDeps(BASE_STORE);
    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: NaN }], recipientId: "u-1" },
      deps
    );

    assert.equal(out[0].status, "ERROR");
    assert.equal(out[0].created, false);
    assert.equal(created.length, 0);
  });

  it("KPI tidak terkonfigurasi -> ERROR + reason, tidak ada alert", async () => {
    const store: Store = { ...BASE_STORE, kpis: new Map() };
    const { deps, created } = makeDeps(store);
    const out = await evaluateAndCreateAlerts(
      { values: [{ key: "bogus", value: 69 }], recipientId: "u-1" },
      deps
    );

    assert.equal(out[0].status, "ERROR");
    assert.equal(out[0].created, false);
    assert.match(out[0].reason ?? "", /tidak ditemukan/);
    assert.equal(created.length, 0);
  });

  it("batch campuran: satu insert, satu dedup, satu OK", async () => {
    const store: Store = { ...BASE_STORE, recentByKey: new Map() };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|WARNING`,
      makeAlert({ severity: "WARNING", createdAt: NOW })
    );

    const out = await evaluateAndCreateAlerts(
      {
        values: [
          { key: "uph", value: 69 }, // CRITICAL -> insert
          { key: "uph", value: 75 }, // WARNING -> dedup
          { key: "uph", value: 90 }, // OK -> skip
        ],
        recipientId: "u-1",
      },
      deps
    );

    assert.deepEqual(out, [
      { key: "uph", status: "CRITICAL", created: true },
      { key: "uph", status: "WARNING", created: false },
      { key: "uph", status: "OK", created: false },
    ]);
    assert.equal(created.length, 1);
  });

  it("window kustom via option", async () => {
    const store: Store = { ...BASE_STORE, recentByKey: new Map() };
    const { deps, created } = makeDeps(store);
    store.recentByKey.set(
      `u-1|/kpi/uph|CRITICAL`,
      makeAlert({ createdAt: new Date(NOW.getTime() - 60 * 60_000) })
    );

    const deduped = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-1" },
      deps,
      { dedupWindowMinutes: 1440 }
    );
    const fresh = await evaluateAndCreateAlerts(
      { values: [{ key: "uph", value: 69 }], recipientId: "u-1" },
      deps,
      { dedupWindowMinutes: 30 }
    );

    assert.equal(deduped[0].created, false);
    assert.equal(fresh[0].created, true);
    assert.equal(created.length, 1);
  });
});
