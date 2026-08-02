import { describe, expect, it } from "vitest";
import { buildUpdateCommands } from "../src/executor";
import type { OutdatedPackage } from "../src/types";

function pkg(overrides: Partial<OutdatedPackage> & { name: string }): OutdatedPackage {
  return {
    current: "1.0.0",
    wanted: "2.0.0",
    latest: "2.0.0",
    dependent: "",
    type: "dependencies",
    ...overrides,
  };
}

describe("buildUpdateCommands (local)", () => {
  it("builds a single add command for local packages", () => {
    const cmds = buildUpdateCommands("pnpm", [pkg({ name: "react", targetVersion: "19.0.0" })]);
    expect(cmds).toEqual(["pnpm add react@19.0.0"]);
  });

  it("falls back to latest when targetVersion is absent", () => {
    const cmds = buildUpdateCommands("npm", [pkg({ name: "left-pad", latest: "1.3.0", targetVersion: undefined })]);
    expect(cmds).toEqual(["npm add left-pad@1.3.0"]);
  });

  it("groups multiple local packages into one command", () => {
    const cmds = buildUpdateCommands("bun", [
      pkg({ name: "react", targetVersion: "19.0.0" }),
      pkg({ name: "zod", type: "devDependencies", targetVersion: "3.0.0" }),
    ]);
    expect(cmds).toEqual(["bun add react@19.0.0 zod@3.0.0"]);
  });

  it("prepends sfw when the firewall flag is set", () => {
    const cmds = buildUpdateCommands("pnpm", [pkg({ name: "react", targetVersion: "19.0.0" })], false, true);
    expect(cmds).toEqual(["sfw pnpm add react@19.0.0"]);
  });
});

describe("buildUpdateCommands (global)", () => {
  it("uses --global for npm and pnpm", () => {
    const cmds = buildUpdateCommands(
      "npm",
      [pkg({ name: "typescript", type: "global", targetVersion: "5.0.0" })],
      true,
    );
    expect(cmds).toEqual(["npm add --global typescript@5.0.0"]);
  });

  it("uses -g for bun", () => {
    const cmds = buildUpdateCommands(
      "bun",
      [pkg({ name: "typescript", type: "global", targetVersion: "5.0.0" })],
      true,
    );
    expect(cmds).toEqual(["bun add -g typescript@5.0.0"]);
  });

  it("uses 'global add' (no flags) for yarn", () => {
    const cmds = buildUpdateCommands(
      "yarn",
      [pkg({ name: "typescript", type: "global", targetVersion: "5.0.0" })],
      true,
    );
    expect(cmds).toEqual(["yarn global add typescript@5.0.0"]);
  });

  it("splits global packages by their owning manager", () => {
    const cmds = buildUpdateCommands(
      "npm",
      [
        pkg({ name: "typescript", type: "global", manager: "npm", targetVersion: "5.0.0" }),
        pkg({ name: "eslint", type: "global", manager: "pnpm", targetVersion: "9.0.0" }),
      ],
      true,
    );
    expect(cmds).toContain("npm add --global typescript@5.0.0");
    expect(cmds).toContain("pnpm add --global eslint@9.0.0");
    expect(cmds).toHaveLength(2);
  });
});

describe("buildUpdateCommands (mixed)", () => {
  it("emits a local command plus per-manager global commands", () => {
    const cmds = buildUpdateCommands("pnpm", [
      pkg({ name: "react", targetVersion: "19.0.0" }),
      pkg({ name: "typescript", type: "global", manager: "pnpm", targetVersion: "5.0.0" }),
    ]);
    expect(cmds).toEqual(["pnpm add react@19.0.0", "pnpm add --global typescript@5.0.0"]);
  });

  it("returns no commands for an empty selection", () => {
    expect(buildUpdateCommands("pnpm", [])).toEqual([]);
  });
});
