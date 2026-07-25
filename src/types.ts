// ── Package manager & project ────────────────────────────────────────

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export type ProjectInfo = {
  manager: PackageManager;
  cwd: string;
  name: string;
};

// ── Outdated packages ────────────────────────────────────────────────

export type OutdatedPackage = {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  dependent: string;
  type: "dependencies" | "devDependencies" | "global";
  /** Which package manager owns this package (relevant for global packages) */
  manager?: PackageManager;
  selected?: boolean;
  targetVersion?: string;
  /** Original range prefix from package.json (e.g. "^", "~") */
  rangePrefix?: string;
  /** ISO date when the `latest` version was published (fetched lazily) */
  latestPublishedAt?: string;
  /** ISO date when the chosen `targetVersion` was published (set by the version picker) */
  targetPublishedAt?: string;
};

export type FetchResult = { ok: true; packages: OutdatedPackage[] } | { ok: false; error: string };

// ── Config ───────────────────────────────────────────────────────────

export type RipenConfig = {
  /** Enable scope grouping */
  groupByScope: boolean;
  /** Scopes to sub-group (e.g. ["@heroui"] groups @heroui/* packages) */
  groupScopes: string[];
  /** Show grouped scopes at the top of their section */
  groupsOnTop: boolean;
  /** Sort packages by update frequency (most updated first) */
  frequencySort: boolean;
  /** Separate dependencies and devDependencies into separate groups (default: true) */
  separateDevDeps: boolean;
  /** Prepend "sfw" before every generated install command (default: false) */
  sfwFirewall: boolean;
};

// ── Registry ─────────────────────────────────────────────────────────

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

export type ChangelogResult = {
  entries: ChangelogEntry[];
  /**
   * True when GitHub refused the request due to rate limiting AND no auth token
   * was available — the UI uses this to suggest installing / logging into `gh`.
   */
  rateLimited?: boolean;
};

// ── External JSON shapes (npm registry, GitHub API, CLI output) ───────
// Only the fields ripen actually reads are declared. All are marked optional
// because they come from untrusted network / subprocess responses.

/** A package's `repository` field as it appears in npm metadata. */
export type NpmRepository = string | { url?: string };

/** A single published version's manifest (e.g. the `/:package/latest` endpoint). */
export type NpmVersionManifest = {
  version?: string;
  repository?: NpmRepository;
};

/** Full npm registry document for a package (`GET /:package`). */
export type NpmPackument = {
  "dist-tags"?: Record<string, string>;
  versions?: Record<string, NpmVersionManifest>;
  time?: Record<string, string>;
  repository?: NpmRepository;
};

/**
 * A GitHub release (subset of the REST `/releases` response ripen uses).
 * `tag_name`, `html_url`, `draft` and `prerelease` are always present on a
 * release object; `body` is present but may be `null` when the release has no
 * notes.
 */
export type GitHubRelease = {
  tag_name: string;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
};

/** `npm ls -g --json` / `pnpm ls -g --json` output (subset). */
export type GlobalListOutput = {
  dependencies?: Record<string, { version?: string }>;
};

/** One ndjson line from `yarn global list --json`. */
export type YarnListLine = {
  type: string;
  data?: { trees: Array<{ name?: string }> };
};

/** One dependency entry in `npm`/`pnpm outdated --json`. */
export type OutdatedInfo = {
  current?: string;
  wanted?: string;
  latest: string;
  dependent?: string;
};

/** One ndjson line from `yarn outdated --json`. */
export type YarnOutdatedLine = {
  type: string;
  data?: { body: string[][] };
};

// ── UI screens ───────────────────────────────────────────────────────

export type Screen =
  | "self-update-check"
  | "self-update"
  | "loading"
  | "list"
  | "version-picker"
  | "changelog"
  | "updating"
  | "results"
  | "empty"
  | "error"
  | "settings"
  | "cancelled";
