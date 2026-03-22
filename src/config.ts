import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export type RipenConfig = {
  /** Enable scope grouping */
  groupByScope: boolean;
  /** Scopes to sub-group (e.g. ["@heroui"] groups @heroui/* packages) */
  groupScopes: string[];
  /** Show grouped scopes at the top of their section */
  groupsOnTop: boolean;
  /** Sort packages by update frequency (most updated first) */
  frequencySort: boolean;
  /** Separate dependencies and devDependencies into separate groups (default: true) */
  separateDevDeps: boolean;
};

export const DEFAULT_CONFIG: RipenConfig = {
  groupByScope: false,
  groupScopes: [],
  groupsOnTop: false,
  frequencySort: false,
  separateDevDeps: true,
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

// --- Frequency tracking ---

const FREQUENCY_PATH = join(CONFIG_DIR, "frequency.json");

export function loadFrequency(): Record<string, number> {
  try {
    const raw = readFileSync(FREQUENCY_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function incrementFrequency(packageNames: string[]): void {
  try {
    const freq = loadFrequency();
    for (const name of packageNames) {
      freq[name] = (freq[name] ?? 0) + 1;
    }
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(FREQUENCY_PATH, JSON.stringify(freq, null, 2) + "\n", "utf-8");
  } catch {
    // Silently fail — non-critical
  }
}
