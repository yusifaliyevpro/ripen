import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type PackageManager = "pnpm" | "npm";

export interface ProjectInfo {
  manager: PackageManager;
  cwd: string;
  name: string;
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(cwd, "package-lock.json"))) return "npm";
  // fallback: check if pnpm is available
  if (existsSync(join(cwd, "pnpm-workspace.yaml"))) return "pnpm";
  return "npm";
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
