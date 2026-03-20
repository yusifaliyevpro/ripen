# ripen

> Interactive dependency updater for pnpm and npm

![ripen demo](https://img.shields.io/badge/pnpm-supported-orange) ![npm version](https://img.shields.io/npm/v/ripen)

## Features

- **Interactive TUI** — navigate packages with arrow keys, select with space
- **Version picker** — choose any specific version from the npm registry, not just latest
- **Changelog viewer** — see GitHub release notes before you update
- **pnpm & npm** — auto-detects your package manager
- **Global packages** — check and update global installs too
- **Major bump warnings** — highlights potentially breaking updates

## Install

```bash
pnpm add -g ripen
# or
npm install -g ripen
```

## Usage

```bash
# Check current project
ripen

# Check global packages
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

1. Runs `pnpm outdated --json` (or npm equivalent) to find outdated packages
2. Shows them in a colorful interactive list
3. Press `v` on any package to pick a specific version from the npm registry
4. Press `c` to see GitHub release notes between your current and target version
5. Select the ones you want and press enter — ripen runs the update commands for you

## License

MIT
