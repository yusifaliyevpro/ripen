#!/usr/bin/env node
import { render } from "ink";
import { createRequire } from "module";
import { getProjectInfo, hasPackageJson, detectGlobalInstallManager } from "./detector";
import { App } from "./ui/App";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
const showAll = args.includes("--all") || args.includes("-a");
const showHelp = args.includes("--help") || args.includes("-h");
const showVersion = args.includes("--version") || args.includes("-V");

if (showVersion) {
  console.log(VERSION);
  process.exit(0);
}

if (showHelp) {
  console.log(`
  ripen — interactive dependency updater

  Usage:
    ripen           check current project
    ripen -g        check global packages
    ripen -a        show all packages, not just outdated ones
    ripen --help    show this help
    ripen --version show version

  Controls (inside TUI):
    ↑ ↓       navigate packages
    space     toggle select
    v         pick specific version
    c         view changelog / release notes
    enter     copy update command to clipboard & exit
    esc       cancel / go back
`);
  process.exit(0);
}

const cwd = process.cwd();

if (!isGlobal && !hasPackageJson(cwd)) {
  console.log("\n  No package.json found in this directory.\n");
  console.log("  Run ripen inside a Node.js project, or use ripen -g for global packages.\n");
  process.exit(1);
}

const project = getProjectInfo(cwd);

const installManager = detectGlobalInstallManager();

let wasCancelled = false;
let copiedCommands: string[] = [];

const { waitUntilExit } = render(
  <App
    project={project}
    global={isGlobal}
    showAll={showAll}
    version={VERSION}
    installManager={installManager}
    onCancelled={() => {
      wasCancelled = true;
    }}
    onCopied={(cmds) => {
      copiedCommands = cmds;
    }}
  />,
  { exitOnCtrlC: false, alternateScreen: true },
);

await waitUntilExit();

// Primary buffer is now restored. Print post-exit output here so it appears
// in the normal scrollback, not the (now-gone) alternate screen.
if (wasCancelled) {
  process.stdout.write("  \x1b[32mCancelled.\x1b[0m\n");
} else if (copiedCommands.length > 0) {
  process.stdout.write("  \x1b[32mCopied to clipboard.\x1b[0m\n");
}
