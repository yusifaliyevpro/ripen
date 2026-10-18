import type * as Ink from "ink";
import { describe, expect, it, vi } from "vitest";
import type { RipenConfig } from "../../src/types";

// Control the terminal height via ink's useWindowSize (see package-list-layout.test.tsx for why).
let mockRows = 24;
vi.mock("ink", async (orig) => {
  const actual = await orig<typeof Ink>();
  return { ...actual, useWindowSize: () => ({ rows: mockRows, columns: 100 }) };
});

const { render } = await import("ink-testing-library");
const { DEFAULT_CONFIG } = await import("../../src/config");
const { Settings } = await import("../../src/ui/settings");

const ESC = String.fromCharCode(27);
const UP = `${ESC}[A`;
const DOWN = `${ESC}[B`;
const settle = () => new Promise((r) => setTimeout(r, 50));
const noop = () => {};

function renderSettings(config: RipenConfig) {
  return render(<Settings config={config} onConfigChange={noop} onClose={noop} />);
}

describe("Settings layout on a short terminal", () => {
  const config = { ...DEFAULT_CONFIG, groupByScope: true, groupScopes: ["@a", "@b", "@c"] };

  it("keeps the header and footer pinned while the body is cut to fit", async () => {
    mockRows = 14;
    const { lastFrame } = renderSettings(config);
    await vi.waitFor(() => expect(lastFrame()).toContain("esc back"));
    const lines = lastFrame()!.split("\n");
    expect(lines).toHaveLength(12);
    expect(lines[0]).toContain("ripen -- settings");
    expect(lines.at(-1)).toContain("esc back");
    expect(lastFrame()).not.toContain("@c");
  });

  it("scrolls the focused row into view and back, header and footer staying put", async () => {
    mockRows = 14;
    const { lastFrame, stdin } = renderSettings(config);
    await vi.waitFor(() => expect(lastFrame()).toContain("esc back"));

    // 5 toggles + managers row + list header + 3 scopes: the last scope is 9 rows down.
    for (let i = 0; i < 9; i++) {
      stdin.write(DOWN);
      await settle();
    }
    await vi.waitFor(() => expect(lastFrame()).toMatch(/@c\s+d to remove/));
    let lines = lastFrame()!.split("\n");
    expect(lines).toHaveLength(12);
    expect(lines[0]).toContain("ripen -- settings");
    expect(lines.at(-1)).toContain("esc back");
    expect(lastFrame()).not.toContain("Sort by update frequency");

    for (let i = 0; i < 9; i++) {
      stdin.write(UP);
      await settle();
    }
    await vi.waitFor(() => expect(lastFrame()).toContain("Sort by update frequency"));
    lines = lastFrame()!.split("\n");
    expect(lines).toHaveLength(12);
    expect(lines.at(-1)).toContain("esc back");
  });
});
