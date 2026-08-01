import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config";
import type { RipenConfig } from "../../src/types";
import { Settings } from "../../src/ui/Settings";

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
