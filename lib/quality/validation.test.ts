// Kunci perilaku validasi QualityCheck — jangan ubah tanpa menyesuaikan test.
// create: date & model wajib; update: hanya field yang disediakan divalidasi.
// Angka qty: integer >= 0 <= 1e9, passedQty + failedQty <= inspectedQty.
// defects: array maks 50 item {defectCode <=50, defectName <=100, quantity >=1}.
// Transisi status: DRAFT->SUBMITTED->APPROVED->LOCKED, LOCKED terminal.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateQualityCheckCreate,
  validateQualityCheckUpdate,
  validateStatusTransition,
} from "./validation";

const validCreate = {
  date: "2026-08-12",
  model: "M-1",
  shift: "1",
  areaId: "550e8400-e29b-41d4-a716-446655440000",
  inspectedQty: 100,
  passedQty: 95,
  failedQty: 5,
  defectCount: 3,
  defects: [{ defectCode: "A", defectName: "Scratch", quantity: 2 }],
};

const validDefect = (over: Record<string, unknown> = {}) => ({
  defectCode: "A",
  defectName: "Scratch",
  quantity: 2,
  ...over,
});

describe("validateQualityCheckCreate", () => {
  it("menerima body valid", () => {
    assert.equal(validateQualityCheckCreate(validCreate), null);
  });

  it("menolak body non-objek", () => {
    for (const bad of [null, "abc", 42, [1, 2]]) {
      const e = validateQualityCheckCreate(bad);
      assert.notEqual(e, null, `harus tolak ${String(bad)}`);
    }
  });

  it("date wajib", () => {
    const e = validateQualityCheckCreate({ ...validCreate, date: undefined });
    assert.match(e ?? "", /date wajib/);
  });

  it("date format ketat YYYY-MM-DD ditolak (cegah parse lenient JS)", () => {
    for (const bad of ["12/08/2026", "2026", "2026-08", "0", "2026-08-12T00:00:00Z"]) {
      assert.match(validateQualityCheckCreate({ ...validCreate, date: bad }) ?? "", /date/, `harus tolak ${bad}`);
    }
  });

  it("tanggal kalender invalid ditolak (2026-02-30)", () => {
    assert.match(validateQualityCheckCreate({ ...validCreate, date: "2026-02-30" }) ?? "", /date/);
  });

  it("model wajib non-empty dan maksimal 100 karakter", () => {
    assert.match(validateQualityCheckCreate({ ...validCreate, model: "" }) ?? "", /model/);
    assert.match(validateQualityCheckCreate({ ...validCreate, model: "   " }) ?? "", /model/);
    assert.match(validateQualityCheckCreate({ ...validCreate, model: undefined }) ?? "", /model/);
    assert.match(validateQualityCheckCreate({ ...validCreate, model: "m".repeat(101) }) ?? "", /model/);
    assert.equal(validateQualityCheckCreate({ ...validCreate, model: "m".repeat(100) }), null);
  });

  it("shift optional string maksimal 20 karakter", () => {
    assert.match(validateQualityCheckCreate({ ...validCreate, shift: "s".repeat(21) }) ?? "", /shift/);
    assert.equal(validateQualityCheckCreate({ ...validCreate, shift: "s".repeat(20) }), null);
    assert.equal(validateQualityCheckCreate({ ...validCreate, shift: undefined }), null);
  });

  it("areaId optional UUID", () => {
    assert.match(validateQualityCheckCreate({ ...validCreate, areaId: "bukan-uuid" }) ?? "", /areaId/);
    assert.match(validateQualityCheckCreate({ ...validCreate, areaId: "550e8400e29b41d4a716446655440000" }) ?? "", /areaId/);
    assert.equal(validateQualityCheckCreate({ ...validCreate, areaId: undefined }), null);
  });

  it("qty harus integer non-negatif <= 1e9", () => {
    for (const f of ["inspectedQty", "passedQty", "failedQty", "defectCount"]) {
      assert.match(validateQualityCheckCreate({ ...validCreate, [f]: -1 }) ?? "", /(Qty|defectCount)/i, `${f} negatif`);
      assert.match(validateQualityCheckCreate({ ...validCreate, [f]: 1.5 }) ?? "", /(Qty|defectCount)/i, `${f} pecahan`);
      assert.match(validateQualityCheckCreate({ ...validCreate, [f]: Number.NaN }) ?? "", /(Qty|defectCount)/i, `${f} NaN`);
      assert.match(validateQualityCheckCreate({ ...validCreate, [f]: 1e9 + 1 }) ?? "", /(Qty|defectCount)/i, `${f} > 1e9`);
      assert.match(validateQualityCheckCreate({ ...validCreate, [f]: "100" }) ?? "", /(Qty|defectCount)/i, `${f} string`);
      assert.equal(validateQualityCheckCreate({ ...validCreate, inspectedQty: 1e9, passedQty: 0, failedQty: 0, defectCount: 0, [f]: 1e9 }), null, `${f} = 1e9 diterima`);
    }
  });

  it("passedQty + failedQty <= inspectedQty", () => {
    const e = validateQualityCheckCreate({ ...validCreate, inspectedQty: 100, passedQty: 95, failedQty: 6 });
    assert.match(e ?? "", /passedQty \+ failedQty/);
    assert.equal(validateQualityCheckCreate({ ...validCreate, passedQty: 95, failedQty: 5 }), null);
  });

  it("defects optional, array maks 50 item", () => {
    assert.equal(validateQualityCheckCreate({ ...validCreate, defects: undefined }), null);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: "x" }) ?? "", /defects/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: Array.from({ length: 51 }, () => validDefect()) }) ?? "", /defects/);
    assert.equal(validateQualityCheckCreate({ ...validCreate, defects: Array.from({ length: 50 }, () => validDefect()) }), null);
  });

  it("item defects: defectCode & defectName wajib dengan batas panjang", () => {
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ defectCode: "" })] }) ?? "", /defectCode/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ defectCode: "c".repeat(51) })] }) ?? "", /defectCode/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ defectName: "" })] }) ?? "", /defectName/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ defectName: "n".repeat(101) })] }) ?? "", /defectName/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ quantity: 0 })] }) ?? "", /quantity/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [validDefect({ quantity: 1.5 })] }) ?? "", /quantity/);
    assert.match(validateQualityCheckCreate({ ...validCreate, defects: [null] }) ?? "", /defects\[0\]/);
  });
});

