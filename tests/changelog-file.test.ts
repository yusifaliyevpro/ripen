import { describe, expect, it } from "vitest";
import { githubSlug, parseChangelogFile } from "../src/lib/changelog-file";

const keepAChangelog = `# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- wip

## [5.5.0] - 2026-10-16

### Changed
- Updated \`argparse\` to v3.

## [5.4.3] - 2026-10-06

### Fixed
- Fixed loading a whitespace-only block scalar.

[5.5.0]: https://github.com/nodeca/js-yaml/compare/5.4.3...5.5.0
[5.4.3]: https://github.com/nodeca/js-yaml/compare/5.4.2...5.4.3
`;

describe("parseChangelogFile", () => {
  it("splits a Keep a Changelog file into versioned sections, skipping Unreleased", () => {
    const sections = parseChangelogFile(keepAChangelog);
    expect(sections.map((s) => s.version)).toEqual(["5.5.0", "5.4.3"]);
    expect(sections[0].heading).toBe("[5.5.0] - 2026-10-16");
    expect(sections[0].body).toBe("### Changed\n- Updated `argparse` to v3.");
  });

  it("drops trailing link reference definitions from the last section", () => {
    const sections = parseChangelogFile(keepAChangelog);
    expect(sections[1].body).toBe("### Fixed\n- Fixed loading a whitespace-only block scalar.");
  });

  it("handles changesets and conventional-changelog headings", () => {
    const text = [
      "# pkg",
      "## 2.0.0",
      "### Major Changes",
      "- big",
      "## [1.1.0](https://github.com/o/r/compare/v1.0.0...v1.1.0) (2024-01-01)",
      "- feature",
      "### v1.0.1 (2023-12-01)",
      "- fix",
    ].join("\n");
    const sections = parseChangelogFile(text);
    expect(sections.map((s) => s.version)).toEqual(["2.0.0", "1.1.0", "1.0.1"]);
    expect(sections[0].body).toBe("### Major Changes\n- big");
  });

  it("returns no sections when the file has no version headings", () => {
    expect(parseChangelogFile("# Changelog\n\nSee the website for release notes.")).toEqual([]);
  });
});

describe("githubSlug", () => {
  it("matches GitHub's heading anchors", () => {
    expect(githubSlug("[5.5.0] - 2026-10-16")).toBe("550---2026-10-16");
    expect(githubSlug("v1.0.1 (2023-12-01)")).toBe("v101-2023-12-01");
  });
});
