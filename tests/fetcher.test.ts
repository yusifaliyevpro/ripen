import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// getOutdatedPackages (via registry) imports execa — never spawn it in tests.
vi.mock("execa", () => ({
  execa: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
}));

const { getOutdatedPackages } = await import("../src/fetcher");

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

  it("errors when every registry request fails (offline)", async () => {
    await writePkg({ react: "^18.0.0" });
    mockRegistry({}); // every lookup 404s
    const result = await getOutdatedPackages("pnpm", dir);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/npm registry/i);
  });
});
