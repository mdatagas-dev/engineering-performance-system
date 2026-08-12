// Backfill versi awal — "Riwayat Versi Data", phase 1 backend.
// Idempotent: hanya record yang BELUM punya snapshot yang diproses
// (where versions: { none: {} }); jalan ulang aman. Per-record transaction:
// kalau mati di tengah (timeout/koneksi), re-run melanjutkan sisanya.
// Jalan: npm run backfill:versions (butuh DATABASE_URL asli).

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  createVersionSnapshot,
} from "../lib/records/versioning";
import {
  BACKFILL_ACTION,
  BACKFILL_REASON,
  buildBackfillSnapshot,
} from "../lib/records/backfill";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [records, total] = await Promise.all([
    prisma.productionRecord.findMany({
      where: { versions: { none: {} } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.productionRecord.count(),
  ]);

  let created = 0;
  for (const record of records) {
    await prisma.$transaction((tx) =>
      createVersionSnapshot(tx, {
        recordId: record.id,
        version: record.version,
        snapshot: buildBackfillSnapshot(record),
        changedBy: record.createdBy,
        action: BACKFILL_ACTION,
        changeReason: BACKFILL_REASON,
      })
    );
    created += 1;
    if (created % 100 === 0) {
      console.log(`Backfill progres: ${created}/${records.length}`);
    }
  }

  console.log(
    `Backfill selesai: ${created} dibuat, ${total - created} diskip (sudah punya snapshot). Total record: ${total}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
