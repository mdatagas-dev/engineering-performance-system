import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@/app/generated/prisma/client";
import { parseCsv } from "@/lib/imports/parse";
import { validateImportRows } from "@/lib/importer/validate";
import {
  buildExistingKeysQueries,
  collectUniqueKeys,
  existingRowToKey,
} from "@/lib/importer/duplicates";
import { deriveImportStatus, saveValidRows } from "@/lib/importer/import";
import { DUPLICATE_MESSAGE, isDuplicateKeyError, isForeignKeyError } from "@/lib/records/create";
import { badRequest, conflict, internal, unauthorized } from "@/lib/http/api-error";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Kontrak endpoint:
// - POST /api/import — multipart form-data, field "file" (CSV UTF-8) + field
//   opsional "areaId" (UUID). Hanya CSV (format "Excel" antar muka): ekstensi
//   .xlsx/.xls ditolak 415 (tanpa library parsing Excel), file > 1MB ditolak
//   413, file tanpa kolom input dikenali → 400.
// - Pipeline: file → parseCsv → validateImportRows (duplikat 2 lapis: antar
//   baris file + terhadap DB existing) → $transaction: create ImportHistory
//   (status SUCCESS/PARTIAL/FAILED + laporan errors Json) → createMany record
//   valid (DRAFT v1, importHistoryId link) → 1 audit IMPORT_COMPLETED.
// - validCount = 0 → TETAP mencatat riwayat status FAILED + 201: laporan
//   per-baris harus tersedia utk UI (pola mock frontend — "failed" masuk
//   riwayat), tidak ada record yang disimpan.
// - Duplikat DB level-kunci TIDAK hard-stop file: baris bentrok masuk daftar
//   error (PARTIAL). Race antar-request serentak ditangkap unique constraint
//   → 409.
const MAX_IMPORT_FILE_BYTES = 1_000_000;
const XLSX_EXTENSIONS = [".xlsx", ".xls"];

export async function POST(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest('Unggah file sebagai multipart form-data dengan field "file".');
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return badRequest("Body multipart tidak valid.");
  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest('Field "file" wajib berupa file CSV.');

  const fileName = file.name || "import.csv";
  const lowerName = fileName.toLowerCase();
  if (XLSX_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      {
        message:
          "Format Excel .xlsx/.xls tidak didukung — gunakan CSV UTF-8 (unduh Template Impor lalu simpan sebagai CSV).",
      },
      { status: 415 }
    );
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return NextResponse.json(
      { message: "File terlalu besar — maksimal 1 MB." },
      { status: 413 }
    );
  }

  const areaIdRaw = formData.get("areaId");
  let areaId: string | null = null;
  if (typeof areaIdRaw === "string" && areaIdRaw.trim() !== "") {
    if (!UUID_RE.test(areaIdRaw.trim())) return badRequest("areaId tidak valid.");
    areaId = areaIdRaw.trim();
  } else if (areaIdRaw instanceof File) {
    return badRequest("Field areaId harus berupa teks (UUID), bukan file.");
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (parsed.rows.length === 0) {
    return badRequest("File tidak berisi baris data — periksa kembali file CSV.");
  }

  const uniqueKeys = collectUniqueKeys(
    parsed.rows.map((r) => ({
      index: r.index,
      date: r.values.date ?? "",
      model: r.values.model ?? "",
      shift: r.values.shift ?? "",
      areaId,
    }))
  );
  const existingKeys = new Set<string>();
  for (const where of buildExistingKeysQueries(uniqueKeys)) {
    const found = await prisma.productionRecord.findMany({
      where,
      select: { date: true, model: true, shift: true, areaId: true },
    });
    for (const row of found) existingKeys.add(existingRowToKey(row));
  }

  const validation = validateImportRows(parsed.rows, { delimiter: parsed.delimiter, areaId, existingKeys });
  const status = deriveImportStatus(validation.validCount, validation.errorCount);

  try {
    const history = await prisma.$transaction(async (tx) => {
      const created = await tx.importHistory.create({
        data: {
          fileName,
          rowsTotal: validation.totalCount,
          rowsValid: validation.validCount,
          rowsSkipped: validation.errorCount,
          status,
          errors:
            validation.errors.length > 0
              ? (validation.errors as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          importedBy: session.sub,
        },
        select: { id: true },
      });

      if (validation.validCount > 0) {
        await saveValidRows({
          tx,
          rows: parsed.rows,
          validation,
          delimiter: parsed.delimiter,
          areaId,
          importedBy: session.sub,
          importHistoryId: created.id,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.sub,
          action: "IMPORT_COMPLETED",
          entityType: "IMPORT_HISTORY",
          entityId: created.id,
          before: Prisma.JsonNull,
          after: {
            fileName,
            rowsTotal: validation.totalCount,
            rowsValid: validation.validCount,
            rowsSkipped: validation.errorCount,
            status,
          } as Prisma.InputJsonValue,
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent"),
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        historyId: history.id,
        summary: {
          fileName,
          rowsTotal: validation.totalCount,
          rowsValid: validation.validCount,
          rowsSkipped: validation.errorCount,
          status,
          errorsList: validation.errors,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    // backup race duplicate (kunci unik antar-import serentak) + FK areaId
    if (isDuplicateKeyError(err)) return conflict(DUPLICATE_MESSAGE);
    if (isForeignKeyError(err)) return badRequest("areaId tidak valid.");
    return internal("Gagal menyimpan impor.", err);
  }
}