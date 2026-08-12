import { NextResponse } from "next/server";
import { calculateQualityScore } from "@/lib/datastore/qualityScore";
import { validateQualityScoreBody } from "@/lib/datastore/qualityScoreValidation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const validated = validateQualityScoreBody(body);
  if (!validated.ok) {
    return NextResponse.json({ message: validated.message }, { status: 400 });
  }

  const result = calculateQualityScore(validated.data);
  return NextResponse.json({
    ...result,
    message: "Skor kualitas data berhasil dihitung.",
  });
}
