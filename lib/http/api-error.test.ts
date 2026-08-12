import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internal,
} from "./api-error";

async function readBody(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe("lib/http/api-error — bentuk respons terstandar", () => {
  it("badRequest → 400 { message }", async () => {
    const res = badRequest("Tanggal tidak valid.");
    assert.equal(res.status, 400);
    assert.deepEqual(await readBody(res), { message: "Tanggal tidak valid." });
  });

  it("badRequest dengan field errors → 400 { message, errors }", async () => {
    const res = badRequest("Validasi gagal.", { plan: ["Minimal 0"] });
    assert.equal(res.status, 400);
    assert.deepEqual(await readBody(res), {
      message: "Validasi gagal.",
      errors: { plan: ["Minimal 0"] },
    });
  });

  it("badRequest errors kosong → tanpa key errors", async () => {
    const res = badRequest("X", {});
    assert.deepEqual(await readBody(res), { message: "X" });
  });

  it("status code: 401 / 403 / 404 / 409 / 500", () => {
    assert.equal(unauthorized().status, 401);
    assert.equal(forbidden().status, 403);
    assert.equal(notFound("Record tidak ditemukan.").status, 404);
    assert.equal(conflict("Duplikat.").status, 409);
    assert.equal(internal().status, 500);
  });

  it("pesan default sesi & 403 tetap {message} konsisten", async () => {
    assert.deepEqual(await readBody(unauthorized()), {
      message: "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.",
    });
    assert.deepEqual(await readBody(forbidden()), {
      message: "Anda tidak memiliki izin untuk mengakses resource ini.",
    });
  });

  it("internal tidak membocorkan cause/stack ke client", async () => {
    const res = internal("Gagal menyimpan record.", new Error("detail rahasia"));
    assert.equal(res.status, 500);
    const body = await readBody(res);
    assert.deepEqual(body, { message: "Terjadi kesalahan internal server. Coba lagi." });
    assert.ok(!JSON.stringify(body).includes("rahasia"));
  });
});