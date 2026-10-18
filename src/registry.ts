import * as v from "valibot";
import { githubSlug, parseChangelogFile } from "./lib/changelog-file";
import { run } from "./lib/run";
import { GitHubReleasesSchema, NpmPackumentSchema, NpmVersionManifestSchema, type NpmRepository } from "./lib/schemas";
import {
  compareFullVersions,
  compareVersions,
  MAJOR_PINNED_PACKAGES,
  parseVersion,
  prereleaseChannel,
} from "./lib/versions";
import type { RegistryVersion, ChangelogProgress, ChangelogResult } from "./types";

export { isNewerVersion } from "./lib/versions";

let tokenPromise: Promise<string | null> | undefined;

export function githubToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    try {
      const { stdout, exitCode } = await run("gh", ["auth", "token"]);
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
 * List versions for the picker. Pre-releases are hidden unless tagged or in `currentVersion`'s channel.
 * Major-pinned packages (see {@link MAJOR_PINNED_PACKAGES}) list every version of the current major but only the latest of others.
 */
export async function fetchVersions(packageName: string, currentVersion = ""): Promise<RegistryVersion[]> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!res.ok) return [];
    const data = v.parse(NpmPackumentSchema, await res.json());

    const times: Record<string, string> = data.time ?? {};
    const distTags: Record<string, string> = data["dist-tags"] ?? {};

    const tagByVersion: Record<string, string> = {};
    for (const [tag, ver] of Object.entries(distTags)) {
      tagByVersion[ver] = tag;
    }

    const channel = prereleaseChannel(currentVersion);

    const versions: RegistryVersion[] = Object.keys(data.versions ?? {})
      .filter((ver) => {
        if (!ver.includes("-")) return true;
        if (tagByVersion[ver]) return true;
        return channel !== "" && prereleaseChannel(ver) === channel;
      })
      .map((ver) => ({
        version: ver,
        // Keep the full ISO timestamp — truncating to YYYY-MM-DD makes every
        // version published on the same day report the same age in the picker.
        date: times[ver] ?? "",
        tag: tagByVersion[ver],
      }))
      .toSorted((a, b) => compareFullVersions(b.version, a.version));

    if (MAJOR_PINNED_PACKAGES.has(packageName) && currentVersion) {
      const currentMajor = parseVersion(currentVersion)[0];
      const seenOtherMajors = new Set<number>();
      // versions is sorted newest-first, so the first row of each other major is its latest.
      return versions.filter((ver) => {
        const major = parseVersion(ver.version)[0];
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
  onProgress?: (step: ChangelogProgress) => void,
): Promise<ChangelogResult> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return { entries: [] };
    const data = v.parse(NpmVersionManifestSchema, await res.json());

    const repo = extractGitHubRepo(data);
    if (!repo) return { entries: [] };
    const directory = typeof data.repository === "object" ? data.repository.directory : undefined;

    const toMajor = parseVersion(toVersion)[0];
    const inRange = (version: string) =>
      // fromVersion="" = up-to-date case: show history for the same major version only
      fromVersion === ""
        ? parseVersion(version)[0] === toMajor && compareVersions(version, toVersion) <= 0
        : compareVersions(version, fromVersion) > 0 && compareVersions(version, toVersion) <= 0;

    const fromChangelogFile = (allowFullFile: boolean) => {
      onProgress?.("changelog-file");
      return fetchChangelogFile(repo, directory, inRange, allowFullFile);
    };

    const token = await githubToken();
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, { headers });
    if (!ghRes.ok) {
      // raw.githubusercontent.com isn't covered by the API rate limit, so the file may still load.
      const fromFile = await fromChangelogFile(true);
      if (fromFile) return fromFile;
      // 403/429 without a token means the unauthenticated rate limit is exhausted —
      // tell the UI so it can suggest logging in with `gh`.
      const rateLimited = (ghRes.status === 403 || ghRes.status === 429) && !token;
      return { entries: [], rateLimited };
    }

    const releases = v.parse(GitHubReleasesSchema, await ghRes.json());

    const filtered = releases
      .filter((r) => !r.draft && !r.prerelease && inRange(r.tag_name))
      .map((r) => ({
        version: r.tag_name,
        body: r.body?.trim() ?? "No release notes.",
        url: r.html_url,
      }));

    if (filtered.length === 0) {
      // Only show the whole file when the repo has no releases at all; otherwise the latest release is a better fallback.
      const fromFile = await fromChangelogFile(releases.length === 0);
      if (fromFile) return fromFile;
    }

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

const CHANGELOG_FILE_NAMES = ["CHANGELOG.md", "changelog.md", "CHANGES.md", "HISTORY.md"];

/**
 * Read a changelog file from the repo's default branch, split per version when it follows a known format.
 * Returns null when there's no file, or (unless `allowFullFile`) no section in range.
 */
async function fetchChangelogFile(
  repo: string,
  directory: string | undefined,
  inRange: (version: string) => boolean,
  allowFullFile: boolean,
): Promise<ChangelogResult | null> {
  const dir = directory?.replace(/^\.?\/+|\/+$/g, "");
  const paths = [...(dir ? CHANGELOG_FILE_NAMES.map((name) => `${dir}/${name}`) : []), ...CHANGELOG_FILE_NAMES];

  const texts = await Promise.all(
    paths.map(async (path) => {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${path}`);
        return res.ok ? await res.text() : null;
      } catch {
        return null;
      }
    }),
  );
  const index = texts.findIndex((text) => text !== null);
  if (index === -1) return null;
  const path = paths[index];
  const text = texts[index]!;
  const fileUrl = `https://github.com/${repo}/blob/HEAD/${path}`;

  const sections = parseChangelogFile(text).filter((s) => inRange(s.version));
  if (sections.length > 0) {
    return {
      entries: sections
        .map((s) => ({
          version: s.version,
          body: s.body || "No release notes.",
          url: `${fileUrl}#${githubSlug(s.heading)}`,
        }))
        .toSorted((a, b) => compareVersions(a.version, b.version)),
      file: { name: path, url: fileUrl, structured: true },
    };
  }

  if (!allowFullFile) return null;
  return {
    entries: [{ version: path, body: text.trim(), url: fileUrl }],
    file: { name: path, url: fileUrl, structured: false },
  };
}

/**
 * Best-effort "latest version on npm" for the self-update check; hits `/latest` with a short timeout, null on failure.
 * Must use the default accept header — the abbreviated-metadata one (`application/vnd.npm.install-v1+json`) 406s on `/latest`.
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
      const data = v.parse(NpmVersionManifestSchema, await res.json());
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
    const data = v.parse(NpmVersionManifestSchema, await res.json());
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
    const data = v.parse(NpmPackumentSchema, await res.json());
    return data.time?.[version] ?? "";
  } catch {
    return "";
  }
}

/** Extract "owner/repo" from npm package data (string or object repository field). */
function extractGitHubRepo(data: { repository?: NpmRepository }): string | null {
  const repoUrl: string = typeof data.repository === "string" ? data.repository : (data.repository?.url ?? "");
  const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+)/);
  if (!match) return null;
  return match[1].replace(/\.git$/, "");
}
