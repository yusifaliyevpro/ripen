import { describe, expect, it } from "vitest";
import {
  compareFullVersions,
  compareVersions,
  isNewerVersion,
  MAJOR_PINNED_PACKAGES,
  parseBaseVersion,
  parseVersion,
  prereleaseChannel,
} from "../src/lib/versions";

describe("parseVersion", () => {
  it("splits a plain semver into [major, minor, patch]", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
  });

  it("strips a non-numeric prefix", () => {
    expect(parseVersion("v9.3.0")).toEqual([9, 3, 0]);
    expect(parseVersion("package@v2.1.0")).toEqual([2, 1, 0]);
  });

  it("drops any pre-release suffix", () => {
    expect(parseVersion("16.3.0-preview.5")).toEqual([16, 3, 0]);
    expect(parseVersion("1.0.0-beta.1")).toEqual([1, 0, 0]);
  });

  it("keeps partial versions as-is (no padding)", () => {
    expect(parseVersion("6")).toEqual([6]);
    expect(parseVersion("6.2")).toEqual([6, 2]);
  });

  it("returns a stable, cached result for repeated calls (memoization)", () => {
    // Same input returns the very same array reference — proves the memo is live
    // and that repeated parses don't re-run the regex work.
    const first = parseVersion("12.34.56");
    const second = parseVersion("12.34.56");
    expect(second).toBe(first);
  });

  it("does not confuse distinct inputs through the cache", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("v9.3.0")).toEqual([9, 3, 0]);
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("16.3.0-preview.5")).toEqual([16, 3, 0]);
  });
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    expect(compareVersions("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.0", "1.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.1.2", "1.1.1")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("1.1.1", "1.1.1")).toBe(0);
  });

  it("treats missing segments as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.3", "1.2.9")).toBeGreaterThan(0);
  });

  it("ignores the pre-release suffix (core comparison only)", () => {
    expect(compareVersions("1.2.0", "1.2.0-rc.1")).toBe(0);
  });
});

describe("prereleaseChannel", () => {
  it("returns the channel name for a channelled pre-release", () => {
    expect(prereleaseChannel("16.3.0-preview.5")).toBe("preview");
    expect(prereleaseChannel("3.0.0-beta.8")).toBe("beta");
  });

  it("returns '' for stable versions", () => {
    expect(prereleaseChannel("1.2.3")).toBe("");
  });

  it("returns '' for numeric-only pre-releases (no channel name)", () => {
    expect(prereleaseChannel("1.0.0-0")).toBe("");
  });
});

describe("compareFullVersions", () => {
  it("falls back to core comparison when both are stable", () => {
    expect(compareFullVersions("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareFullVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("ranks a stable release above any pre-release of the same core", () => {
    expect(compareFullVersions("1.2.0", "1.2.0-rc.1")).toBeGreaterThan(0);
    expect(compareFullVersions("1.2.0-rc.1", "1.2.0")).toBeLessThan(0);
  });

  it("orders pre-releases within a channel by their numeric identifier", () => {
    expect(compareFullVersions("1.2.0-rc.2", "1.2.0-rc.1")).toBeGreaterThan(0);
    expect(compareFullVersions("16.3.0-preview.6", "16.3.0-preview.5")).toBeGreaterThan(0);
  });

  it("ranks fewer identifiers below more (semver §11)", () => {
    expect(compareFullVersions("1.0.0-beta", "1.0.0-beta.1")).toBeLessThan(0);
  });

  it("ranks numeric identifiers below alphanumeric ones", () => {
    expect(compareFullVersions("1.0.0-1", "1.0.0-alpha")).toBeLessThan(0);
  });
});

describe("isNewerVersion", () => {
  it("is true only when latest is strictly greater", () => {
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "0.9.0")).toBe(false);
  });

  it("treats a newer pre-release in the same channel as an update", () => {
    expect(isNewerVersion("16.3.0-preview.5", "16.3.0-preview.6")).toBe(true);
  });

  it("treats a stable release as newer than its own pre-release", () => {
    expect(isNewerVersion("3.0.0-beta.8", "3.0.0")).toBe(true);
    expect(isNewerVersion("3.0.0", "3.0.0-beta.8")).toBe(false);
  });
});

describe("parseBaseVersion", () => {
  it("splits a caret range into version and prefix", () => {
    expect(parseBaseVersion("^9.3.0")).toEqual({ version: "9.3.0", prefix: "^" });
  });

  it("handles tilde and comparison prefixes", () => {
    expect(parseBaseVersion("~1.2.3")).toEqual({ version: "1.2.3", prefix: "~" });
    expect(parseBaseVersion(">=2.0.0")).toEqual({ version: "2.0.0", prefix: ">=" });
  });

  it("returns an empty prefix for an exact pin", () => {
    expect(parseBaseVersion("1.2.3")).toEqual({ version: "1.2.3", prefix: "" });
  });

  it("strips the workspace: protocol", () => {
    expect(parseBaseVersion("workspace:^1.0.0")).toEqual({ version: "1.0.0", prefix: "^" });
  });

  it("accepts partial semver", () => {
    expect(parseBaseVersion("6")).toEqual({ version: "6", prefix: "" });
    expect(parseBaseVersion("^6.2")).toEqual({ version: "6.2", prefix: "^" });
  });

  it("returns null for unparseable ranges", () => {
    expect(parseBaseVersion("*")).toBeNull();
    expect(parseBaseVersion("latest")).toBeNull();
    expect(parseBaseVersion("git+https://github.com/x/y.git")).toBeNull();
    expect(parseBaseVersion("file:../local")).toBeNull();
  });
});

describe("MAJOR_PINNED_PACKAGES", () => {
  it("includes @types/node", () => {
    expect(MAJOR_PINNED_PACKAGES.has("@types/node")).toBe(true);
  });
});
