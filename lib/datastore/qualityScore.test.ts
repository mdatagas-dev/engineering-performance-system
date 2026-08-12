import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateQualityScore,
  ISSUE_SAMPLE_LIMIT,
  summarizeQualityComponents,
  type QualityIssue,
  type QualityScoreRecord,
} from "./qualityScore";

function rec(over: Record<string, unknown> = {}): QualityScoreRecord {
  return {
    date: "2026-08-01",
    model: "LINE-A",
    uphTarget: 100,
    uphResult: 102,
    hcStandard: 8,
    hcActual: 8,
    plan: 1000,
    outputProd: 1005,
    totalSetup: 30,
    workingHour: 7.5,
    totalSetupPacking: 20,
    workingHourPacking: 1.5,
    upph: 12.75,
    ...over,
  };
}

describe("list kosong", () => {
  it("score null + reason, semua komponen null, tidak crash", () => {
    const r = calculateQualityScore([]);
    assert.equal(r.score, null);
    assert.equal(r.reason, "Tidak ada record untuk dinilai.");
    assert.equal(r.totalRecords, 0);
    assert.deepEqual(r.components, {
      completeness: null,
      validity: null,
      duplication: null,
      anomaly: null,
    });
    assert.equal(r.issueCount, 0);
    assert.deepEqual(r.issues, []);
  });
});

describe("semua field null (edge)", () => {
  it("skor rendah (0), tidak crash, completeness & validity 0", () => {
    const r = calculateQualityScore([{}, {}]);
    assert.equal(r.score, 0);
    assert.equal(r.components.completeness, 0);
    assert.equal(r.components.validity, 0);
    assert.equal(r.components.duplication, null);
    assert.equal(r.components.anomaly, null);
    assert.equal(r.issueCount, 4);
  });
});

describe("completeness", () => {
  it("semua field terisi → 1", () => {
    const r = calculateQualityScore([rec(), rec()]);
    assert.equal(r.components.completeness, 1);
  });

  it("record kosong → 0", () => {
    const r = calculateQualityScore([{}]);
    assert.equal(r.components.completeness, 0);
  });

  it("sebagian field hilang → proporsi benar + issue incomplete", () => {
    const r = calculateQualityScore([rec({ duplicateKey: "k0" }), rec({ duplicateKey: "k1" }), rec({ duplicateKey: "k2", plan: undefined, model: undefined })]);
    const expected = (1 + 1 + 10 / 12) / 3;
    assert.ok(Math.abs(r.components.completeness! - expected) < 1e-9);
    const incomplete = r.issues.filter((i) => i.type === "incomplete");
    assert.equal(incomplete.length, 1);
    assert.equal(incomplete[0].recordIndex, 2);
  });

  it("string kosong dianggap tidak terisi", () => {
    const r = calculateQualityScore([rec({ model: "   " })]);
    assert.ok(Math.abs(r.components.completeness! - 11 / 12) < 1e-9);
  });
});

describe("validity", () => {
  it("nilai negatif field non-negatif → record tidak valid", () => {
    const r = calculateQualityScore([rec(), rec({ plan: -5 }), rec()]);
    assert.ok(Math.abs(r.components.validity! - 2 / 3) < 1e-9);
    const invalid = r.issues.filter((i) => i.type === "invalid");
    assert.equal(invalid.length, 1);
    assert.equal(invalid[0].recordIndex, 1);
    assert.match(invalid[0].detail, /plan/);
  });

  it("nilai non-numerik → record tidak valid", () => {
    const r = calculateQualityScore([rec({ outputProd: "abc" }), rec()]);
    assert.equal(r.components.validity, 0.5);
  });

  it("upph = 0 → tidak valid (harus > 0)", () => {
    const r = calculateQualityScore([rec({ upph: 0 }), rec()]);
    assert.equal(r.components.validity, 0.5);
  });

  it("GAP negatif TIDAK menurunkan validitas", () => {
    const r = calculateQualityScore([rec({ gapUph: -5, gapHc: -1 }), rec()]);
    assert.equal(r.components.validity, 1);
  });
});

