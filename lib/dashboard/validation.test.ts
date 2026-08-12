import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateLayoutSave } from "./validation";

const validBody = { layout: { widgets: [{ id: "w1", x: 0, y: 0 }] } };

describe("validateLayoutSave", () => {
  it("menerima layout objek dengan default theme=null, layoutType=DASHBOARD, name=default", () => {
    const r = validateLayoutSave(validBody);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, {
        layout: validBody.layout,
        theme: null,
        layoutType: "DASHBOARD",
        name: "default",
      });
    }
  });

  it("menerima layout array", () => {
    const r = validateLayoutSave({ layout: [{ x: 0 }, { x: 1 }] });
    assert.equal(r.ok, true);
  });

  it("menolak layout null/string/angka", () => {
    for (const bad of [null, "abc", 42, undefined]) {
      const r = validateLayoutSave({ layout: bad });
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.message, /Layout wajib/);
    }
  });

  it("menolak body non-objek", () => {
    for (const bad of [null, "abc", [1, 2]]) {
      const r = validateLayoutSave(bad);
      assert.equal(r.ok, false);
    }
  });

  it("menolak theme non-objek", () => {
    for (const bad of ["dark", 7, [1]]) {
      const r = validateLayoutSave({ ...validBody, theme: bad });
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.message, /Theme/);
    }
  });

  it("menerima theme objek dan null", () => {
    assert.equal(validateLayoutSave({ ...validBody, theme: { mode: "dark" } }).ok, true);
    assert.equal(validateLayoutSave({ ...validBody, theme: null }).ok, true);
  });

  it("menolak layoutType bukan enum", () => {
    for (const bad of ["tv", "TVE", 1]) {
      const r = validateLayoutSave({ ...validBody, layoutType: bad });
      assert.equal(r.ok, false);
      if (!r.ok) assert.match(r.message, /DASHBOARD atau TV/);
    }
  });

  it("menerima layoutType TV", () => {
    const r = validateLayoutSave({ ...validBody, layoutType: "TV" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.layoutType, "TV");
  });

  it("menolak name kosong", () => {
    const r = validateLayoutSave({ ...validBody, name: "  " });
    assert.equal(r.ok, false);
  });

  it("menerima name dan trim whitespace", () => {
    const r = validateLayoutSave({ ...validBody, name: "  ops  " });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.name, "ops");
  });
});
