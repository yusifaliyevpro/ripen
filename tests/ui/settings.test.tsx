import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config";
import type { RipenConfig } from "../../src/types";
import { Settings } from "../../src/ui/settings";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const tick = () => new Promise((r) => setTimeout(r, 40));

function renderSettings(config: RipenConfig = DEFAULT_CONFIG) {
  const onConfigChange = vi.fn<(config: RipenConfig) => void>();
  const onClose = vi.fn<() => void>();
  const result = render(<Settings config={config} onConfigChange={onConfigChange} onClose={onClose} />);
  return { ...result, onConfigChange, onClose };
}

afterEach(() => vi.restoreAllMocks());

describe("Settings", () => {
  it("renders the toggle labels", async () => {
    const { lastFrame } = renderSettings();
    await vi.waitFor(() => expect(lastFrame()).toContain("Sort by update frequency"));
    const frame = lastFrame()!;
    expect(frame).toContain("Separate dev dependencies");
    expect(frame).toContain("Enable scope grouping");
    expect(frame).toContain("SFW firewall");
  });

  it("pins the footer to the bottom of a stable height regardless of scope count", async () => {
    // The fallback terminal height is 24, so the panel fills to 22 lines (24 minus the
    // App's padding) and the footer sits on the last line — one blank line above the
    // terminal bottom — no matter how many scopes are configured.
    const none = renderSettings({ ...DEFAULT_CONFIG, groupScopes: [] });
    await vi.waitFor(() => expect(none.lastFrame()).toContain("esc back"));
    const noneLines = none.lastFrame()!.split("\n");
    expect(noneLines).toHaveLength(22);
    expect(noneLines.at(-1)).toContain("esc back");

    const several = renderSettings({ ...DEFAULT_CONFIG, groupScopes: ["@a", "@b", "@c"] });
    await vi.waitFor(() => expect(several.lastFrame()).toContain("esc back"));
    const severalLines = several.lastFrame()!.split("\n");
    expect(severalLines).toHaveLength(22); // same total height as the empty case
    expect(severalLines.at(-1)).toContain("esc back");
  });

  it("toggles the first setting (frequency sort) on space", async () => {
    const { stdin, onConfigChange } = renderSettings();
    await tick();
    stdin.write(" ");
    await vi.waitFor(() =>
      expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ frequencySort: true })),
    );
  });

  it("toggles the second setting after moving down", async () => {
    const { stdin, onConfigChange } = renderSettings();
    await tick();
    stdin.write(DOWN);
    await tick();
    stdin.write(" ");
    // Row 1 is "Separate dev dependencies" (default true → toggles to false).
    await vi.waitFor(() =>
      expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ separateDevDeps: false })),
    );
  });

  it("closes on esc", async () => {
    const { stdin, onClose } = renderSettings();
    await tick();
    stdin.write(ESC);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
