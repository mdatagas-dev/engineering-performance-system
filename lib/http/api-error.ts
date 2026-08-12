// Helper respons error API terstandar (TASK buat-validasi-input-dan-error-
// handling-api). Bentuk konsisten: { message: string } (+ errors: Record<
// string, string[]> untuk 400 validasi). Tidak pernah membocorkan stack/error
// internal ke client — internal() meng-log via console.warn dan membalas 500
// dengan pesan generik.

import { NextResponse } from "next/server";

export type FieldErrors = Record<string, string[]>;

export const UNAUTHORIZED_MESSAGE =
  "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.";
export const FORBIDDEN_MESSAGE = "Anda tidak memiliki izin untuk mengakses resource ini.";
export const INTERNAL_MESSAGE = "Terjadi kesalahan internal server. Coba lagi.";

function respond(status: number, message: string, errors?: FieldErrors): NextResponse {
  const body: { message: string; errors?: FieldErrors } = { message };
  if (errors && Object.keys(errors).length > 0) body.errors = errors;
  return NextResponse.json(body, { status });
}

export function badRequest(message: string, errors?: FieldErrors): NextResponse {
  return respond(400, message, errors);
}

export function unauthorized(message: string = UNAUTHORIZED_MESSAGE): NextResponse {
  return respond(401, message);
}

export function forbidden(message: string = FORBIDDEN_MESSAGE): NextResponse {
  return respond(403, message);
}

export function notFound(message: string): NextResponse {
  return respond(404, message);
}

export function conflict(message: string): NextResponse {
  return respond(409, message);
}

// Pesan handler & cause TIDAK pernah dikirim ke client — internal() selalu
// membalas pesan generik; detail (termasuk stack) hanya dicatat console.warn.
export function internal(message: string = INTERNAL_MESSAGE, cause?: unknown): NextResponse {
  console.warn(`[api-error] ${message}`, cause ?? "");
  return respond(500, INTERNAL_MESSAGE);
}