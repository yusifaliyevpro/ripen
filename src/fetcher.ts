import { readFileSync } from "fs";
import { join } from "path";
import { execa } from "execa";
import type { PackageManager, OutdatedPackage, FetchResult } from "./types";
import { isNewerVersion } from "./registry";
import { parseBaseVersion } from "./lib/versions";

type DepEntry = {
  name: string;
  current: string;
  prefix: string;
  type: "dependencies" | "devDependencies";
};

function readPackageJsonDeps(cwd: string): DepEntry[] {
  const raw = readFileSync(join(cwd, "package.json"), "utf-8");
  const pkg = JSON.parse(raw);
  const entries: DepEntry[] = [];

  for (const [depType, section] of [
    ["dependencies", pkg.dependencies],
    ["devDependencies", pkg.devDependencies],
  ] as const) {
    if (!section || typeof section !== "object") continue;
    for (const [name, range] of Object.entries(section)) {
      if (typeof range !== "string") continue;
      const parsed = parseBaseVersion(range);
      if (parsed) {
        entries.push({ name, current: parsed.version, prefix: parsed.prefix, type: depType });
      }
    }
  }

  return entries;
}

async function fetchLatestWithRetry(packageName: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      return data.version ?? null;
    } catch {
      if (attempt === 2) return null;
    }
  }
  return null;
}

async function fetchAllLatest(
  names: string[],
  concurrency: number,
  onLine?: (line: string) => void,
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < names.length) {
      const i = index++;
      const name = names[i];
      onLine?.(`Checking ${name} (${completed + 1}/${names.length})...`);
      results.set(name, await fetchLatestWithRetry(name));
      completed++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, () => worker()));
  return results;
}

export async function getOutdatedPackages(
  manager: PackageManager,
  cwd: string,
  global = false,
  onLine?: (line: string) => void,
  showAll = false,
): Promise<FetchResult> {
  // Global mode: use manager's outdated command
  if (global) {
    return getGlobalOutdatedPackages(manager, cwd, onLine);
  }

  // Local mode: read package.json + check npm registry
  let deps: DepEntry[];
  try {
    deps = readPackageJsonDeps(cwd);
  } catch {
    return { ok: false, error: "Could not read package.json" };
  }

  if (deps.length === 0) {
    return { ok: true, packages: [] };
  }

  const latestVersions = await fetchAllLatest(
    deps.map((d) => d.name),
    8,
    onLine,
  );

  // If ALL fetches failed, it's likely a network issue
  const allFailed = [...latestVersions.values()].every((v) => v === null);
  if (allFailed && deps.length > 0) {
    return { ok: false, error: "Could not reach the npm registry. Check your internet connection." };
  }

  const packages: OutdatedPackage[] = [];
  for (const dep of deps) {
    const latest = latestVersions.get(dep.name);
    if (!latest) continue;
    if (!showAll && !isNewerVersion(dep.current, latest)) continue;

    packages.push({
      name: dep.name,
      current: dep.current,
      wanted: latest,
      latest,
      dependent: "",
      type: dep.type,
      selected: false,
      targetVersion: latest,
      rangePrefix: dep.prefix,
    });
  }

  return { ok: true, packages };
}

