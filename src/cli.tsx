#!/usr/bin/env node
import { render } from "ink";
import { version as RIPEN_VERSION } from "../package.json";
import { getProjectInfo, hasPackageJson, detectGlobalInstallManager } from "./detector";
import { colors } from "./lib/colors";
import { App } from "./ui/app";

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
const showAll = args.includes("--all") || args.includes("-a");
const showHelp = args.includes("--help") || args.includes("-h");
const showVersion = args.includes("--version") || args.includes("-v");

if (showVersion) {
  console.log(RIPEN_VERSION);
  process.exit(0);
}

if (showHelp) {
  console.log(`
  ripen — interactive dependency updater

  Usage:
    ripen           check current project
    ripen -g        check global packages
    ripen -a        show all packages, not just outdated ones
    ripen -h       show this help
    ripen -v        show version

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

let copiedCommands: string[] = [];
let wasEmpty = false;
let wasCancelled = false;

const { waitUntilExit } = render(
  <App
    project={project}
    global={isGlobal}
    showAll={showAll}
    version={RIPEN_VERSION}
    installManager={installManager}
    onCopied={(cmds) => {
      copiedCommands = cmds;
    }}
    onEmpty={() => {
      wasEmpty = true;
    }}
    onCancel={() => {
      wasCancelled = true;
    }}
  />,
  { exitOnCtrlC: false, alternateScreen: true, incrementalRendering: true },
);

await waitUntilExit();

// Primary buffer is now restored. Print post-exit output here so it appears
// in the normal scrollback, not the (now-gone) alternate screen.
if (copiedCommands.length > 0) {
  process.stdout.write(`  ${colors.green("Copied to clipboard.")}\n`);
} else if (wasEmpty) {
  const label = isGlobal ? "global" : project.name;
  process.stdout.write(`  ${colors.green(`✓ All packages are up to date in ${label}.`)}\n`);
} else if (wasCancelled) {
  process.stdout.write(`  ${colors.dim("Cancelled.")}\n`);
}

process.exit(0);
