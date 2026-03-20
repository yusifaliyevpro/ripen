import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type PackageManager = "pnpm" | "npm" | "yarn";

export interface ProjectInfo {
  manager: PackageManager;
  cwd: string;
  name: string;
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
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
