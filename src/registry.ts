import type { RegistryVersion, ChangelogEntry } from "./types";
import { compareVersions, parseVersion } from "./lib/versions";

export { isNewerVersion } from "./lib/versions";

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
      .sort((a, b) => {
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
): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;

    const repo = extractGitHubRepo(data);
    if (!repo) return [];

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!ghRes.ok) return [];

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
      return [
        {
          version: latest.tag_name,
          body: latest.body?.trim() ?? "No release notes.",
          url: latest.html_url,
        },
      ];
    }

    // Sort ascending: oldest first so callers can start at index 0 (oldest change)
    return filtered.sort((a, b) => compareVersions(a.version, b.version));
  } catch {
    return [];
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
