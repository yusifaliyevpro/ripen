import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "valibot";
import { isManagerInstalled } from "./detector";
import { run } from "./lib/run";
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
import type { PackageJson, PackageManager, OutdatedPackage, FetchResult } from "./types";

type DepEntry = {
  name: string;
  current: string;
  prefix: string;
  type: "dependencies" | "devDependencies";
};

/** Dependency entries from `package.json`; uses the pre-parsed object and only reads disk when absent. */
function readPackageJsonDeps(cwd: string, preParsed?: PackageJson | null): DepEntry[] {
  let pkg: PackageJson;
  if (preParsed) {
    pkg = preParsed;
  } else {
    pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
  }
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

/** A package to check; `channel` is its pre-release channel, `pinMajor` restricts to one major (see {@link MAJOR_PINNED_PACKAGES}). */
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
 * Version to compare a dependency against: the `latest` dist-tag, or — for one pinned to a
 * pre-release channel — that channel's own tag, else it's measured against a lower stable and never reports outdated.
 */
async function fetchRegistryInfoWithRetry(
  packageName: string,
  channel?: string,
  pinMajor?: number,
): Promise<RegistryInfo> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    // clearTimeout in `finally` so a failed request doesn't leak a 15s timer that keeps the CLI alive.
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`, {
        signal: controller.signal,
      });
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
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function fetchAllLatest(
  targets: Target[],
  concurrency: number,
  onLine?: (line: string) => void,
  onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, RegistryInfo>> {
  const results = new Map<string, RegistryInfo>();
  let index = 0;
  let completed = 0;

  onProgress?.(0, targets.length);

  async function worker() {
    while (index < targets.length) {
      const i = index++;
      const target = targets[i];
      // Per-package line to the output box; overall count via onProgress (header).
      onLine?.(`Checking ${target.name}...`);
      results.set(target.name, await fetchRegistryInfoWithRetry(target.name, target.channel, target.pinMajor));
      completed++;
      onProgress?.(completed, targets.length);
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
  packageJson?: PackageJson | null,
  onProgress?: (completed: number, total: number) => void,
): Promise<FetchResult> {
  // Global mode: use manager's outdated command
  if (global) {
    return getGlobalOutdatedPackages(manager, cwd, onLine);
  }

  // Local mode: read package.json + check npm registry
  let deps: DepEntry[];
  try {
    deps = readPackageJsonDeps(cwd, packageJson);
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
    onProgress,
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

/** All globally installed packages for a manager: name + installed version. */
async function listGlobalPackages(
  manager: PackageManager,
  cwd: string,
  onLine?: (line: string) => void,
): Promise<Array<{ name: string; current: string }>> {
  try {
    if (manager === "npm") {
      const args = ["list", "-g", "--depth=0", "--json"];
      onLine?.(`$ npm ${args.join(" ")}`);
      const { stdout } = await run("npm", args, { cwd });
      const data = parse(GlobalListOutputSchema, JSON.parse(stdout));
      return Object.entries(data.dependencies ?? {}).map(([name, info]) => ({
        name,
        current: info.version ?? "N/A",
      }));
    }
    if (manager === "pnpm") {
      const args = ["list", "-g", "--json"];
      onLine?.(`$ pnpm ${args.join(" ")}`);
      const { stdout } = await run("pnpm", args, { cwd });
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
      const { stdout } = await run("yarn", args, { cwd });
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
    const forwardWarnings = onLine
      ? (chunk: string) => {
          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && /^\s*(WARN|ERR!|npm warn|npm error)/i.test(trimmed)) {
              onLine(trimmed);
            }
          }
        }
      : undefined;

    const result = await run(manager, args, { cwd, onData: forwardWarnings });
    stdout = result.stdout;
    stderr = result.stderr;
    exitCode = result.exitCode;
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

/** First top-level JSON object in a string that may have non-JSON lines around it (e.g. pnpm WARN). */
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
  if (data === null || typeof data !== "object" || Array.isArray(data)) return [];
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

const ALL_MANAGERS: PackageManager[] = ["npm", "pnpm", "yarn"];

/** Check all managers for global packages in parallel, tagging each by manager; showAll lists every installed package. */
export async function getAllGlobalOutdated(
  cwd: string,
  onLine?: (line: string) => void,
  showAll = false,
): Promise<FetchResult> {
  // Probe + query each manager independently so its output streams without blocking on the slowest.
  const results = await Promise.all(
    ALL_MANAGERS.map(async (manager) => {
      if (!isManagerInstalled(manager)) return null;
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
