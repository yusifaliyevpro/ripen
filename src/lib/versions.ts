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
 * Returns true when `latest` is a newer version than `current`.
 *
 * Pre-release suffixes are stripped for the base comparison.
 * When base versions are equal, a pre-release current is considered
 * older than a stable latest (e.g. "3.0.0-beta.8" < "3.0.0").
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cmp = compareVersions(latest, current);
  if (cmp > 0) return true;
  if (cmp < 0) return false;
  // Base versions equal — pre-release current < stable latest
  if (current.includes("-") && !latest.includes("-")) return true;
  return false;
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
  // Must look like a semver version (digits.digits.digits, optionally with pre-release)
  if (/^\d+\.\d+\.\d+/.test(v)) return { version: v, prefix };
  return null;
}
