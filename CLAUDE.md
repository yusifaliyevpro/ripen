# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm build        # Bundle with tsdown → dist/cli.js
pnpm start        # Run the built dist/cli.js
pnpm test         # Run the vitest suite (tests/**)
pnpm test:watch   # Vitest in watch mode
pnpm fmt          # Auto-format with oxfmt
pnpm fmt:check    # Check formatting without writing
pnpm lint         # Lint with oxlint
pnpm lint:fix     # Auto-fix lint issues
pnpm check        # Run all checks via greenly (supports non-TTY and CI terminals) (see below)
```

Tests live in `tests/**` and run with **vitest** (`pnpm test`). Note there is no `pnpm dev` and no `pnpm typecheck` script.

### Verifying a change

`pnpm check` runs [greenly](greenly.config.ts), which executes every check non-interactively in
the same order as CI — safe for both humans and agents:

```bash
pnpm check
```

The individual steps, if you want to run them directly:

```bash
pnpm tsc --noEmit   # 1. TypeScript — type check
pnpm fmt:check      # 2. Oxfmt — format check   (on failure: pnpm fmt)
pnpm lint           # 3. Oxlint — lint check    (on failure: pnpm lint:fix)
pnpm test           # 4. Vitest — run the test suite
pnpm build          # 5. tsdown — build errors
```

### Fixing bugs & regressions (test-first)

**Always write a failing test that reproduces the bug or regression _before_ fixing it.** For
every reported issue:

1. Add a test in `tests/**` that captures the broken behavior, and run it to confirm it **fails**
   for the right reason (it reproduces the actual bug, not a typo in the test).
2. Apply the fix, then run the test to confirm it now **passes**.
3. Run `pnpm check` so the rest of the suite and the other checks stay green.

This applies to all bug fixes, not just obvious regressions — the test is what stops the issue
from silently coming back. For terminal-height / layout behavior, control the viewport by mocking
ink's `useWindowSize` (see `tests/ui/package-list-layout.test.tsx`) rather than mocking
`terminal-size`, which pnpm resolves to ink's own copy.

## Releases

Releases are fully automated — there is **no changelog file to maintain**.

1. Bump `version` in `package.json` and push to `main`.
2. `.github/workflows/publish.yml` detects the version change, publishes to npm, creates a `v<version>` git tag, and creates a GitHub Release with **auto-generated notes** (`gh release create --generate-notes`).
3. The docs changelog page (`docs/src/app/changelog/page.tsx`) fetches GitHub Releases at runtime (cached hourly), so published releases appear there automatically — no manual entry.

## Architecture

`ripen` is a CLI tool built with **Ink** (React for terminal UIs). Source lives in `src/`, bundled to `dist/cli.js` via tsdown (ESM, Node platform). Runtime deps — `ink`, `ink-scroll-view`, `react`, `execa` — are never bundled and must be installed alongside the package.

### Data flow

```
cli.tsx  →  detector.ts  →  fetcher.ts  →  app.tsx  →  executor.ts
           (pnpm|npm|bun    (outdated)      (TUI)    (add/install)
            |yarn)                        registry.ts
                                       (versions/changelog)
```

1. **`src/cli.tsx`** — Parses argv (`-g`, `--help`, `--version`), calls `getProjectInfo`, renders `<App>`.
2. **`src/detector.ts`** — Detects `pnpm`, `npm`, `bun`, or `yarn` by checking for `bun.lock` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `package-lock.json` / `yarn.lock`. Reads project name from `package.json`.
3. **`src/fetcher.ts`** — Reads `package.json` and checks each dependency against the npm registry directly (local mode), or queries package managers for global mode. Handles normalising formats into `OutdatedPackage[]`.
4. **`src/executor.ts`** — Groups selected packages by type (`dependencies`, `devDependencies`, `global`) and runs one `pnpm/npm/bun/yarn add` command per group.
5. **`src/registry.ts`** — Fetches version lists from the npm registry and GitHub Releases API for changelogs. Pre-release versions are filtered out unless they carry a dist-tag.
6. **`src/config.ts`** — Persists settings (`config.json`), update-frequency tracking (`frequency.json`), and the self-update cache (`update-check.json`) under `~/.config/ripen/`. The self-update cache holds the latest ripen version seen on npm; a fire-and-forget check refreshes it each run so startup never blocks on the network.
7. **`src/lib/versions.ts`** — Semver parsing, version comparison, range prefix parsing (`^`, `~`, etc.).
8. **`src/lib/utils.ts`** — Cross-platform browser opener (Windows: `start`, macOS: `open`, Linux: `xdg-open`).
9. **`src/types.ts`** — All shared TypeScript types: `PackageManager`, `ProjectInfo`, `OutdatedPackage`, `RipenConfig`, `Screen`, `RegistryVersion`.

### UI / screen state machine

`src/ui/app.tsx` owns a `Screen` union type and drives all screen transitions:

```
(self-update) → loading → list ←→ version-picker
                               ←→ changelog
                               ←→ settings
```

The self-update decision is made synchronously at startup from the cached latest version (see `config.ts`), so the app opens directly on `self-update` (when the cache is newer than the running version) or straight on `loading` — there is no blocking "checking for updates" screen. Skipping the prompt goes to `loading`.

On confirm, the selected install command is copied to the clipboard and the app exits (there is no in-app `updating`/`results` screen).

**Important:** `PackageList` stays mounted even when other screens are active — it is hidden with `display="none"` rather than unmounted, preserving scroll position and selection state.

### UI components

| File                         | Role                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `ui/app.tsx`                 | Screen state machine, all data-fetching side-effects                                              |
| `ui/package-list.tsx`        | Main interactive list with keyboard navigation, scope collapsing                                  |
| `lib/build-rows.ts`          | Row building (grouping by scope/type, filtering, frequency sorting) + row types & color constants |
| `ui/version-picker.tsx`      | Scrollable version picker (fetches from npm registry)                                             |
| `ui/changelog-panel.tsx`     | GitHub release notes viewer                                                                       |
| `ui/settings.tsx`            | Settings screen with toggles                                                                      |
| `ui/settings-toggle.tsx`     | Reusable toggle component                                                                         |
| `ui/self-update-prompt.tsx`  | Prompts user to update ripen itself                                                               |
| `ui/terminal-output-box.tsx` | Displays terminal output during loading                                                           |
| `ui/markdown-line.tsx`       | Minimal inline markdown renderer for changelog bodies                                             |

### Hooks (`src/hooks/`)

| File                     | Role                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `use-packages.ts`        | Package selection, toggling, version picking state         |
| `use-self-update.ts`     | Self-update decision (from cache) + background npm refresh |
| `use-terminal-output.ts` | Terminal output buffer and line handling                   |
