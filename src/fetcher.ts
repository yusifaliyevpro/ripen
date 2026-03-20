import { execa } from "execa";
import type { PackageManager } from "./detector";

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  dependent: string;
  type: "dependencies" | "devDependencies" | "global";
  /** Which package manager owns this package (relevant for global packages) */
  manager?: PackageManager;
  selected?: boolean;
  targetVersion?: string;
}

export type FetchResult = { ok: true; packages: OutdatedPackage[] } | { ok: false; error: string };

export async function getOutdatedPackages(
  manager: PackageManager,
  cwd: string,
  global = false,
  onLine?: (line: string) => void,
): Promise<FetchResult> {
  const args = global ? ["outdated", "--global", "--json"] : ["outdated", "--json"];

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    const proc = execa(manager, args, {
      cwd,
      reject: false,
    });

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
    return {
      ok: false,
      error: `Could not run ${manager}: ${err.message ?? err}`,
    };
  }

  const isExpectedExit = exitCode === 0 || exitCode === 1;

  if (!isExpectedExit) {
    const msg = stderr.trim() || `${manager} outdated exited with code ${exitCode}`;
    return { ok: false, error: msg };
  }

  const raw = stdout.trim();

  if (!raw) {
    return { ok: true, packages: [] };
  }

  // Yarn outputs ndjson (one JSON object per line) — handle separately
  if (manager === "yarn") {
    try {
      return { ok: true, packages: parseYarnOutdated(raw, global) };
    } catch {
      return { ok: false, error: "Failed to parse yarn outdated output. Try again." };
    }
  }

  // Extract JSON object from stdout — pnpm may prepend WARN lines before the JSON
  const jsonStr = extractJson(raw);

  if (!jsonStr) {
    const errMsg = stderr.trim() || raw.slice(0, 120);
    return { ok: false, error: errMsg };
  }

  try {
    const data = JSON.parse(jsonStr);
    const packages = manager === "pnpm" ? parsePnpmOutdated(data, global) : parseNpmOutdated(data, global);
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

function parsePnpmOutdated(data: any, global: boolean): OutdatedPackage[] {
  if (Array.isArray(data) || typeof data !== "object") return [];
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    current: info.current ?? "N/A",
    wanted: info.wanted ?? info.latest,
    latest: info.latest,
    dependent: "",
    type: global ? "global" : info.dependencyType === "devDependencies" ? "devDependencies" : "dependencies",
    selected: false,
    targetVersion: info.latest,
  }));
}

function parseNpmOutdated(data: any, global: boolean): OutdatedPackage[] {
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    current: info.current ?? "N/A",
    wanted: info.wanted ?? info.latest,
    latest: info.latest,
    dependent: info.dependent ?? "",
    type: global ? "global" : info.type === "devDependencies" ? "devDependencies" : "dependencies",
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
          type: global ? "global" : row[5] === "devDependencies" ? "devDependencies" : "dependencies",
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
