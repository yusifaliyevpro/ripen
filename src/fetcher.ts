import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";
import { parse } from "valibot";
import {
  GlobalListOutputArraySchema,
  GlobalListOutputSchema,
  NpmPackumentSchema,
  OutdatedInfoRecordSchema,
  YarnListLineSchema,
  YarnOutdatedLineSchema,
  type NpmPackument,
  type OutdatedInfo,
} from "./lib/schemas";
import {
  compareFullVersions,
  MAJOR_PINNED_PACKAGES,
  parseBaseVersion,
  parseVersion,
  prereleaseChannel,
} from "./lib/versions";
import { isNewerVersion } from "./registry";
import type { PackageManager, OutdatedPackage, FetchResult } from "./types";

type DepEntry = {
  name: string;
  current: string;
  prefix: string;
  type: "dependencies" | "devDependencies";
};

function readPackageJsonDeps(cwd: string): DepEntry[] {
  const raw = readFileSync(join(cwd, "package.json"), "utf-8");
  const pkg: { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } = JSON.parse(raw);
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

type RegistryInfo = { version: string; publishedAt: string } | null;

/**
 * A package to check, plus the pre-release channel it should be checked
 * against. `pinMajor` restricts the comparison to a single major (used for
 * `@types/node`-style packages — see {@link MAJOR_PINNED_PACKAGES}).
 */
type Target = { name: string; channel?: string; pinMajor?: number };

/** Highest stable version whose major equals `major`, or null if none exist. */
function latestVersionInMajor(data: NpmPackument, major: number): string | null {
  let best: string | null = null;
  for (const v of Object.keys(data.versions ?? {})) {
    if (v.includes("-")) continue; // stable only
    if (parseVersion(v)[0] !== major) continue;
    if (best === null || compareFullVersions(v, best) > 0) best = v;
  }
  return best;
}

/**
 * Resolve the version a dependency should be compared against.
 *
 * Normally that is the `latest` dist-tag, but a dependency pinned to a
 * pre-release channel ("16.3.0-preview.5") must be compared against that
 * channel's own dist-tag — otherwise it is measured against a *lower* stable
 * version and never reports as outdated.
 */
async function fetchRegistryInfoWithRetry(
  packageName: string,
  channel?: string,
  pinMajor?: number,
): Promise<RegistryInfo> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = parse(NpmPackumentSchema, await res.json());
      const distTags = data["dist-tags"] ?? {};
      const version: string | null =
        pinMajor !== undefined
          ? latestVersionInMajor(data, pinMajor)
          : ((channel ? distTags[channel] : null) ??
            distTags.latest ??
            Object.keys(data.versions ?? {}).at(-1) ??
            null);
      if (!version) return null;
      return { version, publishedAt: data.time?.[version] ?? "" };
    } catch {
      if (attempt === 2) return null;
    }
  }
  return null;
}

async function fetchAllLatest(
  targets: Target[],
  concurrency: number,
  onLine?: (line: string) => void,
): Promise<Map<string, RegistryInfo>> {
  const results = new Map<string, RegistryInfo>();
  let index = 0;
  let completed = 0;

  async function worker() {
    while (index < targets.length) {
      const i = index++;
      const target = targets[i];
      onLine?.(`Checking ${target.name} (${completed + 1}/${targets.length})...`);
      results.set(target.name, await fetchRegistryInfoWithRetry(target.name, target.channel, target.pinMajor));
      completed++;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
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
    deps.map((d) => ({
      name: d.name,
      channel: prereleaseChannel(d.current),
      pinMajor: MAJOR_PINNED_PACKAGES.has(d.name) ? parseVersion(d.current)[0] : undefined,
    })),
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
    const info = latestVersions.get(dep.name);
    if (!info) continue;
    const { version: latest, publishedAt } = info;
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
      latestPublishedAt: publishedAt || undefined,
    });
  }

  return { ok: true, packages };
}

/** Fetch publish dates from the registry and attach them to existing packages in-place. */
async function hydratePublishDates(packages: OutdatedPackage[]): Promise<void> {
  if (packages.length === 0) return;
  const info = await fetchAllLatest(
    packages.map((p) => ({ name: p.name, channel: prereleaseChannel(p.current) })),
    8,
  );
  for (const pkg of packages) {
    const r = info.get(pkg.name);
    if (r?.publishedAt) pkg.latestPublishedAt = r.publishedAt;
  }
}

/**
 * List all globally installed packages for a manager.
 * Returns name + currently installed version.
 */
