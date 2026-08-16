// ── Package manager & project ────────────────────────────────────────

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

/** The parsed `package.json` fields ripen reads. */
export type PackageJson = {
  name?: string;
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
};

export type ProjectInfo = {
  manager: PackageManager;
  cwd: string;
  name: string;
  /**
   * The parsed `package.json`, read once during detection and reused by the
   * fetcher so it isn't read and parsed a second time. `null` when the file is
   * missing or unparseable (the fetcher then re-reads to surface the error).
   */
  packageJson: PackageJson | null;
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
  /** Full ISO publish timestamp (not just the date) so ages are accurate to the hour. */
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
// The npm-registry / GitHub-API response shapes and the package-manager CLI
// output shapes are validated at runtime with valibot; their TypeScript types
// are inferred from those schemas. See `lib/schemas.ts`. Re-exported here so the
// rest of the codebase keeps a single import site for shared types.
export type {
  NpmRepository,
  NpmVersionManifest,
  NpmPackument,
  GitHubRelease,
  GlobalListOutput,
  YarnListLine,
  OutdatedInfo,
  YarnOutdatedLine,
} from "./lib/schemas";

// ── UI screens ───────────────────────────────────────────────────────

export type Screen =
  | "self-update"
  | "loading"
  | "list"
  | "version-picker"
  | "changelog"
  | "empty"
  | "error"
  | "settings";
