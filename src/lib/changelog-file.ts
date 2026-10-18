export type ChangelogSection = {
  version: string;
  /** Heading text without the leading `#`s, used for GitHub's anchor slug. */
  heading: string;
  body: string;
};

// `## [1.2.3] - date`, `## 1.2.3`, `### v1.2.3 (date)`, `## [1.2.3](compare-url) (date)`
const VERSION_HEADING = /^#{1,3}\s+(\[?v?(\d+\.\d+\.\d+(?:-[\w.]+)?)\]?.*)$/;
const ANY_HEADING = /^(#{1,6})\s/;
const LINK_REFERENCE = /^\[[^\]]+\]:\s+\S+/;

/** Split a CHANGELOG.md (Keep a Changelog, changesets, conventional-changelog…) into per-version sections. */
export function parseChangelogFile(text: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: { version: string; heading: string; level: number; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines
      .filter((line) => !LINK_REFERENCE.test(line))
      .join("\n")
      .trim();
    sections.push({ version: current.version, heading: current.heading, body });
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(VERSION_HEADING);
    if (match) {
      flush();
      current = { version: match[2], heading: match[1].trim(), level: line.match(ANY_HEADING)![1].length, lines: [] };
      continue;
    }
    // A heading above the version level (e.g. `## [Unreleased]` under `##` versions) ends the section.
    const heading = line.match(ANY_HEADING);
    if (current && heading && heading[1].length <= current.level) {
      flush();
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  return sections;
}

/** GitHub's heading anchor: lowercase, drop punctuation except `-`, spaces → `-`. */
export function githubSlug(heading: string): string {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}