async function listGlobalPackages(
  manager: PackageManager,
  cwd: string,
  onLine?: (line: string) => void,
): Promise<Array<{ name: string; current: string }>> {
  try {
    if (manager === "npm") {
      const args = ["list", "-g", "--depth=0", "--json"];
      onLine?.(`$ npm ${args.join(" ")}`);
      const { stdout } = await execa("npm", args, { cwd, reject: false });
      const data = parse(GlobalListOutputSchema, JSON.parse(stdout));
      return Object.entries(data.dependencies ?? {}).map(([name, info]) => ({
        name,
        current: info.version ?? "N/A",
      }));
    }
    if (manager === "pnpm") {
      const args = ["list", "-g", "--json"];
      onLine?.(`$ pnpm ${args.join(" ")}`);
      const { stdout } = await execa("pnpm", args, { cwd, reject: false });
      const raw: unknown = JSON.parse(stdout);
      const deps: Record<string, { version?: string }> = Array.isArray(raw)
        ? (parse(GlobalListOutputArraySchema, raw)[0]?.dependencies ?? {})
        : (parse(GlobalListOutputSchema, raw).dependencies ?? {});
      return Object.entries(deps).map(([name, info]) => ({
        name,
        current: info.version ?? "N/A",
      }));
    }
    if (manager === "yarn") {
      const args = ["global", "list", "--depth=0", "--json"];
      onLine?.(`$ yarn ${args.join(" ")}`);
      const { stdout } = await execa("yarn", args, { cwd, reject: false });
      const pkgs: Array<{ name: string; current: string }> = [];
      for (const line of stdout.trim().split("\n")) {
        try {
          const obj = parse(YarnListLineSchema, JSON.parse(line));
          if (obj.type === "tree" && obj.data?.trees) {
            for (const tree of obj.data.trees) {
              const match = tree.name?.match(/^(.+)@([^@]+)$/);
              if (match) pkgs.push({ name: match[1], current: match[2] });
            }
          }
        } catch {}
      }
      return pkgs;
    }
  } catch {}
  return [];
}

/** Global mode, showAll=true: list all installed packages then check registry for latest. */
async function getGlobalAllPackages(
  manager: PackageManager,
  cwd: string,
  onLine?: (line: string) => void,
): Promise<FetchResult> {
  const installed = await listGlobalPackages(manager, cwd, onLine);
  if (installed.length === 0) return { ok: true, packages: [] };

  const registryInfo = await fetchAllLatest(
    installed.map((p) => ({ name: p.name, channel: prereleaseChannel(p.current) })),
    8,
    onLine,
  );

  const packages: OutdatedPackage[] = [];
  for (const dep of installed) {
    const info = registryInfo.get(dep.name);
    if (!info) continue;
    packages.push({
      name: dep.name,
      current: dep.current,
      wanted: info.version,
      latest: info.version,
      dependent: "",
      type: "global",
      selected: false,
      targetVersion: info.version,
      latestPublishedAt: info.publishedAt || undefined,
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
  onLine?.(`$ ${manager} ${args.join(" ")}`);

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

  let packages: OutdatedPackage[];

  if (manager === "yarn") {
    try {
      packages = parseYarnOutdated(raw);
    } catch {
      return { ok: false, error: "Failed to parse yarn outdated output. Try again." };
    }
  } else {
    const jsonStr = extractJson(raw);
    if (!jsonStr) {
      const errMsg = stderr.trim() || raw.slice(0, 120);
      return { ok: false, error: errMsg };
    }
    try {
      const data = parse(OutdatedInfoRecordSchema, JSON.parse(jsonStr));
      packages = manager === "pnpm" ? parsePnpmOutdated(data) : parseNpmOutdated(data);
    } catch {
      return { ok: false, error: "Failed to parse outdated output. Try again." };
    }
  }

  await hydratePublishDates(packages);
  return { ok: true, packages };
}

/**
 * Extract the first top-level JSON object from a string that may contain
 * non-JSON lines (e.g. pnpm WARN messages) before or after the JSON.
 */
export function extractJson(raw: string): string | null {
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

export function parsePnpmOutdated(data: Record<string, OutdatedInfo>): OutdatedPackage[] {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return [];
  return Object.entries(data).map(([name, info]) => ({
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

export function parseNpmOutdated(data: Record<string, OutdatedInfo>): OutdatedPackage[] {
  if (data === null || typeof data !== "object") return [];
  return Object.entries(data).map(([name, info]) => ({
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
 * Check all available package managers for global packages in parallel.
 * Each returned package is tagged with its owning manager.
 * showAll=true lists every installed package, not just outdated ones.
 */
export async function getAllGlobalOutdated(
  cwd: string,
  onLine?: (line: string) => void,
  showAll = false,
): Promise<FetchResult> {
  // Probe and query each manager independently so an installed manager's command
  // streams into the output box as soon as its own `--version` probe resolves,
  // instead of blocking on the slowest probe across all managers.
  const results = await Promise.all(
    ALL_MANAGERS.map(async (manager) => {
      if (!(await isManagerAvailable(manager))) return null;
      const result = showAll
        ? await getGlobalAllPackages(manager, cwd, onLine)
        : await getOutdatedPackages(manager, cwd, true, onLine);
      return { manager, result };
    }),
  );

  const allPackages: OutdatedPackage[] = [];
  for (const entry of results) {
    if (!entry || !entry.result.ok) continue;
    for (const pkg of entry.result.packages) {
      pkg.manager = entry.manager;
      allPackages.push(pkg);
    }
  }

  return { ok: true, packages: allPackages };
}

/**
 * Yarn classic outputs ndjson — one JSON object per line.
 * The table data is in a line like: {"type":"table","data":{"head":...,"body":[[name, current, wanted, latest, workspace, type],...]}}
 */
export function parseYarnOutdated(raw: string): OutdatedPackage[] {
  const lines = raw.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = parse(YarnOutdatedLineSchema, JSON.parse(trimmed));
      if (obj.type === "table" && obj.data?.body) {
        return obj.data.body.map((row) => ({
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
