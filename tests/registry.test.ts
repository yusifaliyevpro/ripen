import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Avoid spawning the real `gh` CLI for githubToken(); pretend no token exists.
vi.mock("execa", () => ({
  execa: vi.fn<() => Promise<{ stdout: string; exitCode: number }>>(async () => ({ stdout: "", exitCode: 1 })),
}));

const { fetchChangelog, fetchLatestVersion, fetchRepoUrl, fetchVersions, isNewerVersion } =
  await import("../src/registry");

const originalFetch = globalThis.fetch;

function urlOf(input: Parameters<typeof fetch>[0]): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function mockFetch(handler: (url: string) => Response | Promise<Response>): void {
  globalThis.fetch = vi.fn<typeof fetch>(async (input) => handler(urlOf(input)));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("isNewerVersion (re-exported from lib/versions)", () => {
  it("is available from the registry module", () => {
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
  });
});

describe("fetchLatestVersion", () => {
  it("returns the version from /latest", async () => {
    mockFetch(() => json({ version: "3.4.5" }));
    expect(await fetchLatestVersion("ripencli")).toBe("3.4.5");
  });

  it("returns null on a non-ok response", async () => {
    mockFetch(() => json({}, 500));
    expect(await fetchLatestVersion("ripencli")).toBeNull();
  });

  it("returns null (never throws) when fetch rejects", async () => {
    globalThis.fetch = vi.fn<typeof fetch>(async () => {
      throw new Error("offline");
    });
    await expect(fetchLatestVersion("ripencli")).resolves.toBeNull();
  });

  it("does not request abbreviated metadata on /latest (registry answers 406)", async () => {
    // The real registry returns 406 Not Acceptable when the abbreviated
    // metadata accept header (application/vnd.npm.install-v1+json) is sent to
    // the /{pkg}/latest route — that header is only valid on the full
    // packument. Simulate that so the request must be registry-compatible.
    globalThis.fetch = vi.fn<typeof fetch>(async (_input, init) => {
      const accept = new Headers(init?.headers).get("accept") ?? "";
      if (accept.includes("application/vnd.npm.install-v1+json")) {
        return new Response("Not Acceptable", { status: 406 });
      }
      return json({ version: "3.4.5" });
    });
    expect(await fetchLatestVersion("ripencli")).toBe("3.4.5");
  });
});

describe("fetchVersions", () => {
  const packument = {
    "dist-tags": { latest: "2.0.0", next: "3.0.0-rc.1" },
    versions: {
      "1.0.0": {},
      "2.0.0": {},
      "2.0.0-beta.1": {},
      "3.0.0-rc.1": {},
    },
    time: {
      "1.0.0": "2024-01-01T00:00:00.000Z",
      "2.0.0": "2025-01-01T00:00:00.000Z",
      "3.0.0-rc.1": "2025-06-01T00:00:00.000Z",
    },
  };

  it("lists stable versions newest-first and hides untagged pre-releases", async () => {
    mockFetch(() => json(packument));
    const versions = await fetchVersions("some-pkg");
    const names = versions.map((v) => v.version);
    // 2.0.0-beta.1 has no dist-tag and current channel is stable → hidden
    expect(names).not.toContain("2.0.0-beta.1");
    // 3.0.0-rc.1 carries the `next` tag → shown
    expect(names).toContain("3.0.0-rc.1");
    expect(names).toEqual(["3.0.0-rc.1", "2.0.0", "1.0.0"]);
  });

  it("attaches dist-tags and preserves the full publish timestamp", async () => {
    mockFetch(() => json(packument));
    const versions = await fetchVersions("some-pkg");
    const latest = versions.find((v) => v.version === "2.0.0");
    expect(latest?.tag).toBe("latest");
    // The raw ISO timestamp must survive — truncating to YYYY-MM-DD collapses
    // the age of every version published on the same day (see same-day test).
    expect(latest?.date).toBe("2025-01-01T00:00:00.000Z");
  });

  it("keeps distinct timestamps for versions published on the same day", async () => {
    const sameDay = {
      "dist-tags": { latest: "1.1.3" },
      versions: { "1.1.1": {}, "1.1.2": {}, "1.1.3": {} },
      time: {
        "1.1.1": "2026-08-01T00:00:00.000Z",
        "1.1.2": "2026-08-01T06:00:00.000Z",
        "1.1.3": "2026-08-01T18:00:00.000Z",
      },
    };
    mockFetch(() => json(sameDay));
    const versions = await fetchVersions("pkg");
    const byVersion = Object.fromEntries(versions.map((v) => [v.version, v.date]));
    expect(byVersion["1.1.1"]).toBe("2026-08-01T00:00:00.000Z");
    expect(byVersion["1.1.2"]).toBe("2026-08-01T06:00:00.000Z");
    expect(byVersion["1.1.3"]).toBe("2026-08-01T18:00:00.000Z");
    // Three same-day versions must yield three distinct timestamps, not one.
    expect(new Set(versions.map((v) => v.date)).size).toBe(3);
  });

  it("leaves date empty when the registry has no publish time", async () => {
    mockFetch(() => json({ "dist-tags": { latest: "1.0.0" }, versions: { "1.0.0": {} }, time: {} }));
    const versions = await fetchVersions("pkg");
    expect(versions[0].date).toBe("");
  });

  it("shows same-channel pre-releases when the current version is a pre-release", async () => {
    mockFetch(() => json(packument));
    const versions = await fetchVersions("some-pkg", "2.0.0-beta.0");
    expect(versions.map((v) => v.version)).toContain("2.0.0-beta.1");
  });

  it("returns [] on a failed request", async () => {
    mockFetch(() => json({}, 404));
    expect(await fetchVersions("some-pkg")).toEqual([]);
  });
});

describe("fetchRepoUrl", () => {
  it("derives a GitHub URL from an object repository field", async () => {
    mockFetch(() => json({ version: "1.0.0", repository: { url: "git+https://github.com/facebook/react.git" } }));
    expect(await fetchRepoUrl("react")).toBe("https://github.com/facebook/react");
  });

  it("derives a GitHub URL from a string repository field", async () => {
    mockFetch(() => json({ version: "1.0.0", repository: "git+https://github.com/vercel/next.js.git" }));
    expect(await fetchRepoUrl("next")).toBe("https://github.com/vercel/next.js");
  });

  it("returns '' when there is no repository", async () => {
    mockFetch(() => json({ version: "1.0.0" }));
    expect(await fetchRepoUrl("no-repo")).toBe("");
  });
});

describe("fetchChangelog", () => {
  const withRepo = { version: "1.0.0", repository: { url: "https://github.com/owner/repo.git" } };

  it("returns entries strictly between fromVersion and toVersion, oldest first", async () => {
    mockFetch((url) => {
      if (url.includes("registry.npmjs.org")) return json(withRepo);
      return json([
        { tag_name: "v2.0.0", body: "two", html_url: "u2", draft: false, prerelease: false },
        { tag_name: "v1.5.0", body: "one-five", html_url: "u15", draft: false, prerelease: false },
        { tag_name: "v1.0.0", body: "one", html_url: "u1", draft: false, prerelease: false },
      ]);
    });
    const { entries } = await fetchChangelog("pkg", "1.0.0", "2.0.0");
    expect(entries.map((e) => e.version)).toEqual(["v1.5.0", "v2.0.0"]);
  });

  it("skips draft and prerelease releases", async () => {
    mockFetch((url) => {
      if (url.includes("registry.npmjs.org")) return json(withRepo);
      return json([
        { tag_name: "v2.0.0", body: "stable", html_url: "u2", draft: false, prerelease: false },
        { tag_name: "v1.9.0", body: "draft", html_url: "ud", draft: true, prerelease: false },
        { tag_name: "v1.8.0", body: "pre", html_url: "up", draft: false, prerelease: true },
      ]);
    });
    const { entries } = await fetchChangelog("pkg", "1.0.0", "2.0.0");
    expect(entries.map((e) => e.version)).toEqual(["v2.0.0"]);
  });

  it("flags rateLimited on a 403 without a token", async () => {
    mockFetch((url) => {
      if (url.includes("registry.npmjs.org")) return json(withRepo);
      return new Response("rate limited", { status: 403 });
    });
    const result = await fetchChangelog("pkg", "1.0.0", "2.0.0");
    expect(result.entries).toEqual([]);
    expect(result.rateLimited).toBe(true);
  });

  it("returns no entries when the package has no GitHub repo", async () => {
    mockFetch(() => json({ version: "1.0.0" }));
    expect(await fetchChangelog("pkg", "1.0.0", "2.0.0")).toEqual({ entries: [] });
  });

  it("falls back to no entries when GitHub returns a schema-invalid release list", async () => {
    // The releases payload is not the expected array-of-releases shape (here the
    // required fields are missing / mistyped). valibot rejects it, and the
    // fetcher must degrade to an empty result instead of trusting bad data.
    mockFetch((url) => {
      if (url.includes("registry.npmjs.org")) return json(withRepo);
      return json([{ tag_name: 123, draft: "nope" }]);
    });
    expect(await fetchChangelog("pkg", "1.0.0", "2.0.0")).toEqual({ entries: [] });
  });
});

describe("schema validation of registry responses", () => {
  it("fetchVersions returns [] when the packument shape is invalid", async () => {
    // `versions` must be an object keyed by version; a string here is invalid.
    mockFetch(() => json({ versions: "not-an-object" }));
    expect(await fetchVersions("pkg")).toEqual([]);
  });

  it("fetchLatestVersion returns null when `version` is not a string", async () => {
    mockFetch(() => json({ version: 42 }));
    expect(await fetchLatestVersion("pkg")).toBeNull();
  });
});
