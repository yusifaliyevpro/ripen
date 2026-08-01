import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory filesystem keyed by absolute path. The config module computes its
// paths from the real homedir/join at import time; we only intercept the fs
// calls so no real files are touched.
const files = new Map<string, string>();

vi.mock("node:fs", () => ({
  readFileSync: (p: string) => {
    if (!files.has(p)) {
      const err = new Error(`ENOENT: ${p}`);
      throw err;
    }
    return files.get(p);
  },
  writeFileSync: (p: string, data: string) => {
    files.set(p, data);
  },
  mkdirSync: () => undefined,
}));

const { DEFAULT_CONFIG, incrementFrequency, loadConfig, loadFrequency, saveConfig } = await import("../src/config");

beforeEach(() => {
  files.clear();
});

describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it("round-trips a saved config", () => {
    const custom = { ...DEFAULT_CONFIG, groupByScope: true, groupScopes: ["@heroui"] };
    saveConfig(custom);
    expect(loadConfig()).toEqual(custom);
  });

  it("merges a partial config over the defaults", () => {
    // Simulate an older config file missing newer keys.
    saveConfig(DEFAULT_CONFIG);
    const [path] = [...files.keys()];
    files.set(path, JSON.stringify({ frequencySort: true }));
    expect(loadConfig()).toEqual({ ...DEFAULT_CONFIG, frequencySort: true });
  });

  it("falls back to defaults on malformed JSON", () => {
    saveConfig(DEFAULT_CONFIG);
    const [path] = [...files.keys()];
    files.set(path, "{ not valid json");
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });
});

describe("frequency tracking", () => {
  it("returns an empty map when nothing is tracked", () => {
    expect(loadFrequency()).toEqual({});
  });

  it("increments counts across calls", () => {
    incrementFrequency(["react", "zod"]);
    incrementFrequency(["react"]);
    expect(loadFrequency()).toEqual({ react: 2, zod: 1 });
  });
});
