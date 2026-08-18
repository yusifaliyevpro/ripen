import { describe, expect, it } from "vitest";
import { run } from "../src/lib/run";

// nano-spawn special-cases the bare command "node" to reuse the current Node
// binary, and it escapes arguments cross-platform — so we can pass an inline
// `-e` program directly without worrying about cmd.exe metacharacters.
const node = "node";

describe("run", () => {
  it("captures stdout and a zero exit code", async () => {
    const { stdout, exitCode } = await run(node, ["-e", "process.stdout.write('hello')"]);
    expect(stdout).toBe("hello");
    expect(exitCode).toBe(0);
  });

  it("captures stderr separately from stdout", async () => {
    const { stdout, stderr } = await run(node, ["-e", "process.stdout.write('out'); process.stderr.write('warn')"]);
    expect(stdout).toBe("out");
    expect(stderr).toBe("warn");
  });

  it("resolves (does not throw) on a non-zero exit code — execa's reject:false", async () => {
    const { stdout, exitCode } = await run(node, ["-e", "process.stdout.write('partial'); process.exit(1)"]);
    // Mirrors `npm outdated`, which exits 1 but still prints usable stdout.
    expect(exitCode).toBe(1);
    expect(stdout).toBe("partial");
  });

  it("strips the trailing newline from stdout, like execa", async () => {
    const { stdout } = await run(node, ["-e", "process.stdout.write('value\\n')"]);
    expect(stdout).toBe("value");
  });

  it("forwards chunks to onData while still buffering the result", async () => {
    const chunks: string[] = [];
    const { stdout } = await run(node, ["-e", "process.stdout.write('streamed')"], {
      onData: (c) => chunks.push(c),
    });
    expect(chunks.join("")).toContain("streamed");
    expect(stdout).toBe("streamed"); // buffered result still populated
  });

  it("runs in the given cwd", async () => {
    const { stdout } = await run(node, ["-e", "process.stdout.write(process.cwd())"], {
      cwd: process.cwd(),
    });
    expect(stdout).toBe(process.cwd());
  });

  it("surfaces a missing binary as a failure (throw, or non-zero exit on Windows)", async () => {
    // Non-Windows: spawn fails with ENOENT → throws. Windows: the command is
    // resolved through cmd.exe, which reports "not recognized" as a non-zero
    // exit → resolves with exitCode !== 0. Either way it must not look like success.
    let failed = false;
    try {
      const { exitCode } = await run(`ripen-no-such-binary-${Date.now()}`, []);
      failed = exitCode !== 0;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  // The reason we use nano-spawn rather than `spawn(..., { shell: true })`: a raw
  // shell splits/mangles arguments containing spaces or cmd.exe metacharacters
  // (`&`, `(`, `)`), which broke an earlier attempt. Each argument must arrive at
  // the child verbatim, as a single token, on every platform.
  it("passes arguments with spaces and shell metacharacters through verbatim", async () => {
    const tricky = "a b & c (d)";
    const { stdout } = await run(node, ["-e", "process.stdout.write(process.argv.at(-1))", tricky]);
    expect(stdout).toBe(tricky);
  });

  it("keeps each argument a separate token (does not word-split on spaces)", async () => {
    const { stdout } = await run(node, [
      "-e",
      "process.stdout.write(String(process.argv.length))",
      "one two",
      "three",
    ]);
    // argv = [execPath, "one two", "three"] → length 3, proving "one two" wasn't split.
    expect(stdout).toBe("3");
  });

  it("strips a CRLF trailing newline as a unit, like execa on Windows output", async () => {
    const { stdout } = await run(node, ["-e", "process.stdout.write('x\\r\\n')"]);
    expect(stdout).toBe("x");
  });

  it("leaves stdout untouched when there is no trailing newline", async () => {
    const { stdout } = await run(node, ["-e", "process.stdout.write('no-newline')"]);
    expect(stdout).toBe("no-newline");
  });

  it("forwards stderr chunks to onData, not only stdout", async () => {
    const chunks: string[] = [];
    await run(node, ["-e", "process.stderr.write('a warning line')"], {
      onData: (c) => chunks.push(c),
    });
    expect(chunks.join("")).toContain("a warning line");
  });

  it("buffers large multi-chunk stdout in full", async () => {
    const { stdout } = await run(node, ["-e", "process.stdout.write('a'.repeat(200000))"]);
    expect(stdout).toHaveLength(200000);
  });

  // The exact `npm outdated` shape: warnings streamed on stderr, JSON on stdout,
  // and a non-zero exit — all three must be usable together.
  it("streams stderr warnings while still returning buffered stdout and the exit code", async () => {
    const warnings: string[] = [];
    const { stdout, exitCode } = await run(
      node,
      [
        "-e",
        "process.stderr.write('npm warn deprecated foo\\n'); process.stdout.write('{\"outdated\":true}'); process.exit(1)",
      ],
      { onData: (c) => warnings.push(c) },
    );
    expect(warnings.join("")).toContain("npm warn deprecated foo");
    expect(stdout).toBe('{"outdated":true}');
    expect(exitCode).toBe(1);
  });
});
