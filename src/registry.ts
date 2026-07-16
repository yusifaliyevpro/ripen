import { execa } from "execa";
import { compareVersions, parseVersion } from "./lib/versions";
import type { RegistryVersion, ChangelogResult } from "./types";

export { isNewerVersion } from "./lib/versions";

let tokenPromise: Promise<string | null> | undefined;

/**
 * Get a GitHub token from the `gh` CLI (`gh auth token`). Unauthenticated
 * requests are limited to 60/hour per IP and are easily exhausted; an
 * authenticated request raises the limit to 5,000/hour. Returns null when
 * `gh` is not installed or the user is not logged in.
 *
 * Spawning `gh` is slow, so the *promise* is cached (not just the resolved
 * value): the first call kicks off one `gh` process and every later caller —
 * including a fire-and-forget prewarm at startup — shares that same result.
 * Call `prewarmGitHubToken()` when the app boots so the token is ready by the
 * time the user opens a changelog.
 */
export function githubToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    try {
      const { stdout, exitCode } = await execa("gh", ["auth", "token"], { reject: false });
      return exitCode === 0 && stdout.trim() ? stdout.trim() : null;
    } catch {
      return null;
    }
  })();
  return tokenPromise;
}

/** Fire-and-forget: warm the `gh auth token` cache without blocking. */
export function prewarmGitHubToken(): void {
  void githubToken();
}

export async function fetchVersions(packageName: string): Promise<RegistryVersion[]> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;

    const times: Record<string, string> = data.time ?? {};
    const distTags: Record<string, string> = data["dist-tags"] ?? {};

    const tagByVersion: Record<string, string> = {};
    for (const [tag, ver] of Object.entries(distTags)) {
      tagByVersion[ver as string] = tag;
    }

    const versions: RegistryVersion[] = Object.keys(data.versions ?? {})
      .filter((v) => !v.includes("-") || tagByVersion[v])
      .map((v) => ({
        version: v,
        date: times[v] ? new Date(times[v]).toISOString().split("T")[0] : "",
        tag: tagByVersion[v],
      }))
      .toSorted((a, b) => {
        const cmp = compareVersions(b.version, a.version);
        if (cmp !== 0) return cmp;
        // Same base version: stable (no prerelease) sorts before prerelease
        const aHas = a.version.includes("-");
        const bHas = b.version.includes("-");
        if (aHas && !bHas) return 1;
        if (!aHas && bHas) return -1;
        return 0;
      });

    return versions;
  } catch {
    return [];
  }
}

export async function fetchChangelog(
  packageName: string,
  fromVersion: string,
  toVersion: string,
): Promise<ChangelogResult> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return { entries: [] };
    const data = (await res.json()) as any;

    const repo = extractGitHubRepo(data);
    if (!repo) return { entries: [] };

    const token = await githubToken();
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, { headers });
    if (!ghRes.ok) {
      // 403/429 without a token means the unauthenticated rate limit is exhausted —
      // tell the UI so it can suggest logging in with `gh`.
      const rateLimited = (ghRes.status === 403 || ghRes.status === 429) && !token;
      return { entries: [], rateLimited };
    }

    const releases = (await ghRes.json()) as any[];

    const toMajor = parseVersion(toVersion)[0];
    const filtered = releases
      .filter((r) => {
        if (r.draft || r.prerelease) return false;
        // fromVersion="" = up-to-date case: show history for the same major version only
        if (fromVersion === "") {
          return parseVersion(r.tag_name)[0] === toMajor && compareVersions(r.tag_name, toVersion) <= 0;
        }
        return compareVersions(r.tag_name, fromVersion) > 0 && compareVersions(r.tag_name, toVersion) <= 0;
      })
      .map((r) => ({
        version: r.tag_name,
        body: r.body?.trim() ?? "No release notes.",
        url: r.html_url,
      }));

    // if nothing found with strict filter, return latest release as fallback
    if (filtered.length === 0 && releases.length > 0) {
      const latest = releases[0];
      return {
        entries: [
          {
            version: latest.tag_name,
            body: latest.body?.trim() ?? "No release notes.",
            url: latest.html_url,
          },
        ],
      };
    }

    // Sort ascending: oldest first so callers can start at index 0 (oldest change)
    return { entries: filtered.toSorted((a, b) => compareVersions(a.version, b.version)) };
  } catch {
    return { entries: [] };
  }
}

export async function fetchLatestVersion(packageName: string): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return data.version ?? null;
  } catch {
    return null;
  }
}

export async function fetchRepoUrl(packageName: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return "";
    const data = (await res.json()) as any;
    const repo = extractGitHubRepo(data);
    return repo ? `https://github.com/${repo}` : "";
  } catch {
    return "";
  }
}

export async function fetchPublishedAt(packageName: string, version: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!res.ok) return "";
    const data = (await res.json()) as any;
    return data.time?.[version] ?? "";
  } catch {
    return "";
  }
}

/**
 * Extract "owner/repo" from npm registry package data.
 * Handles both string and object repository fields.
 */
function extractGitHubRepo(data: any): string | null {
  const repoUrl: string = typeof data.repository === "string" ? data.repository : (data.repository?.url ?? "");
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+)/);
  if (!match) return null;
  return match[1]!.replace(/\.git$/, "");
}
