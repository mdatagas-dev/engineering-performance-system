import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@/app/generated/prisma/client";
import { ImportStatus, RecordStatus } from "@/app/generated/prisma/enums";
import { parseCsv } from "@/lib/imports/parse";
import { validateImportRows } from "./validate";
import {
  buildImportedRecordData,
  deriveImportStatus,
  saveValidRows,
  type SaveValidRowsResult,
} from "./import";

const HEADER =
  "Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing";

function parseLines(lines: string[]): ReturnType<typeof parseCsv>["rows"] {
  return parseCsv([HEADER, ...lines].join("\n")).rows;
}

function fakeTx(): Prisma.TransactionClient {
  return {
    productionRecord: {
      createMany: async (args: { data: unknown[] }) => ({ count: args.data.length }),
    },
  } as unknown as Prisma.TransactionClient;
}

describe("buildImportedRecordData", () => {
  it("nilai parse + calculated dihitung ulang + status DRAFT + version 1 + link impor", () => {
    const row = parseLines(["2026-08-12;LV-3000;1;90;95;30;32;960;1000;12;8;6;2"])[0];
    const data = buildImportedRecordData({ row, delimiter: ";", areaId: "p1", importedBy: "u1", importHistoryId: "h1" });
    assert.equal(data.model, "LV-3000");
    assert.equal(data.shift, "1");
    assert.equal(data.areaId, "p1");
    assert.equal(data.uphResult, 95);
    assert.equal(data.outputProd, 1000);
    assert.equal(data.gapUph, 5);
    assert.equal(data.gapHc, 2);
    assert.equal(data.gapOp, 40);
    assert.equal(data.upph, 2.97);
    assert.equal(data.status, RecordStatus.DRAFT);
    assert.equal(data.version, 1);
    assert.equal(data.createdBy, "u1");
    assert.equal(data.importHistoryId, "h1");
    assert.equal(new Date(data.date).toISOString().slice(0, 10), "2026-08-12");
  });

  it("UPPH null (HC Actual 0) disimpan 0 (schema NOT NULL)", () => {
    const row = parseLines(["2026-08-12;LV-3000;;90;90;0;0;960;1000;12;8;6;2"])[0];
    const data = buildImportedRecordData({ row, delimiter: ";", areaId: null, importedBy: "u1", importHistoryId: "h1" });
    assert.equal(data.upph, 0);
    assert.equal(data.shift, null);
    assert.equal(data.areaId, null);
  });
});

describe("deriveImportStatus", () => {
  it("0 valid → FAILED; sebagian → PARTIAL; semua → SUCCESS", () => {
    assert.equal(deriveImportStatus(0, 5), ImportStatus.FAILED);
    assert.equal(deriveImportStatus(3, 2), ImportStatus.PARTIAL);
    assert.equal(deriveImportStatus(5, 0), ImportStatus.SUCCESS);
  });
});

describe("saveValidRows", () => {
  it("createMany dipanggil sekali utk baris valid; baris error dilaporkan", async () => {
    const rows = parseLines([
      "2026-08-12;LV-3000;1;90;90;30;32;960;1000;12;8;6;2",
      "2026-08-13;LV-4000;1;80;85;28;29;800;832;10;8;5;2",
      "2026-02-30;LV-5000;1;70;70;25;26;700;700;9;8;5;2",
    ]);
    const validation = validateImportRows(rows, { delimiter: ";" });
    const tx = fakeTx();

    let createManyCalls = 0;
    const countingTx = {
      ...tx,
      productionRecord: {
        createMany: async (args: { data: unknown[] }) => {
          createManyCalls++;
          assert.equal(args.data.length, 2);
          return { count: 2 };
        },
      },
    } as unknown as Prisma.TransactionClient;

    const result: SaveValidRowsResult = await saveValidRows({
      tx: countingTx,
      rows,
      validation,
      delimiter: ";",
      areaId: null,
      importedBy: "u1",
      importHistoryId: "h1",
    });
    assert.equal(createManyCalls, 1);
    assert.equal(result.valid, 2);
    assert.equal(result.skipped, 1);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].rowIndex, 4);
  });

  it("tanpa baris valid createMany tidak dipanggil", async () => {
    const rows = parseLines(["2026-02-31;LV-5000;1;70;70;25;26;700;700;9;8;5;2"]);
    const validation = validateImportRows(rows, { delimiter: ";" });
    let calls = 0;
    const tx = {
      productionRecord: {
        createMany: async () => {
          calls++;
          return { count: 0 };
        },
      },
    } as unknown as Prisma.TransactionClient;

    await saveValidRows({ tx, rows, validation, delimiter: ";", areaId: null, importedBy: "u1", importHistoryId: "h1" });
    assert.equal(calls, 0);
  });
});