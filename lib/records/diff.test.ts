import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { diffSnapshots, type Snapshot } from "./diff";

function snap(overrides: Record<string, unknown>): Snapshot {
  return {
    date: "2026-08-12T00:00:00.000Z",
    model: "M-100",
    shift: null,
    outputProd: 950,
    gapUph: -10,
    upph: 2.81,
    status: "DRAFT",
    version: 1,
    ...overrides,
  };
}

describe("diffSnapshots", () => {
  it("hanya field yang berubah yang masuk changes", () => {
    const a = snap({});
    const b = snap({ outputProd: 980, upph: 2.9, version: 2 });
    const changes = diffSnapshots(a, b);

    assert.equal(changes.length, 3);
    assert.deepEqual(changes.find((c) => c.field === "outputProd"), {
      field: "outputProd",
      before: 950,
      after: 980,
    });
    assert.deepEqual(changes.find((c) => c.field === "upph"), {
      field: "upph",
      before: 2.81,
      after: 2.9,
    });
    assert.deepEqual(changes.find((c) => c.field === "version"), {
      field: "version",
      before: 1,
      after: 2,
    });
  });

  it("snapshot identik → tidak ada change", () => {
    assert.deepEqual(diffSnapshots(snap({}), snap({})), []);
  });

  it("versi 1 tanpa versi sebelumnya → diff kosong", () => {
    assert.deepEqual(diffSnapshots(null, null), []);
    const changes = diffSnapshots(null, snap({}));
    assert.ok(changes.every((c) => c.before === null), "before null saat prev tidak ada");
  });

  it("tipe nilai dibandingkan ketat", () => {
    const a = snap({ plan: 900 });
    const b = snap({ plan: "900" });
    const changes = diffSnapshots(a, b);
    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0], { field: "plan", before: 900, after: "900" });
  });

  it("null dianggap sama dengan key yang tidak ada", () => {
    const a = snap({ areaId: null });
    const b = snap({});
    assert.deepEqual(diffSnapshots(a, b), []);
  });

  it("perubahan null → nilai terdeteksi", () => {
    const a = snap({ shift: null });
    const b = snap({ shift: "SHIFT_A" });
    assert.deepEqual(diffSnapshots(a, b), [{ field: "shift", before: null, after: "SHIFT_A" }]);
  });
});
