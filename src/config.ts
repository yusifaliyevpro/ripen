import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface RipenConfig {
  groupByScope: boolean;
}

export const DEFAULT_CONFIG: RipenConfig = {
  groupByScope: true,
};

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
