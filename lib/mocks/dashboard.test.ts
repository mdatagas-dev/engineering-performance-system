import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDashboardData, getSystemInfo } from "./dashboard";

describe("getDashboardData", () => {
  const data = getDashboardData();

  it("shape KPI lengkap dengan nilai reference", () => {
    assert.deepEqual(data.kpis, {
      plan: 7000,
      actual: 4532,
      achievementPct: 64.74,
      remaining: 2468,
      defect: 123,
      defectRatePct: 2.72,
    });
  });

  it("lineStatus 5 baris sesuai reference", () => {
    assert.equal(data.lineStatus.length, 5);
    assert.deepEqual(data.lineStatus[0], {
      line: "Line 1",
      model: "AN-05CDG",
      status: "RUNNING",
      plan: 1500,
      actual: 1072,
      achievementPct: 71.47,
      defect: 28,
    });
    assert.equal(data.lineStatus[4].status, "IDLE");
    for (const row of data.lineStatus) {
      assert.ok(["RUNNING", "STOP", "IDLE"].includes(row.status));
    }
  });

  it("pareto urut menurun", () => {
    for (let i = 1; i < data.pareto.length; i++) {
      assert.ok(data.pareto[i - 1].quantity >= data.pareto[i].quantity);
    }
    assert.deepEqual(data.pareto.map((p) => p.name), [
      "NG Panel",
      "Gas Leak",
      "Wiring",
      "Function",
      "Others",
    ]);
  });

  it("outputTrend tanggal menaik, target tetap 1350", () => {
    assert.ok(data.outputTrend.length >= 10);
    for (let i = 1; i < data.outputTrend.length; i++) {
      assert.ok(data.outputTrend[i].date > data.outputTrend[i - 1].date);
    }
    for (const row of data.outputTrend) {
      assert.equal(row.target, 1350);
      assert.ok(row.actual >= 1100 && row.actual <= 1500);
    }
  });

  it("alerts 5-6 baris, documents 4-5 baris", () => {
    assert.ok(data.alerts.length >= 5 && data.alerts.length <= 6);
    assert.ok(data.documents.length >= 4 && data.documents.length <= 5);
  });

  it("data dibekukan (frozen)", () => {
    assert.ok(Object.isFrozen(data));
  });
});

describe("getSystemInfo", () => {
  it("mengembalikan field sistem dengan loginTime id-ID", () => {
    const info = getSystemInfo("Budi", "Admin");
    assert.equal(info.user, "Budi");
    assert.equal(info.department, "Engineering");
    assert.equal(info.accessLevel, "Admin");
    assert.equal(info.server, "EPS-SRV-01");
    assert.equal(info.database, "Terhubung");
    assert.match(info.loginTime, /^\d{2}[:.]\d{2}$/);
    assert.match(info.version, /^\d+\.\d+\.\d+/);
  });
});
