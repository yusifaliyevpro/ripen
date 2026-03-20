#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { createRequire } from "module";
import { getProjectInfo, hasPackageJson, detectGlobalInstallManager } from "./detector";
import { App } from "./ui/App";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
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
    ripen --help    show this help
    ripen --version show version

  Controls (inside TUI):
    ↑ ↓       navigate packages
    space     toggle select
    v         pick specific version
    c         view changelog / release notes
    enter     update selected packages
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

const { waitUntilExit } = render(<App project={project} global={isGlobal} version={VERSION} installManager={installManager} />);

await waitUntilExit();
