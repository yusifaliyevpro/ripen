import { execa } from "execa";
import type { PackageManager } from "./detector";
import type { OutdatedPackage } from "./fetcher";

export interface UpdateResult {
  name: string;
  fromVersion: string;
  version: string;
  success: boolean;
  error?: string;
}

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

  const batches: { pkgs: OutdatedPackage[]; flags: string[] }[] = [];
  if (deps.length > 0) batches.push({ pkgs: deps, flags: [] });
  if (devDeps.length > 0) batches.push({ pkgs: devDeps, flags: ["-D"] });
  if (globalPkgs.length > 0) batches.push({ pkgs: globalPkgs, flags: ["--global"] });

  for (const batch of batches) {
    const pkgArgs = batch.pkgs.map(
      (pkg) => `${pkg.name}@${pkg.targetVersion ?? pkg.latest}`,
    );
    const args = ["add", ...batch.flags, ...pkgArgs];

    onLine?.(`$ ${manager} ${args.join(" ")}`);

    try {
      const proc = execa(manager, args, { cwd, reject: false });

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
          results.push({ name: pkg.name, fromVersion: pkg.current, version: pkg.targetVersion ?? pkg.latest, success: false, error: errMsg });
        }
      } else {
        for (const pkg of batch.pkgs) {
          results.push({ name: pkg.name, fromVersion: pkg.current, version: pkg.targetVersion ?? pkg.latest, success: true });
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
