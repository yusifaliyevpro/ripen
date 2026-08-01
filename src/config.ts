import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { RipenConfig } from "./types";

export const DEFAULT_CONFIG: RipenConfig = {
  groupByScope: false,
  groupScopes: [],
  groupsOnTop: false,
  frequencySort: false,
  separateDevDeps: true,
  sfwFirewall: false,
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

// --- Self-update cache ---
//
// The latest ripen version seen on npm, written by a fire-and-forget check on
// the previous run. Reading it is synchronous, so startup never waits on the
// network to decide whether to show the self-update prompt.

const UPDATE_CACHE_PATH = join(CONFIG_DIR, "update-check.json");

export function loadCachedLatestVersion(): string | null {
  try {
    const raw = readFileSync(UPDATE_CACHE_PATH, "utf-8");
    const parsed: { latestVersion?: unknown } = JSON.parse(raw);
    return typeof parsed.latestVersion === "string" ? parsed.latestVersion : null;
  } catch {
    return null;
  }
}

export function saveCachedLatestVersion(version: string): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(UPDATE_CACHE_PATH, JSON.stringify({ latestVersion: version }, null, 2) + "\n", "utf-8");
  } catch {
    // Silently fail — non-critical
  }
}
