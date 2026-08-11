import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PackageManager, ProjectInfo } from "./types";

function detectInDir(dir: string): PackageManager | null {
  if (existsSync(join(dir, "bun.lock"))) return "bun";
  if (existsSync(join(dir, "bun.lockb"))) return "bun";
  if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(dir, "pnpm-workspace.yaml"))) return "pnpm";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join(dir, "package-lock.json"))) return "npm";
  return null;
}

/**
 * Detect the package manager by walking up from `cwd` toward the filesystem
 * root. This handles monorepos/workspaces where the lockfile (and
 * `pnpm-workspace.yaml`) lives in the repo root rather than the package
 * subdirectory the command is run from. The nearest directory with a lockfile
 * wins; falls back to npm when none is found.
 */
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

/**
 * Detect which package manager installed ripen globally
 * by checking the path of the running script.
 */
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

export function getProjectInfo(cwd: string): ProjectInfo {
  const manager = detectPackageManager(cwd);
  let name = cwd.split("/").pop() ?? "project";

  try {
    const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf-8"));
    if (pkg.name) name = pkg.name;
  } catch {}

  return { manager, cwd, name };
}
