export type RegistryVersion = {
  version: string;
  date: string;
  tag?: string;
};

export type ChangelogEntry = {
  version: string;
  body: string;
  url: string;
};

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
        const pa = a.version.split(".").map(Number);
        const pb = b.version.split(".").map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
        }
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

    const repoUrl: string = typeof data.repository === "string" ? data.repository : (data.repository?.url ?? "");

    const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+)/);
    if (!match) return [];

    const repo = match[1]!.replace(/\.git$/, "");

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!ghRes.ok) return [];

    const releases = (await ghRes.json()) as any[];

    // strip any non-numeric prefix like "v", "next@", "package@v" etc.
    const parseVer = (v: string): number[] =>
      v
        .replace(/^[^0-9]*/, "")
        .split(".")
        .map(Number);

    const cmpVer = (a: number[], b: number[]): number => {
      for (let i = 0; i < 3; i++) {
        const diff = (a[i] ?? 0) - (b[i] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    };

    const from = parseVer(fromVersion);
    const to = parseVer(toVersion);

    const filtered = releases
      .filter((r) => {
        if (r.draft || r.prerelease) return false;
        const ver = parseVer(r.tag_name);
        // include: from < ver <= to
        return cmpVer(ver, from) > 0 && cmpVer(ver, to) <= 0;
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

    return filtered;
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

export function isNewerVersion(current: string, latest: string): boolean {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((b[i] ?? 0) > (a[i] ?? 0)) return true;
    if ((b[i] ?? 0) < (a[i] ?? 0)) return false;
  }
  return false;
}

export async function fetchRepoUrl(packageName: string): Promise<string> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return "";
    const data = (await res.json()) as any;

    const repoUrl: string = typeof data.repository === "string" ? data.repository : (data.repository?.url ?? "");

    const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/]+)/);
    if (!match) return "";

    const repo = match[1]!.replace(/\.git$/, "");
    return `https://github.com/${repo}`;
  } catch {
    return "";
  }
}
