import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { getSession, requirePermission } from "@/lib/auth/session";
import {
  BRUTE_FORCE_CONFIG_KEY,
  loadSecurityConfig,
  validateSecurityConfigUpdate,
  type BruteForceConfig,
} from "@/lib/brute-force/config";
import { getClientIp } from "@/lib/auth/request-ip";

export const dynamic = "force-dynamic";

const INVALID_MESSAGE = "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";
const FORBIDDEN_MESSAGE = "Anda tidak memiliki izin untuk mengakses resource ini.";

// Proxy (proxy.ts) BELUM punya rule /^\/api\/security-config$/ — tanpa rule,
// semua sesi valid lolos proxy. Guard manual di sini menutup celah itu:
// permission user.manage (sama tier dengan /api/users & halaman settings/
// security yang memakai useSessionGuard("user.manage")).
function sessionGuard(token?: string) {
  const session = getSession(token);
  if (!session) {
    return { session: null, error: { message: INVALID_MESSAGE, status: 401 } };
  }
  if (!requirePermission(session, "user.manage")) {
    return { session: null, error: { message: FORBIDDEN_MESSAGE, status: 403 } };
  }
  return { session, error: null };
}

const configDeps = {
  findRows: () =>
    prisma.securityConfig.findMany({
      select: { key: true, value: true, updatedAt: true, updatedBy: true },
    }),
};

export async function GET() {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const { error } = sessionGuard(token);
  if (error) return NextResponse.json({ message: error.message }, { status: error.status });

  // {config} selalu lengkap (merge default + clamp); updatedAt/updatedBy null
  // bila tabel kosong (murni default AUTH_CONFIG).
  const { config, updatedAt, updatedBy } = await loadSecurityConfig(configDeps);
  return NextResponse.json({ config, updatedAt, updatedBy });
}

export async function PUT(req: Request) {
  const token = (await cookies()).get(AUTH_CONFIG.cookieName)?.value;
  const { session, error } = sessionGuard(token);
  if (error) return NextResponse.json({ message: error.message }, { status: error.status });

  const body = await req.json().catch(() => null);
  const validation = validateSecurityConfigUpdate(body);
  if (!validation.ok) {
    return NextResponse.json({ message: validation.message }, { status: 400 });
  }
  if (Object.keys(validation.data).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada field yang dapat diubah." },
      { status: 400 }
    );
  }

  const previous = await loadSecurityConfig(configDeps);
  const after: BruteForceConfig = { ...previous.config, ...validation.data };
  // invariant cap >= base setelah merge (base berubah tanpa cap ikut diubah).
  if (after.lockoutMaxMs < after.lockoutBaseMs) after.lockoutMaxMs = after.lockoutBaseMs;

  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.securityConfig.upsert({
      where: { key: BRUTE_FORCE_CONFIG_KEY },
      create: {
        key: BRUTE_FORCE_CONFIG_KEY,
        value: after,
        updatedBy: session.sub,
      },
      update: {
        value: after,
        updatedBy: session.sub,
      },
      select: { id: true, updatedAt: true },
    });
    await tx.auditLog.create({
      data: {
        userId: session.sub,
        action: "SECURITY_CONFIG_UPDATED",
        entityType: "SECURITY_CONFIG",
        entityId: saved.id,
        before: previous.config,
        after,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    });
    return saved;
  });

  return NextResponse.json(
    { config: after, updatedAt: row.updatedAt, updatedBy: session.sub, message: "Pengaturan keamanan berhasil disimpan." },
    { status: 200 }
  );
}

export async function POST() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau PUT." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau PUT." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Method tidak diizinkan. Gunakan GET atau PUT." },
    { status: 405 }
  );
}