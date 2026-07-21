/**
 * Semver version parsing, comparison, and range utilities.
 *
 * Centralises logic that was previously duplicated across registry.ts and fetcher.ts.
 */

/**
 * Parse a version string into [major, minor, patch].
 * Strips any non-numeric prefix ("v", "next@", "package@v", etc.)
 * and any pre-release suffix ("-beta.1", etc.).
 */
export function parseVersion(v: string): number[] {
  return v
    .replace(/^[^0-9]*/, "")
    .replace(/-.*$/, "")
    .split(".")
    .map(Number);
}

/**
 * Compare two parsed version arrays.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The pre-release channel of a version: "16.3.0-preview.5" → "preview".
 * Returns "" for stable versions and for numeric-only pre-releases ("1.0.0-0"),
 * which carry no channel name.
 */
export function prereleaseChannel(v: string): string {
  const first = prereleaseIds(v)[0];
  return typeof first === "string" ? first : "";
}

/** Split the pre-release suffix into semver identifiers: "16.3.0-preview.6" → ["preview", 6]. */
function prereleaseIds(v: string): Array<string | number> {
  const idx = v.indexOf("-");
  if (idx === -1) return [];
  return v
    .slice(idx + 1)
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

/**
 * Full semver comparison, including pre-release precedence (semver §11).
 * Unlike `compareVersions`, this orders "1.0.0-beta.2" after "1.0.0-beta.1"
 * and both before the stable "1.0.0".
 */
export function compareFullVersions(a: string, b: string): number {
  const base = compareVersions(a, b);
  if (base !== 0) return base;

  const ia = prereleaseIds(a);
  const ib = prereleaseIds(b);
  if (ia.length === 0 && ib.length === 0) return 0;
  // A stable release outranks any pre-release of the same base version
  if (ia.length === 0) return 1;
  if (ib.length === 0) return -1;

  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const x = ia[i];
    const y = ib[i];
    // Fewer identifiers = lower precedence ("beta" < "beta.1")
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    // Numeric identifiers always rank lower than alphanumeric ones
    if (typeof x === "number") return -1;
    if (typeof y === "number") return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

/**
 * Returns true when `latest` is a newer version than `current`.
 *
 * Pre-release aware: "16.3.0-preview.5" → "16.3.0-preview.6" counts as an
 * update, and a pre-release is always older than the stable release that
 * shares its base version ("3.0.0-beta.8" < "3.0.0").
 */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareFullVersions(latest, current) > 0;
}

/**
 * Strip semver range prefixes to extract the base version and prefix.
 * e.g. "^9.3.0" → { version: "9.3.0", prefix: "^" }
 * Returns null for unparseable ranges (*, latest, git URLs, file: paths).
 */
export function parseBaseVersion(range: string): { version: string; prefix: string } | null {
  // Strip workspace: protocol
  let v = range.replace(/^workspace:/, "");
  // Extract and strip range prefix
  const prefixMatch = v.match(/^([~^>=<]+)/);
  const prefix = prefixMatch ? prefixMatch[1] : "";
  v = v.replace(/^[~^>=<]+/, "").trim();
  // Accept partial semver: "6", "6.2", "6.2.1" (optionally with pre-release)
  if (/^\d+(\.\d+(\.\d+)?)?/.test(v)) return { version: v, prefix };
  return null;
}
