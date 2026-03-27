import type { Metadata } from "next";
import { ChangelogEntry } from "@/components/ChangelogEntry";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Version history and release notes for ripen.",
};

export default function ChangelogPage() {
  return (
    <>
      <ChangelogEntry 
        version="1.0.0" 
        image="/og.png"
        date="March 27, 2026" title="Show All Packages (--all flag)"
      >
        <p>
          Added <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">--all</code>{" "}
          (
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">-a</code>) flag —
          show every dependency, not just outdated ones.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>--all / -a flag</strong> — run{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">ripen --all</code>{" "}
            to list all packages regardless of their update status. Useful for browsing changelogs or picking an older
            version to downgrade to
          </li>
          <li>
            <strong>Green current version</strong> — packages that are already up to date show their current version in
            green instead of red, making it easy to see what needs attention at a glance
          </li>
          <li>
            <strong>Updated footer</strong> — in{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">--all</code> mode
            the footer shows total package count alongside the outdated count
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.3.4" date="March 23, 2026" title="Code Refactoring & Flicker Fix">
        <p>
          Major codebase refactoring for better separation of concerns, plus a fix for the package list flicker on
          initial load.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Package list flicker fix</strong> — eliminated a visible reorder when the package list first appears
            after checking for updates. Scope groups are now collapsed on the very first render instead of after a
            delayed effect
          </li>
          <li>
            <strong>Custom hooks</strong> — extracted{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">usePackages</code>
            ,{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              useTerminalOutput
            </code>
            ,{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              useSelfUpdate
            </code>
            , and{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              useExitOnScreen
            </code>{" "}
            into dedicated hook files
          </li>
          <li>
            <strong>PackageList split</strong> — moved display row building, filtering, and grouping logic into a
            dedicated{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              package-list/
            </code>{" "}
            module with separate types, build-rows, and component files
          </li>
          <li>
            <strong>Utility modules</strong> — created{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              lib/utils.ts
            </code>{" "}
            and{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              lib/versions.ts
            </code>{" "}
            for shared helpers
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry
        version="0.3.3"
        date="March 22, 2026"
        title="Documentation Updates"
      >
        <p>
          Updated documentation to include the new <strong>separateDevDeps</strong> setting in both the README and the
          configuration docs page.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>README settings table</strong> — added the Separate dev dependencies row
          </li>
          <li>
            <strong>Configuration docs</strong> — added{" "}
            <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">
              separateDevDeps
            </code>{" "}
            to the settings table and example JSON
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.3.2" date="March 22, 2026" title="Grouping Fixes & Separate Dev Dependencies Setting">
        <p>
          Fixed the <strong>groupsOnTop</strong> setting not being respected and added a new setting to merge dependency
          groups.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>groupsOnTop fix</strong> — scope groups now correctly appear at their natural position when the
            setting is turned off. Previously, frequency sorting was forcing groups to the top regardless of the
            groupsOnTop value
          </li>
          <li>
            <strong>Separate dev dependencies</strong> — new setting to merge dependencies and devDependencies into a
            single {'"'}All Dependencies{'"'} group. Enabled by default (separate groups), can be toggled off in
            settings
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.3.1" date="March 22, 2026" title="Add Home Page Link to package.json">
        <p>
          Added a <strong>homepage</strong> field to the package.json metadata, linking to the ripen homepage at{" "}
          <a href="https://ripencli.vercel.app" className="text-orange hover:underline">
            https://ripencli.vercel.app
          </a>
          . This provides users with an easy way to find more information about ripen and access the documentation
          directly from the npm registry.
        </p>
      </ChangelogEntry>
      <ChangelogEntry version="0.3.0" date="March 22, 2026" title="Enhanced MetaData and Website Redesign">
        <p>Welcome to ripen 0.3.0! This major release includes several exciting features and improvements:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Enhanced MetaData</strong> — Redesigned Website interface with improved usability and visual appeal
          </li>
        </ul>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.9" date="March 22, 2026" title="Pre-release Version Support">
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

      <ChangelogEntry version="0.2.8" date="March 2026" title="Settings Delete Shortcut">
        <p>
          Enhanced the Settings screen with a new delete shortcut for removing grouped scopes directly from the settings
          UI.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.7" date="March 2026" title="Frequency Sorting">
        <p>
          Added <strong>frequency sorting</strong> — packages you update often can now be surfaced to the top of the
          list. Enhanced README with settings documentation.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.6" date="March 2026" title="Configuration System">
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

      <ChangelogEntry version="0.2.5" date="March 2026" title="Codebase Refactoring">
        <p>
          Refactored all{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">interface</code>{" "}
          declarations to{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">type</code> across
          the entire codebase for consistency and better TypeScript patterns.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.4" date="March 2026" title="TypeScript & Exit Handling">
        <p>
          TypeScript improvements and optimization pass. Better{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">Ctrl+C</code>{" "}
          handling for cleaner process exits.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.2.2" date="March 2026" title="Performance Improvements">
        <p>
          Performance improvements with reduced UI flickering during package list rendering. Smoother scrolling and
          selection experience.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.9" date="March 2026" title="Self-Update Flow">
        <p>
          Added <strong>self-update flow</strong> with process restart. ripen now notifies you when a newer version is
          available and can update itself, then automatically restarts with the new version.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.8" date="March 2026" title="Bun Support">
        <p>
          Added <strong>Bun support</strong>. ripen now detects{" "}
          <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">bun.lock</code> and
          uses <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-xs">bun add</code>{" "}
          for updates. The package manager family is now complete: npm, pnpm, yarn, and bun.
        </p>
      </ChangelogEntry>

      <ChangelogEntry version="0.1.7" date="March 2026" title="Dependency Updates">
        <p>Dependency updates and added funding links to the package metadata.</p>
      </ChangelogEntry>
    </>
  );
}
