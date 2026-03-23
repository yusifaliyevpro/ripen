import { execa } from "execa";
import type { PackageManager, OutdatedPackage, UpdateResult } from "./types";

export async function updatePackages(
  manager: PackageManager,
  packages: OutdatedPackage[],
  cwd: string,
  global = false,
  onLine?: (line: string) => void,
): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];

  // Group packages by install type so we run one command per type
  const deps = packages.filter((p) => !global && p.type === "dependencies");
  const devDeps = packages.filter((p) => !global && p.type === "devDependencies");
  const globalPkgs = packages.filter((p) => global);

  const batches: { mgr: PackageManager; pkgs: OutdatedPackage[]; flags: string[] }[] = [];
  if (deps.length > 0) batches.push({ mgr: manager, pkgs: deps, flags: [] });
  if (devDeps.length > 0) batches.push({ mgr: manager, pkgs: devDeps, flags: [manager === "bun" ? "-d" : "-D"] });

  if (globalPkgs.length > 0) {
    // Group global packages by their owning manager
    const byManager = new Map<PackageManager, OutdatedPackage[]>();
    for (const pkg of globalPkgs) {
      const mgr = pkg.manager ?? manager;
      if (!byManager.has(mgr)) byManager.set(mgr, []);
      byManager.get(mgr)!.push(pkg);
    }
    for (const [mgr, pkgs] of byManager) {
      const globalFlags = mgr === "yarn" ? [] : mgr === "bun" ? ["-g"] : ["--global"];
      batches.push({ mgr, pkgs, flags: globalFlags });
    }
  }

  for (const batch of batches) {
    const pkgArgs = batch.pkgs.map((pkg) => {
      const version = pkg.targetVersion ?? pkg.latest;
      const prefix = pkg.rangePrefix ?? "";
      return `${pkg.name}@${prefix}${version}`;
    });
    const isYarnGlobal = batch.mgr === "yarn" && global;
    const args = isYarnGlobal ? ["global", "add", ...pkgArgs] : ["add", ...batch.flags, ...pkgArgs];

    onLine?.(`$ ${batch.mgr} ${args.join(" ")}`);

    try {
      const proc = execa(batch.mgr, args, { cwd, reject: false });

      if (onLine) {
        const forward = (chunk: Buffer) => {
          const lines = chunk.toString().split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) onLine(trimmed);
          }
        };
        proc.stderr?.on("data", forward);
        proc.stdout?.on("data", forward);
      }

      const result = await proc;
      if (result.exitCode !== 0) {
        const errMsg = result.stderr?.trim() || `exited with code ${result.exitCode}`;
        for (const pkg of batch.pkgs) {
          results.push({
            name: pkg.name,
            fromVersion: pkg.current,
            version: pkg.targetVersion ?? pkg.latest,
            success: false,
            error: errMsg,
          });
        }
      } else {
        for (const pkg of batch.pkgs) {
          results.push({
            name: pkg.name,
            fromVersion: pkg.current,
            version: pkg.targetVersion ?? pkg.latest,
            success: true,
          });
        }
      }
    } catch (err: any) {
      for (const pkg of batch.pkgs) {
        results.push({
          name: pkg.name,
          fromVersion: pkg.current,
          version: pkg.targetVersion ?? pkg.latest,
          success: false,
          error: err.message ?? "Unknown error",
        });
      }
    }
  }

  return results;
}
