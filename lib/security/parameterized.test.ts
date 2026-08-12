import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findRawSqlUsages, PARAMETERIZED_GUARANTEES } from "./parameterized";

// Akar repo di-resolve dari lokasi file ini (lib/security/) — tidak
// bergantung pada cwd saat tsx dijalankan, tidak hardcode path absolut.
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCAN_DIRS = ["lib", "app/api"];
const SCAN_EXT = [".ts", ".tsx", ".mts"];
// File guard ini sendiri memuat literal marker (dokumentasi/deteksi) — bukan
// penggunaan; dikecualikan dari scan agar tidak self-flagging.
const GUARD_FILES = new Set([
  join(fileURLToPath(new URL(".", import.meta.url)), "parameterized.ts"),
  join(fileURLToPath(new URL(".", import.meta.url)), "parameterized.test.ts"),
]);

async function collectSourceFiles(dir: string, root: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
for (const entry of entries) {
      if (entry.name === "generated") continue;
      const full = join(dir, entry.name);
      if (GUARD_FILES.has(full)) continue;
      if (entry.isDirectory()) {
        out.push(...(await collectSourceFiles(full, root)));
      } else if (SCAN_EXT.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  return out;
}

describe("parameterized query guard", () => {
  it("dokumentasi garansi menyebut Prisma + marker terlarang", () => {
    assert.match(PARAMETERIZED_GUARANTEES.engine, /Prisma/i);
    assert.deepEqual(PARAMETERIZED_GUARANTEES.forbiddenMarkers, ["$queryRawUnsafe", "$executeRawUnsafe"]);
  });

  it("findRawSqlUsages mendeteksi marker di teks", () => {
    assert.deepEqual(findRawSqlUsages("prisma.$queryRawUnsafe`SELECT * FROM x`"), ["$queryRawUnsafe"]);
    assert.deepEqual(findRawSqlUsages("await tx.$executeRawUnsafe`DELETE`"), ["$executeRawUnsafe"]);
    assert.deepEqual(findRawSqlUsages("clean code tanpa raw"), []);
    assert.deepEqual(findRawSqlUsages(""), []);
  });

  it("TIDAK ada literal $queryRawUnsafe/$executeRawUnsafe di lib/ + app/api/", async () => {
    const files: string[] = [];
    for (const dir of SCAN_DIRS) files.push(...(await collectSourceFiles(join(REPO_ROOT, dir), REPO_ROOT)));
    assert.ok(files.length > 0, "scan harus menemukan file sumber");

    const offenders: string[] = [];
    for (const file of files) {
      const code = await readFile(file, "utf8");
      const hit = findRawSqlUsages(code);
      if (hit.length > 0) offenders.push(`${relative(REPO_ROOT, file)}: ${hit.join(", ")}`);
    }
    assert.deepEqual(offenders, [], "raw query unsafe terdeteksi — pakai $queryRaw/$executeRaw (parameterized)");
  });
});