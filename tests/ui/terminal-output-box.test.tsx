import { afterEach, describe, expect, it, vi } from "vitest";

// Control the terminal height the component sees (see package-list-layout.test.tsx).
let mockRows = 24;
vi.mock("ink", async (orig) => {
  const actual = await orig<typeof import("ink")>();
  return { ...actual, useWindowSize: () => ({ rows: mockRows, columns: 100 }) };
});

const { render } = await import("ink-testing-library");
const { TerminalOutputBox } = await import("../../src/ui/terminal-output-box");

const settle = () => new Promise((r) => setTimeout(r, 40));

function renderBox(props: Partial<Parameters<typeof TerminalOutputBox>[0]> = {}) {
  return render(
    <TerminalOutputBox
      message="Checking for outdated packages…"
      command="Checking npm registry…"
      outputLines={["Checking tsdown (7/16)...", "Checking typescript (8/16)..."]}
      maxLines={6}
      {...props}
    />,
  );
}

afterEach(() => {
  mockRows = 24;
  vi.restoreAllMocks();
});

describe("TerminalOutputBox", () => {
  it("shows the same full header label as the package list", async () => {
    const { lastFrame } = renderBox();
    await settle();
    expect(lastFrame()).toContain("ripen - interactive dependency updater");
  });

  it("renders the loading message, the command, and streamed output lines", async () => {
    const { lastFrame } = renderBox();
    await settle();
    const frame = lastFrame()!;
    expect(frame).toContain("Checking for outdated packages…");
    expect(frame).toContain("Checking npm registry…");
    expect(frame).toContain("Checking tsdown (7/16)...");
    expect(frame).toContain("Checking typescript (8/16)...");
  });

  it("fills the terminal height so the header pins to the top instead of the middle", async () => {
    mockRows = 30;
    const { lastFrame } = renderBox();
    await settle();
    const lines = lastFrame()!.split("\n");
    expect(lines).toHaveLength(mockRows); // full-height, matching the list screen's painted height
    // Header sits at the top (line 0 is the box's top padding), not floating in the middle.
    expect(lines[1]).toContain("ripen - interactive dependency updater");
  });

  it("keeps the same painted height regardless of how many output lines have streamed in", async () => {
    mockRows = 30;
    const empty = renderBox({ command: "", outputLines: [] });
    await settle();
    const streaming = renderBox({ outputLines: ["a", "b", "c", "d"] });
    await settle();
    expect(empty.lastFrame()!.split("\n").length).toBe(streaming.lastFrame()!.split("\n").length);
  });
});
