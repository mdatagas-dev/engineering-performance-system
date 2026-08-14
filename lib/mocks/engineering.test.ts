import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addItem,
  bomSeed,
  changeRequestSeed,
  drawingSeed,
  improvementSeed,
  loadCollection,
  removeItem,
  saveCollection,
  storageKey,
  wisSeed,
  type BomStatus,
  type CrPriority,
  type CrStatus,
  type DrawingType,
  type ImprovementStatus,
  type WorkInstruction,
  type WiStatus,
} from "./engineering";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CODE_RE = (prefix: string) => new RegExp(`^${prefix}-\\d{3}$`);
const WI_STATUS: WiStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];
const BOM_STATUS: BomStatus[] = ["ACTIVE", "DRAFT", "OBSOLETE"];
const DRAWING_TYPES: DrawingType[] = ["ASSY", "PART", "LAYOUT"];
const CR_STATUS: CrStatus[] = ["OPEN", "IN REVIEW", "APPROVED", "REJECTED"];
const CR_PRIORITY: CrPriority[] = ["LOW", "MEDIUM", "HIGH"];
const IMP_STATUS: ImprovementStatus[] = ["IDEA", "PLANNED", "DONE"];

type StorageLike = Pick<Storage, "getItem" | "setItem">;

// Stub localStorage in-memory — dependency-free, cukup untuk uji persistensi.
function makeStorageStub(): {
  data: Map<string, string>;
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
} {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function withStorage(stub: StorageLike, fn: () => void): void {
  const globalObj = globalThis as unknown as Record<string, unknown>;
  const prev = globalObj.window;
  globalObj.window = { localStorage: stub };
  try {
    fn();
  } finally {
    globalObj.window = prev;
  }
}

describe("seed data", () => {
  it("wis: kode unik, status valid, tanggal valid", () => {
    assert.ok(wisSeed.length >= 5);
    for (const w of wisSeed) {
      assert.match(w.code, CODE_RE("WI"));
      assert.ok(w.title.length > 0);
      assert.ok(w.model.length > 0);
      assert.ok(w.revision.length > 0);
      assert.ok(WI_STATUS.includes(w.status));
      assert.match(w.lastUpdate, DATE_RE);
    }
    const codes = new Set(wisSeed.map((w) => w.code));
    assert.equal(codes.size, wisSeed.length);
  });

  it("boms: kode unik, jumlah part positif, revisi angka", () => {
    assert.ok(bomSeed.length >= 5);
    for (const b of bomSeed) {
      assert.match(b.code, CODE_RE("BOM"));
      assert.ok(b.product.length > 0);
      assert.ok(b.partCount > 0);
      assert.ok(Number.isInteger(b.revision) && b.revision >= 1);
      assert.ok(BOM_STATUS.includes(b.status));
      assert.match(b.lastUpdate, DATE_RE);
    }
    const codes = new Set(bomSeed.map((b) => b.code));
    assert.equal(codes.size, bomSeed.length);
  });

  it("drawings: kode unik, tipe valid, revisi huruf", () => {
    assert.ok(drawingSeed.length >= 5);
    for (const d of drawingSeed) {
      assert.match(d.code, CODE_RE("DWG"));
      assert.ok(d.title.length > 0);
      assert.ok(d.model.length > 0);
      assert.ok(DRAWING_TYPES.includes(d.type));
      assert.ok(d.revision.length > 0);
      assert.match(d.lastUpdate, DATE_RE);
    }
    const codes = new Set(drawingSeed.map((d) => d.code));
    assert.equal(codes.size, drawingSeed.length);
  });

  it("changeRequests: kode unik, status dan prioritas valid", () => {
    assert.ok(changeRequestSeed.length >= 5);
    for (const cr of changeRequestSeed) {
      assert.match(cr.code, CODE_RE("CR"));
      assert.ok(cr.title.length > 0);
      assert.ok(cr.requester.length > 0);
      assert.match(cr.date, DATE_RE);
      assert.ok(CR_STATUS.includes(cr.status));
      assert.ok(CR_PRIORITY.includes(cr.priority));
    }
    const codes = new Set(changeRequestSeed.map((cr) => cr.code));
    assert.equal(codes.size, changeRequestSeed.length);
  });

  it("improvements: kode unik, kategori dan status valid", () => {
    assert.ok(improvementSeed.length >= 5);
    for (const imp of improvementSeed) {
      assert.match(imp.code, CODE_RE("IMP"));
      assert.ok(imp.title.length > 0);
      assert.ok(imp.area.length > 0);
      assert.ok(imp.category.length > 0);
      assert.ok(IMP_STATUS.includes(imp.status));
      assert.match(imp.date, DATE_RE);
      assert.ok(imp.owner.length > 0);
    }
    const codes = new Set(improvementSeed.map((imp) => imp.code));
    assert.equal(codes.size, improvementSeed.length);
  });

  it("seed tidak termutasi oleh salinan loadCollection", () => {
    const copy = loadCollection("wis", wisSeed);
    copy.push({ ...wisSeed[0], code: "WI-999" });
    assert.equal(wisSeed.length, 8);
  });
});

describe("store API", () => {
  it("loadCollection tanpa storage mengembalikan salinan seed", () => {
    withStorage({ getItem: () => null, setItem: () => {} }, () => {
      const items = loadCollection("wis", wisSeed);
      assert.equal(items.length, wisSeed.length);
      assert.notEqual(items, wisSeed);
      assert.deepEqual(items, [...wisSeed]);
    });
  });

  it("loadCollection fallback ke seed saat JSON rusak", () => {
    withStorage({ getItem: () => "{bukan-json", setItem: () => {} }, () => {
      assert.deepEqual(loadCollection("wis", wisSeed), [...wisSeed]);
    });
  });

  it("saveCollection + loadCollection roundtrip", () => {
    withStorage(makeStorageStub(), () => {
      const items: WorkInstruction[] = [
        { code: "WI-901", title: "A", model: "M1", revision: "A", status: "ACTIVE", lastUpdate: "2026-08-15" },
        { code: "WI-902", title: "B", model: "M1", revision: "B", status: "DRAFT", lastUpdate: "2026-08-15" },
      ];
      saveCollection("wis", items);
      assert.deepEqual(loadCollection("wis", wisSeed), items);
    });
  });

  it("addItem menambah di akhir dan persist", () => {
    withStorage(makeStorageStub(), () => {
      const before = loadCollection("wis", wisSeed);
      const item: WorkInstruction = {
        code: "WI-999",
        title: "Uji Tambah",
        model: "AN-05CDG",
        revision: "A.00",
        status: "DRAFT",
        lastUpdate: "2026-08-15",
      };
      const next = addItem("wis", item);
      assert.equal(next.length, before.length + 1);
      assert.equal(next[next.length - 1], item);
      const reloaded = loadCollection("wis", wisSeed);
      assert.equal(reloaded.length, before.length + 1);
      assert.deepEqual(reloaded[reloaded.length - 1], item);
    });
  });

  it("removeItem menghapus berdasarkan code dan persist", () => {
    withStorage(makeStorageStub(), () => {
      const before = loadCollection("wis", wisSeed);
      const after = removeItem("wis", "WI-001");
      assert.equal(after.length, before.length - 1);
      assert.ok(!after.some((w) => w.code === "WI-001"));
      assert.ok(!loadCollection("wis", wisSeed).some((w) => w.code === "WI-001"));
    });
  });

  it("removeItem id tak dikenal tidak mengubah isi", () => {
    withStorage(makeStorageStub(), () => {
      const before = loadCollection("wis", wisSeed);
      assert.deepEqual(removeItem("wis", "WI-NOPE"), [...before]);
    });
  });

  it("storage key memakai prefix eps_mock_", () => {
    assert.equal(storageKey("wis"), "eps_mock_wis");
    assert.equal(storageKey("boms"), "eps_mock_boms");
    assert.equal(storageKey("drawings"), "eps_mock_drawings");
    assert.equal(storageKey("changeRequests"), "eps_mock_changeRequests");
    assert.equal(storageKey("improvements"), "eps_mock_improvements");
  });
});
