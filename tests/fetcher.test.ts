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
const { run } = await import("../src/lib/run");
const runMock = vi.mocked(run);

const EMPTY_RUN = async () => ({ stdout: "", stderr: "", exitCode: 0 });

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
  runMock.mockReset();
  runMock.mockImplementation(EMPTY_RUN);
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

describe("registry request timeout hygiene", () => {
  it("clears the 15s request-timeout timer when a fetch fails (no leaked timers)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      await writePkg({ react: "^18.0.0" });
      globalThis.fetch = vi.fn<typeof fetch>(() => Promise.reject(new Error("network down")));

      const result = await getOutdatedPackages("pnpm", dir);
      expect(result.ok).toBe(false);
      // A failed fetch used to leave its abort timer pending, which keeps Node's
      // event loop alive. Every armed timer must be cleared.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getOutdatedPackages progress reporting", () => {
  it("reports completed/total via onProgress, advancing to N/N", async () => {
    await writePkg({ ink: "^4.0.0", react: "^18.0.0", zod: "^3.0.0" });
    mockRegistry({
      ink: { "dist-tags": { latest: "5.0.0" }, versions: { "5.0.0": {} }, time: {} },
      react: { "dist-tags": { latest: "19.0.0" }, versions: { "19.0.0": {} }, time: {} },
      zod: { "dist-tags": { latest: "3.0.0" }, versions: { "3.0.0": {} }, time: {} },
    });

    const progress: Array<[number, number]> = [];
    await getOutdatedPackages("pnpm", dir, false, undefined, false, null, (done, total) =>
      progress.push([done, total]),
    );

    // Total is constant; completion advances through each package to N/N.
    expect(progress.every(([, total]) => total === 3)).toBe(true);
    const done = progress.map(([d]) => d);
    expect(done).toContain(1);
    expect(done).toContain(2);
    expect(progress.at(-1)).toEqual([3, 3]);
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

const runReturning =
  (stdout: string, exitCode = 0) =>
  async () => ({ stdout, stderr: "", exitCode });

describe("global outdated parsing", () => {
  it("parses npm outdated JSON into global packages", async () => {
    runMock.mockImplementation(
      runReturning(JSON.stringify({ react: { current: "18.0.0", wanted: "18.2.0", latest: "19.0.0" } }), 1),
    );
    mockRegistry({}); // hydratePublishDates has no registry data
    const result = await getOutdatedPackages("npm", dir, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toEqual([
      {
        name: "react",
        current: "18.0.0",
        wanted: "18.2.0",
        latest: "19.0.0",
        dependent: "",
        type: "global",
        selected: false,
        targetVersion: "19.0.0",
      },
    ]);
  });

  it("strips leading pnpm WARN noise before parsing the JSON", async () => {
    const raw = 'WARN deprecated\n{"typescript":{"current":"5.0.0","wanted":"5.2.0","latest":"5.3.0"}}';
    runMock.mockImplementation(runReturning(raw, 1));
    mockRegistry({});
    const result = await getOutdatedPackages("pnpm", dir, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["typescript"]);
    expect(result.packages[0].latest).toBe("5.3.0");
  });

  it("parses yarn's ndjson table output", async () => {
    const raw = '{"type":"table","data":{"body":[["lodash","4.17.20","4.17.21","4.17.21","dependencies"]]}}';
    runMock.mockImplementation(runReturning(raw, 1));
    mockRegistry({});
    const result = await getOutdatedPackages("yarn", dir, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toMatchObject([{ name: "lodash", current: "4.17.20", latest: "4.17.21", type: "global" }]);
  });

  it("treats empty stdout as no outdated packages", async () => {
    runMock.mockImplementation(runReturning("", 0));
    const result = await getOutdatedPackages("npm", dir, true);
    expect(result).toEqual({ ok: true, packages: [] });
  });

  it("errors on an unexpected exit code, surfacing stderr", async () => {
    runMock.mockImplementation(async () => ({ stdout: "", stderr: "boom", exitCode: 2 }));
    const result = await getOutdatedPackages("npm", dir, true);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("boom");
  });

  it("errors when the outdated JSON is schema-invalid", async () => {
    runMock.mockImplementation(runReturning(JSON.stringify({ react: { current: "18.0.0" } }), 1)); // no `latest`
    const result = await getOutdatedPackages("npm", dir, true);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Failed to parse/);
  });

  it("errors when stdout contains no JSON object", async () => {
    runMock.mockImplementation(async () => ({ stdout: "no json here", stderr: "the real error", exitCode: 0 }));
    const result = await getOutdatedPackages("npm", dir, true);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("the real error");
  });

  it("forwards only WARN/ERR lines from the manager's stderr stream", async () => {
    runMock.mockImplementation(async (_cmd, _args, opts) => {
      opts?.onData?.("npm warn deprecated foo\nregular progress line\n");
      return { stdout: "", stderr: "", exitCode: 0 };
    });
    const lines: string[] = [];
    await getOutdatedPackages("npm", dir, true, (l) => lines.push(l));
    expect(lines).toContain("npm warn deprecated foo");
    expect(lines).not.toContain("regular progress line");
  });
});

describe("global showAll list parsing", () => {
  it("parses `npm list -g --json` into installed packages", async () => {
    isManagerInstalled.mockImplementation((m) => m === "npm");
    runMock.mockImplementation(runReturning(JSON.stringify({ dependencies: { typescript: { version: "5.0.0" } } })));
    mockRegistry({ typescript: { "dist-tags": { latest: "5.3.0" }, versions: { "5.3.0": {} }, time: {} } });
    const result = await getAllGlobalOutdated(dir, undefined, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toMatchObject([
      { name: "typescript", current: "5.0.0", latest: "5.3.0", type: "global", manager: "npm" },
    ]);
  });

  it("unwraps pnpm's array-wrapped list output", async () => {
    isManagerInstalled.mockImplementation((m) => m === "pnpm");
    runMock.mockImplementation(runReturning(JSON.stringify([{ dependencies: { eslint: { version: "9.0.0" } } }])));
    mockRegistry({ eslint: { "dist-tags": { latest: "9.1.0" }, versions: { "9.1.0": {} }, time: {} } });
    const result = await getAllGlobalOutdated(dir, undefined, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toMatchObject([{ name: "eslint", current: "9.0.0", latest: "9.1.0", manager: "pnpm" }]);
  });

  it("splits name@version from yarn's tree output", async () => {
    isManagerInstalled.mockImplementation((m) => m === "yarn");
    const raw = '{"type":"tree","data":{"trees":[{"name":"prettier@3.0.0"},{"name":"@scope/pkg@1.2.3"}]}}';
    runMock.mockImplementation(runReturning(raw));
    mockRegistry({
      prettier: { "dist-tags": { latest: "3.1.0" }, versions: { "3.1.0": {} }, time: {} },
      "@scope/pkg": { "dist-tags": { latest: "1.3.0" }, versions: { "1.3.0": {} }, time: {} },
    });
    const result = await getAllGlobalOutdated(dir, undefined, true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => `${p.name}@${p.current}`)).toEqual(["prettier@3.0.0", "@scope/pkg@1.2.3"]);
  });
});

describe("major-pinned packages (@types/node)", () => {
  it("reports the newest release within the installed major, never a major jump", async () => {
    await writePkg({ "@types/node": "^24.0.0" });
    mockRegistry({
      "@types/node": {
        "dist-tags": { latest: "26.1.0" },
        versions: { "24.0.0": {}, "24.5.0": {}, "26.0.0": {}, "26.1.0": {} },
        time: {},
      },
    });
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toMatchObject([{ name: "@types/node", latest: "24.5.0" }]);
  });

  it("reports nothing when the installed major is already at its newest", async () => {
    await writePkg({ "@types/node": "^24.5.0" });
    mockRegistry({
      "@types/node": {
        "dist-tags": { latest: "26.1.0" },
        versions: { "24.0.0": {}, "24.5.0": {}, "26.1.0": {} },
        time: {},
      },
    });
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toEqual([]);
  });
});

describe("pre-release channel targeting", () => {
  it("compares a channelled dependency against that channel's dist-tag, not latest", async () => {
    await writePkg({ next: "^15.0.0-canary.1" });
    mockRegistry({
      next: {
        "dist-tags": { latest: "15.0.5", canary: "15.1.0-canary.3" },
        versions: { "15.0.5": {}, "15.1.0-canary.3": {} },
        time: {},
      },
    });
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages).toMatchObject([{ name: "next", latest: "15.1.0-canary.3" }]);
  });
});

describe("registry fetch retries", () => {
  it("retries a throwing request and succeeds on a later attempt", async () => {
    await writePkg({ react: "^18.0.0" });
    let calls = 0;
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      calls++;
      if (calls < 3) throw new Error("transient");
      return new Response(JSON.stringify({ "dist-tags": { latest: "19.0.0" }, versions: { "19.0.0": {} }, time: {} }));
    });
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.packages.map((p) => p.name)).toEqual(["react"]);
    expect(calls).toBe(3);
  });

  it("gives up after three failed attempts per package", async () => {
    await writePkg({ react: "^18.0.0" });
    let calls = 0;
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      calls++;
      throw new Error("down");
    });
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(false);
    expect(calls).toBe(3);
  });
});
