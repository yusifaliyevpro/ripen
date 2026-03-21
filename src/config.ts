import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const DEFAULT_UNGROUP_SCOPES = ["@types", "@react-types"];

export type RipenConfig = {
  groupByScope: boolean;
  /** User-added scopes beyond the defaults */
  addedScopes: string[];
  /** Default scopes the user explicitly removed */
  removedDefaults: string[];
};

export const DEFAULT_CONFIG: RipenConfig = {
  groupByScope: true,
  addedScopes: [],
  removedDefaults: [],
};

/** Compute the effective ungroup scopes list: (defaults - removedDefaults) + addedScopes */
export function getEffectiveUngroupScopes(config: RipenConfig): string[] {
  const defaults = DEFAULT_UNGROUP_SCOPES.filter((s) => !config.removedDefaults.includes(s));
  return [...defaults, ...config.addedScopes];
}

const CONFIG_DIR = join(homedir(), ".config", "ripen");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function loadConfig(): RipenConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: RipenConfig): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
  } catch {
    // Silently fail — non-critical
  }
}
