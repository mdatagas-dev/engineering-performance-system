import { cookies } from "next/headers";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http/api-error";
import { buildTemplateCsv } from "@/lib/imports/csv";

export const dynamic = "force-dynamic";

// GET /api/export/template — unduh template impor: header 13 kolom INPUT
// (Date;Model;Shift;UPH Target;UPH Result;HC Standard;HC Actual;Plan;Output
// Prod;Total Setup;Working Hour;Total Setup Packing;Working Hour Packing) +
// 1 baris contoh. REUSE buildTemplateCsv() (lib/imports/csv.ts) — format
// cocok (13 kolom + contoh), tanpa adapter. GAP & UPPH dihitung otomatis saat
// impor, jadi TIDAK ada kolom calculated di template.
export async function GET() {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) return unauthorized();

  const csv = buildTemplateCsv();
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="EPS_TEMPLATE.csv"',
      "Cache-Control": "no-store",
    },
  });
}