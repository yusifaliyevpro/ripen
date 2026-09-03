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
  /** Parsed `package.json` from detection, reused by the fetcher; `null` when missing/unparseable (fetcher re-reads to surface the error). */
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
  /** True when GitHub rate-limited the request with no auth token — the UI suggests logging into `gh`. */
  rateLimited?: boolean;
};

// ── External JSON shapes (npm registry, GitHub API, CLI output) ───────
// Validated at runtime with valibot, types inferred from those schemas (see `lib/schemas.ts`); re-exported for a single import site.
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
