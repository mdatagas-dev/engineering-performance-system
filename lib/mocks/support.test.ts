import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  announcements,
  documents,
  isIsoDate,
  trainings,
  DOCUMENT_TYPES,
  TRAINING_CATEGORIES,
  TRAINING_STATUSES,
} from "./support";

describe("documents", () => {
  it("tidak kosong dan setiap baris punya shape lengkap", () => {
    assert.ok(documents.length >= 8);
    for (const d of documents) {
      assert.ok(d.name.length > 0);
      assert.ok(DOCUMENT_TYPES.includes(d.type));
      assert.match(d.version, /^\d+\.\d+$/);
      assert.ok(d.owner.length > 0);
      assert.ok(isIsoDate(d.lastUpdate));
    }
  });

  it("berisi tiap tipe dokumen", () => {
    const types = new Set(documents.map((d) => d.type));
    for (const t of DOCUMENT_TYPES) assert.ok(types.has(t));
  });
});

describe("trainings", () => {
  it("kode unik dan shape lengkap", () => {
    const codes = new Set(trainings.map((t) => t.code));
    assert.equal(codes.size, trainings.length);
    for (const t of trainings) {
      assert.match(t.code, /^TR-\d{3}$/);
      assert.ok(t.title.length > 0);
      assert.ok(TRAINING_CATEGORIES.includes(t.category));
      assert.ok(t.durationMinutes > 0);
      assert.ok(TRAINING_STATUSES.includes(t.status));
      assert.ok(isIsoDate(t.lastUpdate));
    }
  });

  it("memuat semua status dan kategori", () => {
    const statuses = new Set(trainings.map((t) => t.status));
    const categories = new Set(trainings.map((t) => t.category));
    for (const s of TRAINING_STATUSES) assert.ok(statuses.has(s));
    for (const c of TRAINING_CATEGORIES) assert.ok(categories.has(c));
  });
});

describe("announcements", () => {
  it("id unik dan shape lengkap", () => {
    const ids = new Set(announcements.map((a) => a.id));
    assert.equal(ids.size, announcements.length);
    for (const a of announcements) {
      assert.match(a.id, /^ANN-\d{3}$/);
      assert.ok(a.title.length > 0);
      assert.ok(isIsoDate(a.date));
      assert.ok(a.author.length > 0);
      assert.equal(typeof a.pinned, "boolean");
      assert.ok(a.content.length > 0);
    }
  });

  it("minimal satu pengumuman disematkan (pinned)", () => {
    assert.ok(announcements.some((a) => a.pinned));
  });

  it("data dibekukan (frozen)", () => {
    assert.ok(Object.isFrozen(announcements));
    assert.ok(Object.isFrozen(announcements[0]));
  });
});

describe("isIsoDate", () => {
  it("valid format YYYY-MM-DD", () => {
    assert.ok(isIsoDate("2026-08-14"));
    assert.ok(!isIsoDate("14-08-2026"));
    assert.ok(!isIsoDate("2026/08/14"));
    assert.ok(!isIsoDate(""));
  });
});
