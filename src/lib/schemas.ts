import * as v from "valibot";

/** A package's `repository` field as it appears in npm metadata. */
export const NpmRepositorySchema = v.union([v.string(), v.object({ url: v.optional(v.string()) })]);

/**
 * A single published version's manifest (e.g. the `/:package/latest` endpoint).
 * Every published manifest carries a `version` (an npm invariant), so it is
 * required; `repository` is genuinely absent on many packages, so it stays
 * optional.
 */
export const NpmVersionManifestSchema = v.object({
  version: v.string(),
  repository: v.optional(NpmRepositorySchema),
});

/**
 * Full npm registry document for a package (`GET /:package`).
 * `dist-tags`, `versions` and `time` are registry-generated and always present
 * on the full (non-abbreviated) packument, so they are required. Only the
 * author-declared top-level `repository` may be missing.
 *
 * Only the *keys* of `versions` are ever read (the version list), never the
 * per-version manifest bodies — so the values are left unvalidated rather than
 * deep-checking thousands of entries on every fetch.
 */
export const NpmPackumentSchema = v.object({
  "dist-tags": v.record(v.string(), v.string()),
  versions: v.record(v.string(), v.unknown()),
  time: v.record(v.string(), v.string()),
  repository: v.optional(NpmRepositorySchema),
});

/**
 * A GitHub release (subset of the REST `/releases` response ripen uses).
 * `tag_name`, `html_url`, `draft` and `prerelease` are always present on a
 * release object; `body` is present but may be `null` when the release has no
 * notes.
 */
export const GitHubReleaseSchema = v.object({
  tag_name: v.string(),
  body: v.nullable(v.string()),
  html_url: v.string(),
  draft: v.boolean(),
  prerelease: v.boolean(),
});

export const GitHubReleasesSchema = v.array(GitHubReleaseSchema);

/** `npm ls -g --json` / `pnpm ls -g --json` output (subset). */
export const GlobalListOutputSchema = v.object({
  dependencies: v.optional(v.record(v.string(), v.object({ version: v.optional(v.string()) }))),
});

/** `pnpm ls -g --json` may wrap the result in a one-element array. */
export const GlobalListOutputArraySchema = v.array(GlobalListOutputSchema);

/** One ndjson line from `yarn global list --json`. */
export const YarnListLineSchema = v.object({
  type: v.string(),
  data: v.optional(v.object({ trees: v.array(v.object({ name: v.optional(v.string()) })) })),
});

/** One dependency entry in `npm`/`pnpm outdated --json`. */
export const OutdatedInfoSchema = v.object({
  current: v.optional(v.string()),
  wanted: v.optional(v.string()),
  latest: v.string(),
  dependent: v.optional(v.string()),
});

/** The full `npm`/`pnpm outdated --json` document: a record keyed by package name. */
export const OutdatedInfoRecordSchema = v.record(v.string(), OutdatedInfoSchema);

/** One ndjson line from `yarn outdated --json`. */
export const YarnOutdatedLineSchema = v.object({
  type: v.string(),
  data: v.optional(v.object({ body: v.array(v.array(v.string())) })),
});

export type NpmRepository = v.InferOutput<typeof NpmRepositorySchema>;
export type NpmVersionManifest = v.InferOutput<typeof NpmVersionManifestSchema>;
export type NpmPackument = v.InferOutput<typeof NpmPackumentSchema>;
export type GitHubRelease = v.InferOutput<typeof GitHubReleaseSchema>;
export type GlobalListOutput = v.InferOutput<typeof GlobalListOutputSchema>;
export type YarnListLine = v.InferOutput<typeof YarnListLineSchema>;
export type OutdatedInfo = v.InferOutput<typeof OutdatedInfoSchema>;
export type YarnOutdatedLine = v.InferOutput<typeof YarnOutdatedLineSchema>;
