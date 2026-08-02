import { execa } from "execa";
import {
  compareFullVersions,
  compareVersions,
  MAJOR_PINNED_PACKAGES,
  parseVersion,
  prereleaseChannel,
} from "./lib/versions";
import type {
  RegistryVersion,
  ChangelogResult,
  NpmPackument,
  NpmVersionManifest,
  NpmRepository,
  GitHubRelease,
} from "./types";

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

/**
 * List versions for the picker.
 *
 * Pre-releases are noisy (`next` has hundreds of canaries), so they are hidden
 * unless they carry a dist-tag — *or* they belong to the same channel as
 * `currentVersion`. Someone sitting on `16.3.0-preview.5` needs to see every
 * `preview.*` to move within that channel.
 *
 * For major-pinned packages (see {@link MAJOR_PINNED_PACKAGES}, e.g.
 * `@types/node`) every version of the currently-installed major is listed, but
 * other majors are collapsed to just their latest release — so a `24.x` user
 * scrolls their whole line yet still sees one `26.x`, one `25.x`, etc.
 */
export async function fetchVersions(packageName: string, currentVersion = ""): Promise<RegistryVersion[]> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!res.ok) return [];
    const data: NpmPackument = await res.json();

    const times: Record<string, string> = data.time ?? {};
    const distTags: Record<string, string> = data["dist-tags"] ?? {};

    const tagByVersion: Record<string, string> = {};
    for (const [tag, ver] of Object.entries(distTags)) {
      tagByVersion[ver] = tag;
    }

    const channel = prereleaseChannel(currentVersion);

    const versions: RegistryVersion[] = Object.keys(data.versions ?? {})
      .filter((v) => {
        if (!v.includes("-")) return true;
        if (tagByVersion[v]) return true;
        return channel !== "" && prereleaseChannel(v) === channel;
      })
      .map((v) => ({
        version: v,
        // Keep the full ISO timestamp — truncating to YYYY-MM-DD makes every
        // version published on the same day report the same age in the picker.
        date: times[v] ?? "",
        tag: tagByVersion[v],
      }))
      .toSorted((a, b) => compareFullVersions(b.version, a.version));

    if (MAJOR_PINNED_PACKAGES.has(packageName) && currentVersion) {
      const currentMajor = parseVersion(currentVersion)[0];
      const seenOtherMajors = new Set<number>();
      // versions is sorted newest-first, so the first row of each other major is its latest.
      return versions.filter((v) => {
        const major = parseVersion(v.version)[0];
        if (major === currentMajor) return true;
        if (seenOtherMajors.has(major)) return false;
        seenOtherMajors.add(major);
        return true;
      });
    }

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
    const data: NpmVersionManifest = await res.json();

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

    const releases: GitHubRelease[] = await ghRes.json();

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

/**
 * Best-effort "latest version on npm" lookup for the self-update check. Runs
 * fire-and-forget in the background, so it hits the small `/latest` version
 * manifest with a short timeout, and resolves to null on any failure.
 *
 * NOTE: the abbreviated-metadata accept header
 * (`application/vnd.npm.install-v1+json`) is only valid on the full packument
 * route — sending it to `/{pkg}/latest` makes the registry answer 406, so the
 * `/latest` request must use the default accept.
 */
export async function fetchLatestVersion(packageName: string, timeoutMs = 3000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data: NpmVersionManifest = await res.json();
      return data.version ?? null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function fetchRepoUrl(packageName: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return "";
    const data: NpmVersionManifest = await res.json();
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
    const data: NpmPackument = await res.json();
    return data.time?.[version] ?? "";
  } catch {
    return "";
  }
}

/**
 * Extract "owner/repo" from npm registry package data.
 * Handles both string and object repository fields.
 */
function extractGitHubRepo(data: { repository?: NpmRepository }): string | null {
  const repoUrl: string = typeof data.repository === "string" ? data.repository : (data.repository?.url ?? "");
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+)/);
  if (!match) return null;
  return match[1].replace(/\.git$/, "");
}
