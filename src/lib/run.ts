import spawn, { SubprocessError } from "nano-spawn";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  cwd?: string;
  /**
   * Called with each raw stdout/stderr chunk as it arrives, for live output
   * forwarding. Attached to the underlying child process so it runs alongside
   * nano-spawn's own buffering — the final {@link RunResult} stays populated.
   */
  onData?: (chunk: string) => void;
}

/**
 * Thin wrapper over `nano-spawn` (execa's officially recommended small
 * alternative — same author, zero dependencies, ~13× cheaper to import than
 * execa). nano-spawn keeps execa's cross-platform command resolution, including
 * Windows `.cmd`/`.bat` shims and `PATHEXT`, which raw `node:child_process`
 * lacks — that is why we use it rather than hand-rolling a shell spawn.
 *
 * The wrapper only re-adds the `execa(..., { reject: false })` behaviour ripen
 * relied on: a non-zero exit code resolves normally with `{ stdout, stderr,
 * exitCode }` instead of throwing (nano-spawn rejects). Genuine spawn failures
 * (missing binary → no exit code, or signal termination) still throw, which
 * every call site already guards with try/catch.
 *
 * `stdout`/`stderr` have their trailing newline stripped by nano-spawn, matching
 * execa. Streamed `onData` chunks are raw.
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
