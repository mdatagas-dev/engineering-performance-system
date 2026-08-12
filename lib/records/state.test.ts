import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RECORDS_STORAGE_KEY,
  addRecord,
  applyRecordPatch,
  createRecordsStore,
  removeRecordById,
} from "./state";
import { calculateCalculated } from "./calculate";
import type { MockProductionRecord } from "@/lib/mocks/records";

function rec(id: string, over: Partial<MockProductionRecord> = {}): MockProductionRecord {
  return {
    id,
    date: "2026-08-12",
    model: "LV-3000",
    shift: "1",
    area: null,
    uphTarget: 90,
    uphResult: 90,
    hcStandard: 30,
    hcActual: 32,
    plan: 960,
    outputProd: 1000,
    totalSetup: 12,
    workingHour: 8,
    totalSetupPacking: 6,
    workingHourPacking: 2,
    status: "DRAFT" as MockProductionRecord["status"],
    version: 1,
    createdByName: "x",
    gapUph: 0,
    gapHc: 2,
    gapOp: 40,
    upph: 2.81,
    ...over,
  };
}

function fakeStorage(seed: string | null = null): { storage: Storage; get: () => string | null } {
  const map = new Map<string, string>();
  if (seed !== null) map.set(RECORDS_STORAGE_KEY, seed);
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    key: (i: number) => [...map.keys()][i] ?? null,
    length: map.size,
    clear: () => map.clear(),
  } satisfies Storage;
  return { storage, get: () => map.get(RECORDS_STORAGE_KEY) ?? null };
}

describe("reducers murni", () => {
  it("addRecord: tambah di depan & id kembar diganti", () => {
    const a = rec("a");
    assert.equal(addRecord([a], rec("b"))[0].id, "b");
    const replaced = addRecord([a], rec("a", { model: "LV-5000" }));
    assert.equal(replaced.length, 1);
    assert.equal(replaced[0].model, "LV-5000");
  });

  it("removeRecordById", () => {
    assert.deepEqual(
      removeRecordById([rec("a"), rec("b")], "a").map((r) => r.id),
      ["b"]
    );
  });

  it("applyRecordPatch: patch angka non-negatif diterapkan; sih invalid diabaikan", () => {
    const [r] = applyRecordPatch([rec("a")], "a", { uphResult: 100, plan: -5, outputProd: "abc", hcActual: Infinity });
    assert.equal(r?.uphResult, 100);
    assert.equal(r?.plan, 960);
    assert.equal(r?.outputProd, 1000);
    assert.equal(r?.hcActual, 32);
  });

  it("applyRecordPatch: field kalkulasi berubah → gap*/upph dihitung ulang via calculateCalculated", () => {
    const [r] = applyRecordPatch([rec("a")], "a", { uphResult: 100, hcActual: 40, outputProd: 1100 });
    assert.ok(r);
    const calc = calculateCalculated({ uphTarget: 90, uphResult: 100, hcStandard: 30, hcActual: 40, plan: 960, outputProd: 1100 });
    assert.equal(r.gapUph, calc.gapUph); // 10
    assert.equal(r.gapHc, calc.gapHc); // 10
    assert.equal(r.gapOp, calc.gapOp); // 140
    assert.equal(r.upph, calc.upph); // 2.5
  });

  it("applyRecordPatch: patch non-kalkulasi (totalSetup/model) TIDAK mengubah calculated", () => {
    const [r] = applyRecordPatch([rec("a")], "a", { totalSetup: 99, model: "LV-9000" });
    assert.ok(r);
    assert.equal(r.totalSetup, 99);
    assert.equal(r.gapUph, 0);
    assert.equal(r.upph, 2.81);
  });
});

describe("createRecordsStore", () => {
  it("inisialisasi dari localStorage eps_mock_records", () => {
    const { storage } = fakeStorage(JSON.stringify([rec("a")]));
    const store = createRecordsStore({ storage });
    assert.deepEqual(store.getRecords().map((r) => r.id), ["a"]);
  });

  it("setRecords/add/remove/update → notify subscriber & persist", () => {
    const { storage, get } = fakeStorage();
    const store = createRecordsStore({ storage });
    let notified = 0;
    const unsub = store.subscribe(() => notified++);

    store.add(rec("a"));
    store.add(rec("b", { model: "LV-5000" }));
    assert.equal(notified, 2);
    assert.equal(store.getRecords().length, 2);
    assert.ok(get()?.includes("LV-5000"), "tersimpan ke localStorage");

    store.update("a", { uphResult: 200, hcActual: 50 });
    assert.equal(store.getRecords().find((r) => r.id === "a")?.gapUph, 110);
    assert.ok(get()?.includes("110"), "calculated ikut tersimpan");

    store.remove("b");
    assert.deepEqual(store.getRecords().map((r) => r.id), ["a"]);

    unsub();
    store.remove("a");
    assert.equal(notified, 4);
  });

  it("tanpa storage → in-memory saja, persist no-op", () => {
    const store = createRecordsStore();
    store.add(rec("a"));
    assert.equal(store.getRecords().length, 1);
    store.persist();
    assert.equal(store.getRecords().length, 1);
  });

  it("setRecords menggantikan daftar (alur onSaved form)", () => {
    const { storage } = fakeStorage();
    const store = createRecordsStore({ storage });
    store.setRecords([rec("x1"), rec("x2")]);
    assert.equal(store.getRecords().length, 2);
    assert.deepEqual(JSON.parse(storage.getItem(RECORDS_STORAGE_KEY)!).map((r: MockProductionRecord) => r.id), ["x1", "x2"]);
  });

  it("storage korup → inisialisasi kosong (tidak crash)", () => {
    const { storage } = fakeStorage("{bukan-json");
    const store = createRecordsStore({ storage });
    assert.deepEqual(store.getRecords(), []);
  });
});