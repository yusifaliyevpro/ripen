import { describe, expect, it } from "vitest";
import { run } from "../src/lib/run";
import {
  GitHubReleasesSchema,
  GlobalListOutputArraySchema,
  GlobalListOutputSchema,
  NpmPackumentSchema,
  NpmVersionManifestSchema,
  OutdatedInfoRecordSchema,
} from "../src/lib/schemas";
import { fetchChangelog, fetchLatestVersion, fetchRepoUrl, fetchVersions, githubToken } from "../src/registry";

// Real-world integration tests: NO mocking of `fetch()` or `run()`.
const NETWORK_TIMEOUT = 30_000;

const NETWORK_ATTEMPTS = 3;

/** Fetch JSON, or skip the test when the endpoint is unreachable / not ok. */
async function fetchJsonOrSkip(
  ctx: { skip: (note?: string) => never },
  url: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  let badStatus = 0;
  for (let attempt = 0; attempt < NETWORK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, headers ? { headers } : undefined);
      if (!res.ok) {
        badStatus = res.status;
        break;
      }
      // Reading the body is inside the try on purpose: npm's CDN sometimes drops
      // a multi-MB packument mid-stream, which throws from res.json(), not fetch().
      return await res.json();
    } catch {
      // Retry — a dropped connection is transient, unlike a non-ok status.
    }
  }
  return ctx.skip(badStatus ? `unexpected ${badStatus} from ${url}` : "network unreachable");
}

/**
 * Retry a registry.ts call that swallows its own network errors and returns a
 * fallback, so one dropped connection doesn't read as a real empty result.
 */
async function retryUntil<T>(fn: () => Promise<T>, isGood: (value: T) => boolean): Promise<T> {
  let value = await fn();
  for (let attempt = 1; attempt < NETWORK_ATTEMPTS && !isGood(value); attempt++) {
    value = await fn();
  }
  return value;
}

describe.concurrent("npm registry responses match their schemas (live)", () => {
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

describe.concurrent("GitHub releases responses match GitHubReleasesSchema (live)", () => {
  it(
    "the public /releases endpoint validates",
    async (ctx) => {
      // Authenticate with the same `gh auth token` the app uses (registry.ts), so
      // the 5,000/hr limit applies instead of the easily-exhausted 60/hr one. When
      // `gh` is absent/logged-out the request falls back to unauthenticated and
      // fetchJsonOrSkip skips on the resulting 403/429.
      const token = await githubToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const json = await fetchJsonOrSkip(
        ctx,
        "https://api.github.com/repos/facebook/react/releases?per_page=5",
        headers,
      );
      expect(json).toEqual(expect.schemaMatching(GitHubReleasesSchema));
    },
    NETWORK_TIMEOUT,
  );
});

describe.concurrent("registry.ts functions work end-to-end against live data", () => {
  it(
    "fetchLatestVersion returns a real semver string",
    async (ctx) => {
      // Probe reachability first so a network failure skips rather than fails
      // (fetchLatestVersion swallows errors and returns null on its own).
      await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react/latest");
      const version = await retryUntil(
        () => fetchLatestVersion("react"),
        (v) => v !== null,
      );
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    },
    NETWORK_TIMEOUT,
  );

  it(
    "fetchVersions returns a non-empty, well-formed version list",
    async (ctx) => {
      // Probe the tiny /latest endpoint, not the 7MB packument fetchVersions
      // itself pulls — reachability is all this needs, and the extra download
      // only adds another chance for the CDN to drop a connection.
      await fetchJsonOrSkip(ctx, "https://registry.npmjs.org/react/latest");
      const versions = await retryUntil(
        () => fetchVersions("react"),
        (list) => list.length > 0,
      );
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
      const url = await retryUntil(
        () => fetchRepoUrl("react"),
        (u) => u !== "",
      );
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

describe.concurrent("package-manager CLI output matches its schema (live subprocess)", () => {
  it(
    "real `npm ls -g --json` validates against GlobalListOutputSchema",
    async (ctx) => {
      // Initialised so the (defensive) catch path leaves it definitely-assigned;
      // `ctx.skip()` throws before the value is ever read.
      let stdout = "";
      try {
        ({ stdout } = await run("npm", ["ls", "-g", "--depth=0", "--json"]));
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
        ({ stdout } = await run("pnpm", ["ls", "-g", "--json"]));
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
        // `npm outdated` exits 1 when packages are outdated; run() keeps stdout.
        ({ stdout } = await run("npm", ["outdated", "-g", "--json"]));
      } catch {
        ctx.skip("npm not available");
      }
      // Empty stdout means nothing is globally outdated — an empty record `{}`,
      // which is itself a valid OutdatedInfoRecordSchema, so validate it too.
      const trimmed = stdout.trim() || "{}";
      expect(JSON.parse(trimmed)).toEqual(expect.schemaMatching(OutdatedInfoRecordSchema));
    },
    NETWORK_TIMEOUT,
  );
});
