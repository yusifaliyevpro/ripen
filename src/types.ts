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
};

export type FetchResult = { ok: true; packages: OutdatedPackage[] } | { ok: false; error: string };

// ── Update results ───────────────────────────────────────────────────

export type UpdateResult = {
  name: string;
  fromVersion: string;
  version: string;
  success: boolean;
  error?: string;
};

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
  | "self-update-done"
  | "cancelled";
