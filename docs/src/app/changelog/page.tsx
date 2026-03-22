import type { Metadata } from "next";
import { ChangelogEntry } from "@/components/ChangelogEntry";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Version history and release notes for ripen.",
};

export default function ChangelogPage() {
  return (
    <>
      <ChangelogEntry version="0.3.1" date="March 22, 2025" title="Add Home Page Link to package.json">
        <p>
          Added a <strong>homepage</strong> field to the package.json metadata, linking to the ripen homepage at{" "}
          <a href="https://ripencli.vercel.app" className="text-orange hover:underline">
            https://ripencli.vercel.app
          </a>
          . This provides users with an easy way to find more information about ripen and access the documentation
          directly from the npm registry.
        </p>
      </ChangelogEntry>
      <ChangelogEntry
        version="0.3.0"
        date="March 22, 2025"
        title="Enhanced MetaData and Website Redesign"
        image="/changelog/030_banner.png"
      >
        <p>Welcome to ripen 0.3.0! This major release includes several exciting features and improvements:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Enhanced MetaData</strong> — Redesigned Website interface with improved usability and visual appeal
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.9" date="March 22, 2025" title="Pre-release Version Support">
        <p>
          Fixed version comparison for <strong>pre-release versions</strong> (e.g.,{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">3.0.0-beta.8</code>
          ). Packages with pre-release current versions were previously ignored during the outdated check.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Version comparison fix</strong> — pre-release suffixes are now stripped before comparing semver
            bases, and a pre-release is correctly detected as older than its stable release
          </li>
          <li>
            <strong>Wider version columns</strong> — increased column width from 10 to 14 characters to prevent long
            version strings from wrapping to two lines
          </li>
          <li>
            <strong>Version sorting fix</strong> — version picker now correctly sorts pre-release versions relative to
            their stable counterparts
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.8" date="March 2025" title="Settings Delete Shortcut">
        <p>
          Enhanced the Settings screen with a new delete shortcut for removing grouped scopes directly from the settings
          UI.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.7" date="March 2025" title="Frequency Sorting">
        <p>
          Added <strong>frequency sorting</strong> — packages you update often can now be surfaced to the top of the
          list. Enhanced README with settings documentation.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.6" date="February 2025" title="Configuration System">
        <p>
          Introduced the <strong>configuration system</strong> with support for:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Frequency tracking</strong> — tracks how many times each package is updated
          </li>
          <li>
            <strong>Scope grouping</strong> — group scoped packages (e.g.,{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">@heroui/*</code>)
            together
          </li>
          <li>
            <strong>Groups on top</strong> — option to display grouped scopes before ungrouped packages
          </li>
          <li>
            <strong>Custom scopes</strong> — user-configurable list of scopes to group
          </li>
        </ul>
        <p className="mt-2">
          Settings are persisted at{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
            ~/.config/ripen/config.json
          </code>
          .
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.5" date="February 2025" title="Codebase Refactoring">
        <p>
          Refactored all{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">interface</code>{" "}
          declarations to{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">type</code> across
          the entire codebase for consistency and better TypeScript patterns.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.4" date="January 2025" title="TypeScript & Exit Handling">
        <p>
          TypeScript improvements and optimization pass. Better{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">Ctrl+C</code>{" "}
          handling for cleaner process exits.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.2" date="January 2025" title="Performance Improvements">
        <p>
          Performance improvements with reduced UI flickering during package list rendering. Smoother scrolling and
          selection experience.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.9" date="December 2024" title="Self-Update Flow">
        <p>
          Added <strong>self-update flow</strong> with process restart. ripen now notifies you when a newer version is
          available and can update itself, then automatically restarts with the new version.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.8" date="December 2024" title="Bun Support">
        <p>
          Added <strong>Bun support</strong>. ripen now detects{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">bun.lock</code> and
          uses <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">bun add</code>{" "}
          for updates. The package manager family is now complete: npm, pnpm, yarn, and bun.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.7" date="November 2024" title="Dependency Updates">
        <p>Dependency updates and added funding links to the package metadata.</p>
      </ChangelogEntry>
    </>
  );
}
