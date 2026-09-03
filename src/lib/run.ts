import spawn, { SubprocessError } from "nano-spawn";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  cwd?: string;
  /** Live-forward each raw stdout/stderr chunk, alongside nano-spawn's buffering (result stays populated). */
  onData?: (chunk: string) => void;
}

/**
 * `nano-spawn` wrapper that re-adds execa's `reject: false`: a non-zero exit resolves
 * with `{ stdout, stderr, exitCode }`; only genuine spawn failures (ENOENT, signals) throw.
 * (nano-spawn is used for its cross-platform resolution — Windows `.cmd`/`.bat` shims, PATHEXT.)
 */
export async function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const subprocess = spawn(cmd, args, { cwd: opts.cwd });

  try {
    if (opts.onData) {
      // Attach to the raw streams so live forwarding coexists with nano-spawn's
      // buffering (iterating `subprocess.stdout` would instead empty the result).
      const child = await subprocess.nodeChildProcess;
      // nano-spawn sets utf8 encoding on these streams, so chunks are strings.
      const forward = (chunk: string) => opts.onData!(chunk);
      child.stdout?.on("data", forward);
      child.stderr?.on("data", forward);
    }

    const { stdout, stderr } = await subprocess;
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    // A process that ran and exited non-zero: surface it like `reject: false`.
    if (error instanceof SubprocessError && typeof error.exitCode === "number") {
      return { stdout: error.stdout, stderr: error.stderr, exitCode: error.exitCode };
    }
    // Could not start (e.g. ENOENT) or was killed by a signal — let it throw.
    throw error;
  }
}