/** Global mode: shell out to manager's outdated command */
async function getGlobalOutdatedPackages(
  manager: PackageManager,
  cwd: string,
  onLine?: (line: string) => void,
): Promise<FetchResult> {
  const args = ["outdated", "--global", "--json"];

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const proc = execa(manager, args, { cwd, reject: false });

    if (onLine) {
      const forwardWarnings = (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && /^\s*(WARN|ERR!|npm warn|npm error)/i.test(trimmed)) {
            onLine(trimmed);
          }
        }
      };
      proc.stderr?.on("data", forwardWarnings);
      proc.stdout?.on("data", forwardWarnings);
    }

    const result = await proc;
    stdout = result.stdout;
    stderr = result.stderr;
    exitCode = result.exitCode!;
  } catch (err: any) {
    return { ok: false, error: `Could not run ${manager}: ${err.message ?? err}` };
  }

  const isExpectedExit = exitCode === 0 || exitCode === 1;
  if (!isExpectedExit) {
    const msg = stderr.trim() || `${manager} outdated exited with code ${exitCode}`;
    return { ok: false, error: msg };
  }

  const raw = stdout.trim();
  if (!raw) return { ok: true, packages: [] };

  if (manager === "yarn") {
    try {
      return { ok: true, packages: parseYarnOutdated(raw, true) };
    } catch {
      return { ok: false, error: "Failed to parse yarn outdated output. Try again." };
    }
  }

  const jsonStr = extractJson(raw);
  if (!jsonStr) {
    const errMsg = stderr.trim() || raw.slice(0, 120);
    return { ok: false, error: errMsg };
  }

  try {
    const data = JSON.parse(jsonStr);
    const packages = manager === "pnpm" ? parsePnpmOutdated(data) : parseNpmOutdated(data);
    return { ok: true, packages };
  } catch {
    return { ok: false, error: "Failed to parse outdated output. Try again." };
  }
}

/**
 * Extract the first top-level JSON object from a string that may contain
 * non-JSON lines (e.g. pnpm WARN messages) before or after the JSON.
 */
function extractJson(raw: string): string | null {
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    else if (raw[i] === "}") depth--;
    if (depth === 0) return raw.slice(start, i + 1);
  }
  return null;
}

function parsePnpmOutdated(data: any): OutdatedPackage[] {
  if (Array.isArray(data) || typeof data !== "object") return [];
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    current: info.current ?? "N/A",
    wanted: info.wanted ?? info.latest,
    latest: info.latest,
    dependent: "",
    type: "global" as const,
    selected: false,
    targetVersion: info.latest,
  }));
}

function parseNpmOutdated(data: any): OutdatedPackage[] {
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    current: info.current ?? "N/A",
    wanted: info.wanted ?? info.latest,
    latest: info.latest,
    dependent: info.dependent ?? "",
    type: "global" as const,
    selected: false,
    targetVersion: info.latest,
  }));
}

async function isManagerAvailable(manager: PackageManager): Promise<boolean> {
  try {
    await execa(manager, ["--version"], { reject: false });
    return true;
  } catch {
    return false;
  }
}

const ALL_MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn"];

/**
 * Check all available package managers for global outdated packages in parallel.
 * Each returned package is tagged with its owning manager.
 */
export async function getAllGlobalOutdated(cwd: string, onLine?: (line: string) => void): Promise<FetchResult> {
  const available = await Promise.all(ALL_MANAGERS.map(async (m) => ({ manager: m, ok: await isManagerAvailable(m) })));
  const managers = available.filter((a) => a.ok).map((a) => a.manager);

  const results = await Promise.all(managers.map((m) => getOutdatedPackages(m, cwd, true, onLine)));

  const allPackages: OutdatedPackage[] = [];
  for (let i = 0; i < managers.length; i++) {
    const result = results[i];
    if (result.ok) {
      for (const pkg of result.packages) {
        pkg.manager = managers[i];
        allPackages.push(pkg);
      }
    }
  }

  return { ok: true, packages: allPackages };
}

/**
 * Yarn classic outputs ndjson — one JSON object per line.
 * The table data is in a line like: {"type":"table","data":{"head":...,"body":[[name, current, wanted, latest, workspace, type],...]}}
 */
function parseYarnOutdated(raw: string, global: boolean): OutdatedPackage[] {
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.type === "table" && obj.data?.body) {
        return obj.data.body.map((row: string[]) => ({
          name: row[0],
          current: row[1] ?? "N/A",
          wanted: row[2] ?? row[3],
          latest: row[3],
          dependent: row[4] ?? "",
          type: "global" as const,
          selected: false,
          targetVersion: row[3],
        }));
      }
    } catch {
      // skip non-JSON lines
    }
  }
  return [];
}
