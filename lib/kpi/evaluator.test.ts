import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateKpiValue,
  createKpiAlertNotification,
} from "./evaluator";

const higher = {
  target: 85,
  warningThreshold: 80,
  criticalThreshold: 70,
  higherIsBetter: true,
};
const lower = {
  target: 5,
  warningThreshold: 7,
  criticalThreshold: 9,
  higherIsBetter: false,
};

const kpiSource = {
  name: "UPH",
  unit: "",
  decimals: 0,
  higherIsBetter: true,
};

describe("evaluateKpiValue: higher-is-better", () => {
  it("value < critical → CRITICAL", () => {
    const r = evaluateKpiValue({ value: 69, ...higher });
    assert.equal(r.status, "CRITICAL");
    assert.equal(r.threshold, 70);
  });

  it("value == critical → WARNING (strict, belum melampaui)", () => {
    const r = evaluateKpiValue({ value: 70, ...higher });
    assert.equal(r.status, "WARNING");
  });

  it("value < warning → WARNING", () => {
    const r = evaluateKpiValue({ value: 79, ...higher });
    assert.equal(r.status, "WARNING");
  });

  it("value == warning → OK (strict, belum melampaui)", () => {
    const r = evaluateKpiValue({ value: 80, ...higher });
    assert.equal(r.status, "OK");
  });

  it("value di atas target → OK", () => {
    const r = evaluateKpiValue({ value: 90, ...higher });
    assert.equal(r.status, "OK");
  });
});

describe("evaluateKpiValue: lower-is-better", () => {
  it("value > critical → CRITICAL", () => {
    const r = evaluateKpiValue({ value: 9.1, ...lower });
    assert.equal(r.status, "CRITICAL");
    assert.equal(r.threshold, 9);
  });

  it("value == critical → WARNING (strict)", () => {
    const r = evaluateKpiValue({ value: 9, ...lower });
    assert.equal(r.status, "WARNING");
  });

  it("value > warning → WARNING", () => {
    const r = evaluateKpiValue({ value: 7.5, ...lower });
    assert.equal(r.status, "WARNING");
  });

  it("value di bawah warning → OK", () => {
    const r = evaluateKpiValue({ value: 6, ...lower });
    assert.equal(r.status, "OK");
  });
});

describe("evaluateKpiValue: threshold null & data invalid", () => {
  it("critical null → tidak pernah CRITICAL, tetap WARNING", () => {
    const r = evaluateKpiValue({
      value: 10,
      target: 85,
      warningThreshold: 80,
      criticalThreshold: null,
      higherIsBetter: true,
    });
    assert.equal(r.status, "WARNING");
  });

  it("warning null tapi critical terisi → lompat bandingkan critical", () => {
    const r = evaluateKpiValue({
      value: 75,
      target: 85,
      warningThreshold: null,
      criticalThreshold: 80,
      higherIsBetter: true,
    });
    assert.equal(r.status, "CRITICAL");
  });

  it("kedua threshold null → selalu OK", () => {
    const r = evaluateKpiValue({
      value: 1,
      target: 85,
      warningThreshold: null,
      criticalThreshold: null,
      higherIsBetter: true,
    });
    assert.equal(r.status, "OK");
  });

  it("NaN → ERROR, bukan crash", () => {
    const r = evaluateKpiValue({ value: NaN, ...higher });
    assert.equal(r.status, "ERROR");
  });

  it("Infinity → ERROR", () => {
    const r = evaluateKpiValue({ value: Infinity, ...higher });
    assert.equal(r.status, "ERROR");
  });

  it("threshold negatif (KPI gap) tetap dievaluasi benar", () => {
    const r = evaluateKpiValue({
      key: "gap_uph",
      value: -11,
      target: -5,
      warningThreshold: -8,
      criticalThreshold: -10,
      higherIsBetter: true,
    });
    assert.equal(r.status, "CRITICAL");
    assert.match(r.reason ?? "", /-11/);
  });
});

describe("createKpiAlertNotification", () => {
  it("CRITICAL → data Notification severity CRITICAL, format pesan '<'", () => {
    const result = evaluateKpiValue({ value: 69, ...higher });
    const n = createKpiAlertNotification(kpiSource, result, { recipientId: "u-1" });
    assert.ok(n);
    assert.equal(n.type, "KPI_ALERT");
    assert.equal(n.severity, "CRITICAL");
    assert.equal(n.message, "UPH di bawah ambang kritis: 69 < 70");
    assert.equal(n.recipientId, "u-1");
  });

  it("WARNING lower-is-better → pesan 'di atas' dan '>'", () => {
    const result = evaluateKpiValue({ value: 7.5, ...lower });
    const n = createKpiAlertNotification(
      { ...kpiSource, higherIsBetter: false, decimals: 1 },
      result,
      { recipientId: "u-1", link: "/kpi/hc" }
    );
    assert.ok(n);
    assert.equal(n.severity, "WARNING");
    assert.equal(n.message, "UPH di atas ambang peringatan: 7.5 > 7.0");
    assert.equal(n.link, "/kpi/hc");
  });

  it("OK → null (tidak ada alert)", () => {
    const result = evaluateKpiValue({ value: 90, ...higher });
    assert.equal(createKpiAlertNotification(kpiSource, result, { recipientId: "u-1" }), null);
  });

  it("ERROR → null (data invalid, tidak dibikin alert)", () => {
    const result = evaluateKpiValue({ value: NaN, ...higher });
    assert.equal(createKpiAlertNotification(kpiSource, result, { recipientId: "u-1" }), null);
  });
});
