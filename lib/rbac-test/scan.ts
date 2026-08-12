// Helper bersama untuk test RBAC (lib/rbac-test/**): pemindaian ringan atas
// struktur app/api (route files + handler method) dan aturan proxy.ts via
// parsing teks — TIDAK menyentuh DB (semua test dead/in-memory friendly).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const API_DIR = path.join(process.cwd(), "app", "api");
export const PROXY_FILE = path.join(process.cwd(), "proxy.ts");

export type ApiRouteFile = {
  // relatif root repo, contoh: "app/api/users/[id]/role/route.ts"
  file: string;
  // pathname konkret (parameter diganti nilai nyata), contoh: "/api/users/r1/role"
  pathname: string;
  // handler method yang diekspor (GET/POST/PUT/PATCH/DELETE)
  methods: string[];
  source: string;
};

// [x] → id konkret ("version" → "1" agar cocok rule /\d+/), sisanya "r1".
export function toConcretePath(segments: string[]): string {
  const concrete = segments.map((s) => {
    const m = s.match(/^\[(\w+)\]$/);
    if (!m) return s;
    return m[1] === "version" ? "1" : "r1";
  });
  return `/api/${concrete.join("/")}`;
}

export async function listApiRouteFiles(dir: string = API_DIR): Promise<ApiRouteFile[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: ApiRouteFile[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listApiRouteFiles(full)));
    } else if (entry.isFile() && entry.name === "route.ts") {
      const segments = path.relative(API_DIR, dir).split(path.sep).filter(Boolean);
      const source = await readFile(full, "utf8");
      const methods = [
        ...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g),
      ].map((m) => m[1]);
      results.push({
        file: path.relative(process.cwd(), full),
        pathname: toConcretePath(segments),
        methods,
        source,
      });
    }
  }
  return results;
}

export type ProxyRule = { pattern: RegExp; permissions: string[] };

export type ProxyParse = { publicPaths: string[]; rules: ProxyRule[] };

// Parse proxy.ts (source) — baca PUBLIC_API_PATHS + ROUTE_PERMISSIONS tanpa
// import file (file sedang diedit agen lain; parsing teks toleran & read-only).
export async function readProxyRules(file: string = PROXY_FILE): Promise<ProxyParse> {
  const src = await readFile(file, "utf8");

  const publicPaths: string[] = [];
  const pub = src.match(/const PUBLIC_API_PATHS = new Set\(\[([\s\S]*?)\]\)/);
  if (pub) {
    for (const m of pub[1].matchAll(/"([^"]+)"/g)) publicPaths.push(m[1]);
  }

  const rules: ProxyRule[] = [];
  // Setiap aturan adalah SATU baris: { pattern: /<regex>/, permission: … }.
  // Parser memakai scanner ber-state: melacak escape (\) dan kedalaman char
  // class ([]) sehingga penutup "/" yang ditemukan adalah terminator literal
  // sebenarnya — slash ter-escape (\/) dan slash di dalam [^/] TIDAK dianggap
  // penutup. BUG LAMA (lastIndexOf("/")) mengkolapskan /^\/api\/users$/ jadi
  // /^\/api/ sehingga semua aturan match apa pun → test coverage vakum.
  for (const line of src.split("\n")) {
    const marker = "pattern: /";
    const idx = line.indexOf(marker);
    if (idx < 0) continue;
    const start = idx + marker.length;
    let depth = 0;
    let escaped = false;
    let body: string | null = null;
    for (let i = start; i < line.length; i++) {
      const c = line[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === "[") depth++;
      else if (c === "]") depth = Math.max(0, depth - 1);
      else if (c === "/" && depth === 0) {
        body = line.slice(start, i);
        break;
      }
    }
    if (body === null) continue;
    const permissions = [...line.matchAll(/"([a-z][a-z.]*)"/g)].map((x) => x[1]);
    rules.push({ pattern: new RegExp(body), permissions });
  }

  return { publicPaths, rules };
}