describe("validateQualityCheckUpdate", () => {
  it("menerima body kosong (semua field opsional)", () => {
    assert.equal(validateQualityCheckUpdate({}), null);
  });

  it("menerima body non-objek? tidak - tetap harus objek", () => {
    assert.notEqual(validateQualityCheckUpdate(null), null);
  });

  it("menerima field valid yang disediakan", () => {
    assert.equal(validateQualityCheckUpdate({ passedQty: 90 }), null);
    assert.equal(validateQualityCheckUpdate({ date: "2026-08-12" }), null);
    assert.equal(validateQualityCheckUpdate({ defects: [validDefect()] }), null);
  });

  it("hanya field yang disediakan divalidasi: tanpa date/model tetap valid", () => {
    assert.equal(validateQualityCheckUpdate({ shift: "2", inspectedQty: 50 }), null);
  });

  it("field invalid yang disediakan ditolak", () => {
    assert.match(validateQualityCheckUpdate({ date: "2026-02-30" }) ?? "", /date/);
    assert.match(validateQualityCheckUpdate({ model: "" }) ?? "", /model/);
    assert.match(validateQualityCheckUpdate({ inspectedQty: -1 }) ?? "", /(Qty|defectCount)/i);
    assert.match(validateQualityCheckUpdate({ areaId: "x" }) ?? "", /areaId/);
  });

  it("passedQty + failedQty <= inspectedQty (update dengan subset field)", () => {
    const e = validateQualityCheckUpdate({ inspectedQty: 50, passedQty: 60 });
    assert.match(e ?? "", /passedQty \+ failedQty/);
    assert.equal(validateQualityCheckUpdate({ inspectedQty: 50, passedQty: 50 }), null);
  });
});

describe("validateStatusTransition", () => {
  it("rantai valid: DRAFT->SUBMITTED->APPROVED->LOCKED", () => {
    assert.equal(validateStatusTransition("DRAFT", "SUBMITTED"), null);
    assert.equal(validateStatusTransition("SUBMITTED", "APPROVED"), null);
    assert.equal(validateStatusTransition("APPROVED", "LOCKED"), null);
  });

  it("lompatan tidak valid ditolak", () => {
    assert.notEqual(validateStatusTransition("DRAFT", "APPROVED"), null);
    assert.notEqual(validateStatusTransition("SUBMITTED", "LOCKED"), null);
    assert.notEqual(validateStatusTransition("DRAFT", "DRAFT"), null);
  });

  it("LOCKED terminal: semua transisi dari LOCKED ditolak", () => {
    for (const next of ["SUBMITTED", "APPROVED", "DRAFT", "LOCKED"]) {
      const e = validateStatusTransition("LOCKED", next);
      assert.match(e ?? "", /LOCKED/, `harus tolak LOCKED -> ${next}`);
    }
  });

  it("status awal tidak dikenal ditolak", () => {
    const e = validateStatusTransition("OPEN", "SUBMITTED");
    assert.match(e ?? "", /Status awal/);
  });

  it("status tujuan tidak dikenal ditolak (mismatch rule)", () => {
    assert.notEqual(validateStatusTransition("DRAFT", "REJECTED"), null);
  });
});
