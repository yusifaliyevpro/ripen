#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { getProjectInfo } from "./detector";
import { App } from "./ui/App";

const args = process.argv.slice(2);
const isGlobal = args.includes("--global") || args.includes("-g");
const showHelp = args.includes("--help") || args.includes("-h");
const showVersion = args.includes("--version") || args.includes("-V");

if (showVersion) {
  console.log("0.1.0");
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
const project = getProjectInfo(cwd);

const { waitUntilExit } = render(<App project={project} global={isGlobal} />);

await waitUntilExit();
