# ripen

> Interactive dependency updater for npm, pnpm, yarn, and bun

![npm version](https://img.shields.io/npm/v/ripencli) ![node](https://img.shields.io/node/v/ripencli) ![GitHub License](https://img.shields.io/github/license/yusifaliyevpro/ripen)


## Features

- **Interactive TUI** — navigate packages with arrow keys, select with space
- **Version picker** — choose any specific version from the npm registry, not just latest
- **Changelog viewer** — see GitHub release notes before you update
- **npm, pnpm, yarn & bun** — auto-detects your package manager
- **Global packages** — check and update global installs across all* package managers
- **Self-update** — notifies you when a new version of ripen is available
- **Major bump warnings** — highlights potentially breaking updates

## Install

```bash
npm install -g ripencli@latest
# or
pnpm add -g ripencli@latest
# or
yarn global add ripencli@latest
# or
bun add -g ripencli@latest
```

## Usage

```bash
# Check current project
ripen

# Check global packages (scans npm, pnpm, and yarn)
ripen -g

# Help
ripen --help
```

## Controls

| Key     | Action                         |
| ------- | ------------------------------ |
| `↑ ↓`   | Navigate packages              |
| `space` | Toggle select                  |
| `v`     | Pick specific version          |
| `c`     | View changelog / release notes |
| `enter` | Update selected packages       |
| `esc`   | Cancel / go back               |

## How it works

1. Reads your `package.json` and checks each dependency against the npm registry directly
2. Detects your package manager from the lock file (`bun.lock`, `pnpm-lock.yaml`, `package-lock.json`, or `yarn.lock`) for running updates
3. Shows outdated packages in a colorful interactive list
4. Press `v` on any package to pick a specific version from the npm registry
5. Press `c` to see GitHub release notes between your current and target version
6. Select the ones you want and press enter — ripen runs the update commands for you

When using `ripen -g`, all available package managers (npm, pnpm, yarn) are checked in parallel so you see every global package in one place. Bun is not included in global checking because it doesn't provide a JSON output for its outdated command.

## License

MIT
