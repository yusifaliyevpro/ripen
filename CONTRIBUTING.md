# Contributing to ripen

Thanks for your interest in contributing!

## Setup

```bash
git clone https://github.com/yusifaliyevpro/ripen.git
cd ripen
pnpm install
```

## Development

```bash
pnpm dev          # Run with tsx (no build step)
pnpm build        # Bundle to dist/cli.js
pnpm typecheck    # Type-check without emitting
pnpm checks       # Run all pre-PR checks
```

There is no test suite. Use `pnpm dev` to manually test changes.

## Project structure

Source lives in `src/`. The entry point is `src/cli.tsx`. See [`CLAUDE.md`](./CLAUDE.md) for a full architecture overview including the data flow, UI component table, and screen state machine.

## Submitting a PR

1. Fork the repo and create a branch from `main`.
2. Run `pnpm checks` before opening a PR — it runs typecheck and any other local validations.
3. Keep PRs focused. One feature or fix per PR.
4. Write a clear PR description explaining what changed and why.

## Reporting bugs

Open an issue at [github.com/yusifaliyevpro/ripen/issues](https://github.com/yusifaliyevpro/ripen/issues). Include your Node version, package manager and version, and steps to reproduce.

## Runtime dependencies

`ink`, `react`, and `nano-spawn` live in `devDependencies` and are **bundled into `dist/cli.js`** by tsdown, so the published package has no runtime dependencies to install. Do not add new dependencies without discussion.
