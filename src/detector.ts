import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import type { PackageJson, PackageManager, ProjectInfo } from "./types";

function detectInDir(dir: string): PackageManager | null {
  if (existsSync(join(dir, "bun.lock"))) return "bun";
  if (existsSync(join(dir, "bun.lockb"))) return "bun";
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "pnpm-workspace.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join(dir, "package-lock.json"))) return "npm";
  return null;
}

/** Nearest lockfile walking up from `cwd` wins (handles monorepos); falls back to npm. */
export function detectPackageManager(cwd: string): PackageManager {
  let dir = cwd;
  while (true) {
    const manager = detectInDir(dir);
    if (manager) return manager;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "npm";
}

/** Which manager installed ripen globally, inferred from the running script's path. */
export function detectGlobalInstallManager(): PackageManager {
  const scriptPath = (process.argv[1] ?? "").replace(/\\/g, "/").toLowerCase();
  if (scriptPath.includes("/pnpm/") || scriptPath.includes("/pnpm-global/")) return "pnpm";
  if (scriptPath.includes("/yarn/")) return "yarn";
  if (scriptPath.includes("/.bun/") || scriptPath.includes("/bun/")) return "bun";
  return "npm";
}

export function hasPackageJson(cwd: string): boolean {
  return existsSync(join(cwd, "package.json"));
}

/**
 * Whether `manager` resolves on PATH, checked from the filesystem without spawning
 * (avoids a `<mgr> --version` probe per manager). Scans PATH entries, trying each PATHEXT on Windows.
 */
export function isManagerInstalled(manager: PackageManager, env: NodeJS.ProcessEnv = process.env): boolean {
  const pathValue = env.PATH ?? env.Path ?? "";
  if (!pathValue) return false;

  const exts = process.platform === "win32" ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean) : [""];

  for (const dir of pathValue.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (existsSync(join(dir, manager + ext))) return true;
    }
  }
  return false;
}

export function getProjectInfo(cwd: string): ProjectInfo {
  const manager = detectPackageManager(cwd);
  let name = cwd.split("/").pop() ?? "project";

  // Parse package.json once and pass it via ProjectInfo so the fetcher doesn't re-read it.
  let packageJson: PackageJson | null = null;
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
    if (pkg && typeof pkg === "object") {
      packageJson = pkg;
      if (typeof pkg.name === "string" && pkg.name) name = pkg.name;
    }
  } catch {}

  return { manager, cwd, name, packageJson };
}
