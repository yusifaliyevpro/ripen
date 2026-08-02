import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackageManager, getProjectInfo, hasPackageJson } from "../src/detector";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ripen-detect-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("detectPackageManager", () => {
  it("defaults to npm when no lockfile is present", () => {
    expect(detectPackageManager(dir)).toBe("npm");
  });

  it("detects bun from bun.lock", async () => {
    await writeFile(join(dir, "bun.lock"), "");
    expect(detectPackageManager(dir)).toBe("bun");
  });

  it("detects bun from bun.lockb", async () => {
    await writeFile(join(dir, "bun.lockb"), "");
    expect(detectPackageManager(dir)).toBe("bun");
  });

  it("detects pnpm from pnpm-lock.yaml", async () => {
    await writeFile(join(dir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(dir)).toBe("pnpm");
  });

  it("detects pnpm from pnpm-workspace.yaml", async () => {
    await writeFile(join(dir, "pnpm-workspace.yaml"), "");
    expect(detectPackageManager(dir)).toBe("pnpm");
  });

  it("detects yarn from yarn.lock", async () => {
    await writeFile(join(dir, "yarn.lock"), "");
    expect(detectPackageManager(dir)).toBe("yarn");
  });

  it("detects npm from package-lock.json", async () => {
    await writeFile(join(dir, "package-lock.json"), "{}");
    expect(detectPackageManager(dir)).toBe("npm");
  });

  it("prefers bun over pnpm when both lockfiles exist", async () => {
    await writeFile(join(dir, "bun.lock"), "");
    await writeFile(join(dir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(dir)).toBe("bun");
  });
});

describe("hasPackageJson", () => {
  it("is false when package.json is missing", () => {
    expect(hasPackageJson(dir)).toBe(false);
  });

  it("is true when package.json exists", async () => {
    await writeFile(join(dir, "package.json"), "{}");
    expect(hasPackageJson(dir)).toBe(true);
  });
});

describe("getProjectInfo", () => {
  it("reads the name from package.json", async () => {
    await writeFile(join(dir, "package.json"), JSON.stringify({ name: "my-app" }));
    await writeFile(join(dir, "pnpm-lock.yaml"), "");
    const info = getProjectInfo(dir);
    expect(info.name).toBe("my-app");
    expect(info.manager).toBe("pnpm");
    expect(info.cwd).toBe(dir);
  });

  it("does not throw when package.json is missing or malformed", async () => {
    expect(() => getProjectInfo(dir)).not.toThrow();
    await writeFile(join(dir, "package.json"), "{ not json");
    expect(() => getProjectInfo(dir)).not.toThrow();
  });
});