describe("duplication", () => {
  it("semua key unik → 1", () => {
    const r = calculateQualityScore([rec({ duplicateKey: "a" }), rec({ duplicateKey: "b" })]);
    assert.equal(r.components.duplication, 1);
  });

  it("duplikat dihitung dari duplicateKey", () => {
    const r = calculateQualityScore([
      rec({ duplicateKey: "k1" }),
      rec({ duplicateKey: "k1" }),
      rec({ duplicateKey: "k2" }),
    ]);
    assert.ok(Math.abs(r.components.duplication! - 2 / 3) < 1e-9);
    const dup = r.issues.filter((i) => i.type === "duplicate");
    assert.equal(dup.length, 1);
    assert.equal(dup[0].recordIndex, 1);
  });

  it("tanpa duplicateKey sama sekali → null", () => {
    const r = calculateQualityScore([rec(), rec()]);
    assert.equal(r.components.duplication, null);
  });

  it("duplicateKey kosong dianggap tanpa key → null", () => {
    const r = calculateQualityScore([rec({ duplicateKey: "  " }), rec({ duplicateKey: "" })]);
    assert.equal(r.components.duplication, null);
  });
});

describe("anomaly", () => {
  it("semua nilai sama (stddev 0) → tidak ada anomali", () => {
    const r = calculateQualityScore([rec({ outputProd: 100, uphResult: 50 }), rec({ outputProd: 100, uphResult: 50 }), rec({ outputProd: 100, uphResult: 50 })]);
    assert.equal(r.components.anomaly, 1);
    assert.equal(r.issues.filter((i) => i.type === "anomalous").length, 0);
  });

  it("distribusi normal vs outlier → hanya outlier yang dianomali", () => {
    const base = rec({ outputProd: 100, uphResult: 50 });
    const records = Array.from({ length: 20 }, () => ({ ...base }));
    records.push(rec({ outputProd: 1000, uphResult: 50 }));
    const r = calculateQualityScore(records);
    assert.ok(Math.abs(r.components.anomaly! - 20 / 21) < 1e-9);
    const anomalous = r.issues.filter((i) => i.type === "anomalous");
    assert.equal(anomalous.length, 1);
    assert.equal(anomalous[0].recordIndex, 20);
    assert.match(anomalous[0].detail, /outputProd/);
  });

  it("satu record → anomaly null (tak bisa dinilai)", () => {
    const r = calculateQualityScore([rec()]);
    assert.equal(r.components.anomaly, null);
  });
});

describe("skor akhir & bobot", () => {
  it("data sempurna → score 100, semua komponen 1", () => {
    const r = calculateQualityScore([
      rec({ duplicateKey: "d1", outputProd: 100, uphResult: 50 }),
      rec({ duplicateKey: "d2", outputProd: 101, uphResult: 51 }),
      rec({ duplicateKey: "d3", outputProd: 100, uphResult: 50 }),
    ]);
    assert.equal(r.score, 100);
    assert.deepEqual(r.components, { completeness: 1, validity: 1, duplication: 1, anomaly: 1 });
    assert.equal(r.issueCount, 0);
  });

  it("bobot sama rata, pembulatan 1 desimal", () => {
    const r = calculateQualityScore([
      rec({ duplicateKey: "a" }),
      rec({ duplicateKey: "b" }),
      rec({ duplicateKey: "c", model: undefined }),
    ]);
    const completeness = (1 + 1 + 11 / 12) / 3;
    assert.ok(Math.abs(r.components.completeness! - completeness) < 1e-9);
    assert.equal(r.components.validity, 1);
    assert.equal(r.components.duplication, 1);
    assert.equal(r.components.anomaly, 1);
    const expected = Math.round(((completeness + 3) / 4) * 1000) / 10;
    assert.equal(r.score, expected);
    assert.equal(r.score, 99.3);
  });

  it("komponen null tidak ikut rata-rata", () => {
    const r = calculateQualityScore([rec(), rec()]);
    assert.equal(r.components.duplication, null);
    assert.equal(r.components.anomaly, 1);
    assert.equal(r.score, 100);
  });
});

