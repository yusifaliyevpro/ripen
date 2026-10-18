import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../src/config";
import type { RipenConfig } from "../../src/types";
import { Settings } from "../../src/ui/settings";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const RIGHT = `${ESC}[C`;
const tick = () => new Promise((r) => setTimeout(r, 40));

function renderSettings(config: RipenConfig = DEFAULT_CONFIG) {
  const onConfigChange = vi.fn<(config: RipenConfig) => void>();
  const onClose = vi.fn<() => void>();
  const result = render(<Settings config={config} onConfigChange={onConfigChange} onClose={onClose} />);
  return { ...result, onConfigChange, onClose };
}

// The global managers row sits right after the five toggles.
async function focusManagersRow(stdin: { write: (s: string) => void }) {
  await tick();
  for (let i = 0; i < 5; i++) {
    stdin.write(DOWN);
    await tick();
  }
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

  describe("global package managers", () => {
    it("shows every global package manager as scanned by default", async () => {
      const { lastFrame } = renderSettings();
      await vi.waitFor(() => expect(lastFrame()).toContain("Global scan"));
      expect(lastFrame()).toContain("[x] npm");
      expect(lastFrame()).toContain("[x] pnpm");
      expect(lastFrame()).toContain("[x] yarn");
    });

    it("excludes the picked manager on space", async () => {
      const { stdin, onConfigChange } = renderSettings();
      await focusManagersRow(stdin);
      stdin.write(RIGHT);
      await tick();
      stdin.write(" ");
      await vi.waitFor(() =>
        expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ excludedGlobalManagers: ["pnpm"] })),
      );
    });

    it("re-includes an excluded manager on space", async () => {
      const { stdin, onConfigChange, lastFrame } = renderSettings({
        ...DEFAULT_CONFIG,
        excludedGlobalManagers: ["npm"],
      });
      await vi.waitFor(() => expect(lastFrame()).toContain("[ ] npm"));
      await focusManagersRow(stdin);
      stdin.write(" ");
      await vi.waitFor(() =>
        expect(onConfigChange).toHaveBeenCalledWith(expect.objectContaining({ excludedGlobalManagers: [] })),
      );
    });

    it("refuses to exclude the last scanned manager", async () => {
      const { stdin, onConfigChange } = renderSettings({ ...DEFAULT_CONFIG, excludedGlobalManagers: ["pnpm", "yarn"] });
      await focusManagersRow(stdin);
      stdin.write(" ");
      await tick();
      expect(onConfigChange).not.toHaveBeenCalled();
    });

    it("keeps the scope list focusable after the managers row", async () => {
      const { stdin, lastFrame } = renderSettings({ ...DEFAULT_CONFIG, groupByScope: true, groupScopes: ["@a"] });
      await focusManagersRow(stdin);
      stdin.write(DOWN);
      await tick();
      stdin.write(DOWN);
      await vi.waitFor(() => expect(lastFrame()).toContain("d to remove"));
    });
  });
});
