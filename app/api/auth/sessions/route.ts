import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/sessions";
import { parseUserAgent } from "@/lib/auth/parse-ua";

export const dynamic = "force-dynamic";

// GET /api/auth/sessions — daftar sesi AKTIF milik user yang login
// (feature "Manajemen Sesi", phase 5 backend). Auth: proxy.ts (path di luar
// PUBLIC_API_PATHS) — sesi valid cukup, tanpa permission khusus; "per
// pengguna" = hanya sesi dengan userId = session.sub.
//
// Filter sesi aktif: isRevoked=false DAN expiresAt > now (sesi revoked/
// kedaluwarsa tidak ditampilkan). Urut lastUsedAt desc (nulls last) lalu
// createdAt desc. tokenHash TIDAK dikembalikan; isCurrent = tokenHash baris
// cocok dengan token request (frontend tahu sesi mana yang dipakai sekarang).
// device/browser/os = parse userAgent via lib/auth/parse-ua.ts (regex, tanpa
// library; keputusan task tabel sesi: parse di layer API/UI).
//
// Response: { items: [...] } — tanpa pagination (jumlah sesi aktif per user
// kecil); bentuk items konsisten dengan konvensi GET /api/backups.

export async function GET() {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const session = getSession(token);
  if (!session) {
    return NextResponse.json(
      { message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const rows = await prisma.session.findMany({
    where: { userId: session.sub, isRevoked: false, expiresAt: { gt: new Date() } },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const currentHash = token ? hashToken(token) : null;
  const items = rows.map(({ tokenHash, ...row }) => ({
    ...row,
    isCurrent: tokenHash === currentHash,
    ...parseUserAgent(row.userAgent),
  }));

  return NextResponse.json({ items });
}
