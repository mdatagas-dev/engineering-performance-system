import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionPayload = {
  sub: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
};

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export function signToken(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSeconds })
  );
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string, secret: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
