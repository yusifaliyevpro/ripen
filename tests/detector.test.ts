import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackageManager, getProjectInfo, hasPackageJson, isManagerInstalled } from "../src/detector";

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

  it("finds a lockfile in an ancestor directory (workspace root)", async () => {
    await writeFile(join(dir, "pnpm-workspace.yaml"), "");
    const sub = join(dir, "docs");
    await mkdir(sub, { recursive: true });
    await writeFile(join(sub, "package.json"), "{}");
    expect(detectPackageManager(sub)).toBe("pnpm");
  });

  it("prefers a lockfile in the nearest directory over an ancestor", async () => {
    await writeFile(join(dir, "pnpm-workspace.yaml"), "");
    const sub = join(dir, "docs");
    await mkdir(sub, { recursive: true });
    await writeFile(join(sub, "yarn.lock"), "");
    expect(detectPackageManager(sub)).toBe("yarn");
  });
});

describe("isManagerInstalled", () => {
  // Lay down a fake binary under every name the OS might look for so the test
  // is platform-agnostic (bare name on posix, .cmd/.exe on Windows via PATHEXT).
  async function fakeBin(name: string): Promise<void> {
    for (const file of [name, `${name}.cmd`, `${name}.exe`]) {
      await writeFile(join(dir, file), "");
    }
  }

  it("is true when the manager resolves on PATH", async () => {
    await fakeBin("pnpm");
    expect(isManagerInstalled("pnpm", { PATH: dir })).toBe(true);
  });

  it("is false when the manager is not on PATH", async () => {
    await fakeBin("pnpm");
    expect(isManagerInstalled("yarn", { PATH: dir })).toBe(false);
  });

  it("is false when PATH is empty", () => {
    expect(isManagerInstalled("npm", { PATH: "" })).toBe(false);
  });

  it("scans every PATH entry, not just the first", async () => {
    const other = await mkdtemp(join(tmpdir(), "ripen-path-"));
    try {
      await fakeBin("bun"); // bun lives in `dir`, which is second on PATH
      const combined = `${other}${delimiter}${dir}`;
      expect(isManagerInstalled("bun", { PATH: combined })).toBe(true);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
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

  it("exposes the parsed package.json for reuse by the fetcher", async () => {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "my-app", dependencies: { react: "^18.0.0" }, devDependencies: { vitest: "^1.0.0" } }),
    );
    const info = getProjectInfo(dir);
    expect(info.packageJson).toMatchObject({
      dependencies: { react: "^18.0.0" },
      devDependencies: { vitest: "^1.0.0" },
    });
  });

  it("sets packageJson to null when the file is missing or malformed", async () => {
    expect(getProjectInfo(dir).packageJson).toBeNull();
    await writeFile(join(dir, "package.json"), "{ not json");
    expect(getProjectInfo(dir).packageJson).toBeNull();
  });
});
