import { execa } from "execa";
import { describe, expect, it } from "vitest";
import {
  GitHubReleasesSchema,
  GlobalListOutputArraySchema,
  GlobalListOutputSchema,
  NpmPackumentSchema,
  NpmVersionManifestSchema,
  OutdatedInfoRecordSchema,
} from "../src/lib/schemas";
import { fetchChangelog, fetchLatestVersion, fetchRepoUrl, fetchVersions } from "../src/registry";

/**
 * Real-world integration tests: NO mocking of `fetch()` or `execa()`.
 *
 * These hit the live npm registry, the GitHub API, and real package-manager
 * subprocesses to prove the valibot schemas actually match the shapes those
 * services emit today — the thing the unit tests (with fabricated payloads)
 * cannot guarantee. Validation uses vitest's built-in `expect.schemaMatching`,
 * which accepts any Standard Schema v1 validator (valibot qualifies).
 *
 * They are best-effort: when the network is unreachable, an endpoint is down,
 * GitHub's unauthenticated rate limit is exhausted, or a package manager is not
 * installed, the affected test **skips** instead of failing. A test only fails
 * when a real response is fetched but does NOT satisfy its schema — i.e. a
 * genuine drift between our schema and reality, which is exactly what we want
 * to catch. This keeps `pnpm check` deterministic offline/in CI while still
 * verifying real data whenever the machine is online.
 */

const NETWORK_TIMEOUT = 30_000;

/** Fetch JSON, or skip the test when the endpoint is unreachable / not ok. */
async function fetchJsonOrSkip(ctx: { skip: (note?: string) => never }, url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return ctx.skip("network unreachable");
  }
  if (!res.ok) return ctx.skip(`unexpected ${res.status} from ${url}`);
  return res.json();
}

describe("npm registry responses match their schemas (live)", () => {
  it(
    "full packument (GET /:package) validates against NpmPackumentSchema",
    async (ctx) => {
      const json = await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react");
      expect(json).toEqual(expect.schemaMatching(NpmPackumentSchema));
    },
    NETWORK_TIMEOUT,
  );

  it(
    "version manifest (GET /:package/latest) validates against NpmVersionManifestSchema",
    async (ctx) => {
      const json = await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react/latest");
      expect(json).toEqual(expect.schemaMatching(NpmVersionManifestSchema));
    },
    NETWORK_TIMEOUT,
  );

  it(
    "a scoped package's packument still validates (@types/node)",
    async (ctx) => {
      const json = await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/@types%2Fnode");
      expect(json).toEqual(expect.schemaMatching(NpmPackumentSchema));
    },
    NETWORK_TIMEOUT,
  );
});

describe("GitHub releases responses match GitHubReleasesSchema (live)", () => {
  it(
    "the public /releases endpoint validates",
    async (ctx) => {
      // Unauthenticated: may be rate-limited (403/429) → fetchJsonOrSkip skips.
      const json = await fetchJsonOrSkip(ctx, "https://api.github.com/repos/facebook/react/releases?per_page=5");
      expect(json).toEqual(expect.schemaMatching(GitHubReleasesSchema));
    },
    NETWORK_TIMEOUT,
  );
});

describe("registry.ts functions work end-to-end against live data", () => {
  it(
    "fetchLatestVersion returns a real semver string",
    async (ctx) => {
      // Probe reachability first so a network failure skips rather than fails
      // (fetchLatestVersion swallows errors and returns null on its own).
      await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react/latest");
      const version = await fetchLatestVersion("react");
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    },
    NETWORK_TIMEOUT,
  );

  it(
    "fetchVersions returns a non-empty, well-formed version list",
    async (ctx) => {
      await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react");
      const versions = await fetchVersions("react");
      expect(versions.length).toBeGreaterThan(0);
      for (const entry of versions) {
        expect(typeof entry.version).toBe("string");
        expect(typeof entry.date).toBe("string");
      }
    },
    NETWORK_TIMEOUT,
  );

  it(
    "fetchRepoUrl resolves react to a well-formed GitHub URL",
    async (ctx) => {
      await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react/latest");
      const url = await fetchRepoUrl("react");
      // Don't pin the owner/repo (npm metadata can change) — assert the shape,
      // which proves the manifest parsed and the repo was extracted.
      expect(url).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
    },
    NETWORK_TIMEOUT,
  );

  it(
    "fetchChangelog parses real GitHub release notes",
    async (ctx) => {
      const result = await fetchChangelog("react", "18.0.0", "18.2.0");
      // GitHub's unauthenticated rate limit is easily hit — skip in that case.
      if (result.rateLimited) ctx.skip("GitHub rate limit reached");
      // Not every version window has release notes on GitHub; only assert shape.
      for (const entry of result.entries) {
        expect(typeof entry.version).toBe("string");
        expect(typeof entry.body).toBe("string");
        expect(typeof entry.url).toBe("string");
      }
    },
    NETWORK_TIMEOUT,
  );
});

describe("package-manager CLI output matches its schema (live subprocess)", () => {
  it(
    "real `npm ls -g --json` validates against GlobalListOutputSchema",
    async (ctx) => {
      // Initialised so the (defensive) catch path leaves it definitely-assigned;
      // `ctx.skip()` throws before the value is ever read.
      let stdout = "";
      try {
        ({ stdout } = await execa("npm", ["ls", "-g", "--depth=0", "--json"], { reject: false }));
      } catch {
        ctx.skip("npm not available");
      }
      expect(JSON.parse(stdout)).toEqual(expect.schemaMatching(GlobalListOutputSchema));
    },
    NETWORK_TIMEOUT,
  );

  it(
    "real `pnpm ls -g --json` validates (object or one-element array form)",
    async (ctx) => {
      let stdout = "";
      try {
        ({ stdout } = await execa("pnpm", ["ls", "-g", "--json"], { reject: false }));
      } catch {
        ctx.skip("pnpm not available");
      }
      const json: unknown = JSON.parse(stdout);
      expect(json).toEqual(
        expect.schemaMatching(Array.isArray(json) ? GlobalListOutputArraySchema : GlobalListOutputSchema),
      );
    },
    NETWORK_TIMEOUT,
  );

  it(
    "real `npm outdated -g --json` validates against OutdatedInfoRecordSchema",
    async (ctx) => {
      let stdout = "";
      try {
        // `npm outdated` exits 1 when packages are outdated; reject:false keeps stdout.
        ({ stdout } = await execa("npm", ["outdated", "-g", "--json"], { reject: false }));
      } catch {
        ctx.skip("npm not available");
      }
      // Empty stdout means nothing is globally outdated — nothing to validate.
      const trimmed = stdout.trim();
      if (!trimmed || trimmed === "{}") ctx.skip("no globally-outdated packages");
      expect(JSON.parse(trimmed)).toEqual(expect.schemaMatching(OutdatedInfoRecordSchema));
    },
    NETWORK_TIMEOUT,
  );
});