describe("options", () => {
  it("requiredFields custom dipakai untuk completeness", () => {
    const r = calculateQualityScore([rec({ plan: undefined }), rec()], {
      requiredFields: ["uphTarget", "plan"],
    });
    assert.equal(r.components.completeness, 0.75);
  });

  it("anomalySigma custom bisa dipakai", () => {
    const r = calculateQualityScore([rec({ outputProd: 100 }), rec({ outputProd: 100 }), rec({ outputProd: 140 })], {
      anomalySigma: 1,
    });
    const anomalous = r.issues.filter((i) => i.type === "anomalous");
    assert.equal(anomalous.length, 1);
    assert.equal(anomalous[0].recordIndex, 2);
  });
});

describe("perComponent ringkasan", () => {
  it("data sempurna → tiap komponen issueCount 0, sampleIssues kosong, score sesuai components", () => {
    const r = calculateQualityScore([
      rec({ duplicateKey: "d1", outputProd: 100, uphResult: 50 }),
      rec({ duplicateKey: "d2", outputProd: 101, uphResult: 51 }),
    ]);
    assert.equal(r.perComponent.length, 4);
    for (const c of r.perComponent) {
      assert.equal(c.issueCount, 0);
      assert.deepEqual(c.sampleIssues, []);
      assert.equal(c.score, r.components[c.component]);
    }
  });

  it("issue tiap tipe → count benar dan dikelompokkan per komponen", () => {
    const base = rec({ outputProd: 100, uphResult: 50 });
    const records: QualityScoreRecord[] = Array.from({ length: 20 }, (_, i) => ({
      ...base,
      duplicateKey: `k${i}`,
    }));
    records.push(rec({ duplicateKey: "k19", plan: -5, model: undefined, outputProd: 1000, uphResult: 50 }));
    const r = calculateQualityScore(records);
    const by = Object.fromEntries(r.perComponent.map((c) => [c.component, c]));
    assert.equal(by.completeness.issueCount, 1);
    assert.equal(by.completeness.sampleIssues[0].type, "incomplete");
    assert.equal(by.validity.issueCount, 1);
    assert.equal(by.validity.sampleIssues[0].type, "invalid");
    assert.equal(by.duplication.issueCount, 1);
    assert.equal(by.duplication.sampleIssues[0].type, "duplicate");
    assert.equal(by.anomaly.issueCount, 1);
    assert.equal(by.anomaly.sampleIssues[0].type, "anomalous");
  });

  it("komponen null (tak dinilai) → score null, issueCount 0", () => {
    const r = calculateQualityScore([rec(), rec()]);
    const dup = r.perComponent.find((c) => c.component === "duplication");
    assert.equal(dup!.score, null);
    assert.equal(dup!.issueCount, 0);
    assert.deepEqual(dup!.sampleIssues, []);
  });

  it("list kosong → perComponent semua score null, issueCount 0", () => {
    const r = calculateQualityScore([]);
    assert.equal(r.perComponent.length, 4);
    for (const c of r.perComponent) {
      assert.equal(c.score, null);
      assert.equal(c.issueCount, 0);
    }
  });

  it("summarizeQualityComponents membatasi sampleIssues ke ISSUE_SAMPLE_LIMIT", () => {
    const issues: QualityIssue[] = Array.from({ length: 9 }, (_, i) => ({
      type: "incomplete",
      recordIndex: i,
      detail: `field kosong: model`,
    }));
    const summaries = summarizeQualityComponents(
      { completeness: 0.5, validity: 1, duplication: 1, anomaly: 1 },
      issues
    );
    const completeness = summaries.find((c) => c.component === "completeness")!;
    assert.equal(completeness.issueCount, 9);
    assert.equal(completeness.sampleIssues.length, ISSUE_SAMPLE_LIMIT);
    assert.deepEqual(completeness.sampleIssues.map((i) => i.recordIndex), [0, 1, 2, 3, 4]);
  });
});
