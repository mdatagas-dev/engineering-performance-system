import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Prisma } from "@/app/generated/prisma/client";
import { createVersionSnapshot } from "./versioning";

function mockTx() {
  const created: Record<string, unknown>[] = [];
  const tx = {
    productionRecordVersion: {
      create: async (args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return { id: "ver-1", ...args.data };
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { tx, created };
}

const SNAPSHOT = {
  date: "2026-08-12T00:00:00.000Z",
  model: "M-100",
  status: "DRAFT",
  gapUph: -10,
  upph: 2.81,
  version: 3,
};

describe("createVersionSnapshot", () => {
  it("menyimpan snapshot state record + version yang cocok + action UPDATED", async () => {
    const { tx, created } = mockTx();
    const row = await createVersionSnapshot(tx, {
      recordId: "record-1",
      version: 3,
      snapshot: SNAPSHOT,
      changedBy: "user-1",
      action: "UPDATED",
      changeReason: "Koreksi data shift",
    });

    assert.equal(created.length, 1);
    const data = created[0];
    assert.equal(data.recordId, "record-1");
    assert.equal(data.version, 3);
    assert.deepEqual(data.snapshot, SNAPSHOT);
    assert.equal(data.snapshot.version, 3, "isi snapshot memuat version yang sama");
    assert.equal(data.changedBy, "user-1");
    assert.equal(data.action, "UPDATED");
    assert.equal(data.changeReason, "Koreksi data shift");
    assert.equal(row.id, "ver-1");
  });

  it("changeReason opsional → disimpan null", async () => {
    const { tx, created } = mockTx();
    await createVersionSnapshot(tx, {
      recordId: "record-1",
      version: 2,
      snapshot: SNAPSHOT,
      changedBy: "user-1",
      action: "UPDATED",
    });
    assert.equal(created[0].changeReason, null);
  });

  it("action lain (CORRECTED) diteruskan apa adanya", async () => {
    const { tx, created } = mockTx();
    await createVersionSnapshot(tx, {
      recordId: "record-1",
      version: 4,
      snapshot: SNAPSHOT,
      changedBy: "user-2",
      action: "CORRECTED",
      changeReason: "Perbaikan kalkulasi",
    });
    assert.equal(created[0].action, "CORRECTED");
    assert.equal(created[0].version, 4);
  });
});
