import type { PackageManager, OutdatedPackage } from "./types";

export function buildUpdateCommands(
  manager: PackageManager,
  packages: OutdatedPackage[],
  global = false,
  sfwFirewall = false,
): string[] {
  const commands: string[] = [];

  const localPkgs = packages.filter((p) => !global && p.type !== "global");
  const globalPkgs = packages.filter((p) => global || p.type === "global");

  const makeCmd = (mgr: PackageManager, pkgs: OutdatedPackage[], flags: string[]): string => {
    const pkgArgs = pkgs.map((pkg) => {
      const version = pkg.targetVersion ?? pkg.latest;
      return `${pkg.name}@${version}`;
    });
    const isYarnGlobal = mgr === "yarn" && global;
    const args = isYarnGlobal ? ["global", "add", ...pkgArgs] : ["add", ...flags, ...pkgArgs];
    const cmd = `${mgr} ${args.join(" ")}`;
    return sfwFirewall ? `sfw ${cmd}` : cmd;
  };

  if (localPkgs.length > 0) commands.push(makeCmd(manager, localPkgs, []));

  if (globalPkgs.length > 0) {
    const byManager = new Map<PackageManager, OutdatedPackage[]>();
    for (const pkg of globalPkgs) {
      const mgr = pkg.manager ?? manager;
      if (!byManager.has(mgr)) byManager.set(mgr, []);
      byManager.get(mgr)!.push(pkg);
    }
    for (const [mgr, pkgs] of byManager) {
      const globalFlags = mgr === "yarn" ? [] : mgr === "bun" ? ["-g"] : ["--global"];
      commands.push(makeCmd(mgr, pkgs, globalFlags));
    }
  }

  return commands;
}
