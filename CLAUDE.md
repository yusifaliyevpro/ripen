# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Run directly with tsx (no build step, good for development)
pnpm build        # Bundle with tsdown → dist/cli.js
pnpm typecheck    # Type-check without emitting
pnpm start        # Run the built dist/cli.js
pnpm checks       # Check locally before PR
```

There is no test suite.

## Architecture

`ripen` is a CLI tool built with **Ink** (React for terminal UIs). Source lives in `src/`, bundled to `dist/cli.js` via tsdown (ESM, Node platform). Runtime deps — `ink`, `ink-scroll-view`, `react`, `execa` — are never bundled and must be installed alongside the package.

### Data flow

```
cli.tsx  →  detector.ts  →  fetcher.ts  →  App.tsx  →  executor.ts
           (pnpm|npm|bun    (outdated)      (TUI)    (add/install)
            |yarn)                        registry.ts
                                       (versions/changelog)
```

1. **`src/cli.tsx`** — Parses argv (`-g`, `--help`, `--version`), calls `getProjectInfo`, renders `<App>`.
2. **`src/detector.ts`** — Detects `pnpm`, `npm`, `bun`, or `yarn` by checking for `bun.lock` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `package-lock.json` / `yarn.lock`. Reads project name from `package.json`.
3. **`src/fetcher.ts`** — Reads `package.json` and checks each dependency against the npm registry directly (local mode), or queries package managers for global mode. Handles normalising formats into `OutdatedPackage[]`.
4. **`src/executor.ts`** — Groups selected packages by type (`dependencies`, `devDependencies`, `global`) and runs one `pnpm/npm/bun/yarn add` command per group.
5. **`src/registry.ts`** — Fetches version lists from the npm registry and GitHub Releases API for changelogs. Pre-release versions are filtered out unless they carry a dist-tag.
6. **`src/config.ts`** — Persists settings and update-frequency tracking to `~/.config/ripen/config.json`.
7. **`src/lib/versions.ts`** — Semver parsing, version comparison, range prefix parsing (`^`, `~`, etc.).
8. **`src/lib/utils.ts`** — Cross-platform browser opener (Windows: `start`, macOS: `open`, Linux: `xdg-open`).
9. **`src/types.ts`** — All shared TypeScript types: `PackageManager`, `ProjectInfo`, `OutdatedPackage`, `RipenConfig`, `Screen`, `UpdateResult`, `ChangelogEntry`, `RegistryVersion`.

### UI / screen state machine

`src/ui/App.tsx` owns a `Screen` union type and drives all screen transitions:

```
loading → list ←→ version-picker
               ←→ changelog
               ←→ settings
               ←→ self-update-prompt
               → updating → results
```

**Important:** `PackageList` stays mounted even when other screens are active — it is hidden with `display="none"` rather than unmounted, preserving scroll position and selection state.

### UI components

| File | Role |
|---|---|
| `ui/App.tsx` | Screen state machine, all data-fetching side-effects |
| `ui/package-list/PackageList.tsx` | Main interactive list with keyboard navigation, scope collapsing |
| `ui/package-list/build-rows.ts` | Row building: grouping by scope/type, filtering, frequency sorting |
| `ui/package-list/types.ts` | Row types, color constants |
| `ui/VersionPicker.tsx` | Scrollable version picker (fetches from npm registry) |
| `ui/ChangelogPanel.tsx` | GitHub release notes viewer |
| `ui/UpdateResults.tsx` | Post-update summary |
| `ui/Settings.tsx` | Settings screen with toggles |
| `ui/SettingsToggle.tsx` | Reusable toggle component |
| `ui/SelfUpdatePrompt.tsx` | Prompts user to update ripen itself |
| `ui/TerminalOutputBox.tsx` | Displays terminal output during loading/updating |
| `ui/MarkdownLine.tsx` | Minimal inline markdown renderer for changelog bodies |

### UI hooks (`ui/hooks/`)

| File | Role |
|---|---|
| `use-packages.ts` | Package selection, toggling, version picking state |
| `use-self-update.ts` | Self-update check and installation |
| `use-terminal-output.ts` | Terminal output buffer and line handling |
| `use-exit-on-screen.ts` | Auto-exit logic for specific screens |
