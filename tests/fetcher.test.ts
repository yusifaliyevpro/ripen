import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// getOutdatedPackages (via registry) spawns via lib/run — never spawn in tests.
vi.mock("../src/lib/run", () => ({
  run: vi.fn<() => Promise<{ stdout: string; stderr: string; exitCode: number }>>(async () => ({
    stdout: "",
    stderr: "",
    exitCode: 0,
  })),
}));

// Global mode probes manager availability via detector.isManagerInstalled, which
// hits the real PATH. Stub it so tests don't depend on which managers the host
// actually has installed; default: every manager is available.
const isManagerInstalled = vi.fn<(m: string) => boolean>(() => true);
vi.mock("../src/detector", () => ({ isManagerInstalled: (m: string) => isManagerInstalled(m) }));

const { getOutdatedPackages, getAllGlobalOutdated } = await import("../src/fetcher");

let dir: string;
const originalFetch = globalThis.fetch;

/** Map each package name to the packument fetch returns for it. */
function mockRegistry(byName: Record<string, unknown>): void {
  globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const name = decodeURIComponent(url.replace("https://registry.npmjs.org/", ""));
    const body = byName[name];
    if (!body) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ripen-fetch-"));
  isManagerInstalled.mockImplementation(() => true);
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

async function writePkg(deps: Record<string, string>, devDeps: Record<string, string> = {}): Promise<void> {
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", dependencies: deps, devDependencies: devDeps }),
  );
}

describe("getOutdatedPackages (local mode)", () => {
  it("reports only packages with a newer registry version", async () => {
    await writePkg({ react: "^18.0.0", zod: "^3.22.0" });
    mockRegistry({
      react: { "dist-tags": { latest: "19.0.0" }, versions: { "19.0.0": {} }, time: {} },
      zod: { "dist-tags": { latest: "3.22.0" }, versions: { "3.22.0": {} }, time: {} },
    });

    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["react"]);
    const react = result.packages[0];
    expect(react.current).toBe("18.0.0");
    expect(react.latest).toBe("19.0.0");
    expect(react.rangePrefix).toBe("^");
    expect(react.type).toBe("dependencies");
  });

  it("tags devDependencies with the right type", async () => {
    await writePkg({}, { vitest: "^1.0.0" });
    mockRegistry({ vitest: { "dist-tags": { latest: "2.0.0" }, versions: { "2.0.0": {} }, time: {} } });

    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages[0]).toMatchObject({ name: "vitest", type: "devDependencies" });
  });

  it("includes up-to-date packages when showAll is true", async () => {
    await writePkg({ zod: "^3.22.0" });
    mockRegistry({ zod: { "dist-tags": { latest: "3.22.0" }, versions: { "3.22.0": {} }, time: {} } });

    const result = await getOutdatedPackages("pnpm", dir, false, undefined, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["zod"]);
  });

  it("returns an empty list when there are no dependencies", async () => {
    await writePkg({});
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result).toEqual({ ok: true, packages: [] });
  });

  it("errors when package.json cannot be read", async () => {
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/package\.json/);
  });

  it("uses the pre-parsed package.json without reading disk", async () => {
    // No package.json on disk — a disk read would throw. Passing the pre-parsed
    // object (as ProjectInfo carries it) must let the scan proceed anyway.
    mockRegistry({ react: { "dist-tags": { latest: "19.0.0" }, versions: { "19.0.0": {} }, time: {} } });
    const result = await getOutdatedPackages("pnpm", dir, false, undefined, false, {
      dependencies: { react: "^18.0.0" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["react"]);
  });

  it("prefers the pre-parsed object over what is on disk", async () => {
    await writePkg({ zod: "^3.0.0" }); // disk says zod...
    mockRegistry({
      react: { "dist-tags": { latest: "19.0.0" }, versions: { "19.0.0": {} }, time: {} },
      zod: { "dist-tags": { latest: "4.0.0" }, versions: { "4.0.0": {} }, time: {} },
    });
    // ...but the pre-parsed object says react, and that must win.
    const result = await getOutdatedPackages("pnpm", dir, false, undefined, false, {
      dependencies: { react: "^18.0.0" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["react"]);
  });

  it("errors when every registry request fails (offline)", async () => {
    await writePkg({ react: "^18.0.0" });
    mockRegistry({}); // every lookup 404s
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/npm registry/i);
  });
});

describe("global mode command streaming", () => {
  // The top-level run() mock resolves to empty stdout for every call, so the
  // managers report no packages — we only assert the streamed command lines.
  it.each([
    ["npm", "$ npm outdated --global --json"],
    ["pnpm", "$ pnpm outdated --global --json"],
    ["yarn", "$ yarn outdated --global --json"],
  ] as const)("streams the executed %s command via onLine", async (manager, command) => {
    const lines: string[] = [];
    const result = await getOutdatedPackages(manager, dir, true, (l) => lines.push(l));
    expect(result.ok).toBe(true);
    expect(lines).toContain(command);
  });

  it("streams every manager's outdated command when checking all managers", async () => {
    const lines: string[] = [];
    const result = await getAllGlobalOutdated(dir, (l) => lines.push(l));
    expect(result.ok).toBe(true);
    expect(lines).toContain("$ npm outdated --global --json");
    expect(lines).toContain("$ pnpm outdated --global --json");
    expect(lines).toContain("$ yarn outdated --global --json");
  });

  it("skips managers that are not installed — no command streamed, no error", async () => {
    isManagerInstalled.mockImplementation((m) => m !== "yarn"); // yarn absent
    const lines: string[] = [];
    const result = await getAllGlobalOutdated(dir, (l) => lines.push(l));
    expect(result.ok).toBe(true);
    expect(lines).toContain("$ npm outdated --global --json");
    expect(lines).toContain("$ pnpm outdated --global --json");
    expect(lines).not.toContain("$ yarn outdated --global --json");
  });

  it("streams the list command in showAll global mode", async () => {
    const lines: string[] = [];
    const result = await getAllGlobalOutdated(dir, (l) => lines.push(l), true);
    expect(result.ok).toBe(true);
    expect(lines).toContain("$ npm list -g --depth=0 --json");
    expect(lines).toContain("$ pnpm list -g --json");
    expect(lines).toContain("$ yarn global list --depth=0 --json");
  });
});
