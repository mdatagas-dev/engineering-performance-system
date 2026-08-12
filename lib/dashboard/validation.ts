import type { Prisma } from "@/app/generated/prisma/client";

export type LayoutSaveData = {
  layout: Prisma.InputJsonValue;
  theme: Prisma.InputJsonValue | null;
  layoutType: "DASHBOARD" | "TV";
  name: string;
};

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; message: string };
export type LayoutSaveResult = Ok<LayoutSaveData> | Fail;

const LAYOUT_TYPES = ["DASHBOARD", "TV"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateLayoutSave(body: unknown): LayoutSaveResult {
  if (!isRecord(body)) {
    return { ok: false, message: "Body harus berupa objek JSON." };
  }
  if (body.layout === undefined || typeof body.layout !== "object" || body.layout === null) {
    return { ok: false, message: "Layout wajib diisi dan harus berupa objek atau array." };
  }

  const data: LayoutSaveData = {
    layout: body.layout,
    theme: null,
    layoutType: "DASHBOARD",
    name: "default",
  };

  if (body.theme !== undefined) {
    if (body.theme !== null && !isRecord(body.theme)) {
      return { ok: false, message: "Theme harus berupa objek." };
    }
    data.theme = body.theme === null ? null : (body.theme as Prisma.InputJsonValue);
  }

  if (body.layoutType !== undefined) {
    if (
      typeof body.layoutType !== "string" ||
      !(LAYOUT_TYPES as readonly string[]).includes(body.layoutType)
    ) {
      return { ok: false, message: "layoutType harus DASHBOARD atau TV." };
    }
    data.layoutType = body.layoutType as LayoutSaveData["layoutType"];
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return { ok: false, message: "Nama layout harus berupa string yang tidak kosong." };
    }
    data.name = body.name.trim();
  }

  return { ok: true, data };
}
