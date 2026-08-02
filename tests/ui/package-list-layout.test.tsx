import type * as Ink from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutdatedPackage } from "../../src/types";

// Control the terminal height the component sees. Mocking ink's useWindowSize is reliable
// (unlike mocking terminal-size, which pnpm resolves to ink's own copy); we spread the real
// module so ink-testing-library's render still uses the genuine renderer.
let mockRows = 24;
vi.mock("ink", async (orig) => {
  const actual = await orig<typeof Ink>();
  return { ...actual, useWindowSize: () => ({ rows: mockRows, columns: 100 }) };
});

const { render } = await import("ink-testing-library");
const { PackageList } = await import("../../src/ui/package-list");

function pkg(name: string, over: Partial<OutdatedPackage> = {}): OutdatedPackage {
  return {
    name,
    current: "1.0.0",
    wanted: "2.0.0",
    latest: "2.0.0",
    dependent: "",
    type: "dependencies",
    selected: false,
    ...over,
  };
}

const noop = () => {};
const settle = () => new Promise((r) => setTimeout(r, 50));

function renderList(packages: OutdatedPackage[], props: Partial<Parameters<typeof PackageList>[0]> = {}) {
  return render(
    <PackageList
      packages={packages}
      onToggle={noop}
      onToggleMany={noop}
      onSelectVersion={noop}
      onViewChangelog={noop}
      onConfirm={noop}
      groupScopes={[]}
      {...props}
    />,
  );
}

afterEach(() => {
  mockRows = 24;
  vi.restoreAllMocks();
});

describe("PackageList layout", () => {
  it("keeps a blank line between the ripen title and the controls (single group)", async () => {
    const { lastFrame } = renderList([pkg("react"), pkg("zod")]);
    await settle();
    const lines = lastFrame()!.split("\n");
    expect(lines[0]).toContain("ripen");
    expect(lines[1].trim()).toBe(""); // the marginTop blank line
    expect(lines[2]).toContain("navigate");
  });

  it("keeps that blank line even with dev dependencies separated (two groups)", async () => {
    // Regression: two groups must not push the header up and swallow the blank line.
    const { lastFrame } = renderList(
      [pkg("react", { type: "dependencies" }), pkg("eslint", { type: "devDependencies" })],
      { separateDevDeps: true },
    );
    await settle();
    const lines = lastFrame()!.split("\n");
    expect(lines[0]).toContain("ripen");
    expect(lines[1].trim()).toBe("");
    expect(lines[2]).toContain("navigate");
  });

  it("fills to a stable window-derived height with the footer pinned to the bottom", async () => {
    mockRows = 30;
    const { lastFrame } = renderList([pkg("react"), pkg("zod")]);
    await settle();
    const lines = lastFrame()!.split("\n");
    expect(lines).toHaveLength(mockRows - 2); // terminal minus the App's padding
    expect(lines[0]).toContain("ripen");
    expect(lines.at(-1)).toContain("selected");
  });

  it("keeps the same total height whether the list is short or long", async () => {
    mockRows = 30;
    const few = renderList([pkg("react"), pkg("zod")]);
    await settle();
    const many = renderList(Array.from({ length: 20 }, (_, i) => pkg(`pkg-${i}`)));
    await settle();
    expect(few.lastFrame()!.split("\n").length).toBe(many.lastFrame()!.split("\n").length);
  });

  it("shows more rows per group as the terminal grows", async () => {
    const many = Array.from({ length: 20 }, (_, i) => pkg(`p-${i}`));
    mockRows = 20;
    const short = renderList(many);
    await settle();
    const shortShown = (short.lastFrame()!.match(/○/g) ?? []).length;

    mockRows = 40;
    const tall = renderList(many);
    await settle();
    const tallShown = (tall.lastFrame()!.match(/○/g) ?? []).length;

    expect(tallShown).toBeGreaterThan(shortShown);
  });

  it("does not over-provision two groups past the viewport (header stays in view)", async () => {
    mockRows = 24;
    const { lastFrame } = renderList(
      [
        ...Array.from({ length: 4 }, (_, i) => pkg(`dep-${i}`, { type: "dependencies" })),
        ...Array.from({ length: 8 }, (_, i) => pkg(`dev-${i}`, { type: "devDependencies" })),
      ],
      { separateDevDeps: true },
    );
    await settle();
    const frame = lastFrame()!;
    const lines = frame.split("\n");
    expect(lines[0]).toContain("ripen"); // top header not scrolled off
    expect(frame).toContain("Dependencies (4)");
    expect(frame).toContain("Dev Dependencies (8)");
    // Content stays within the terminal budget (rows minus the App's padding).
    expect(lines.length).toBeLessThanOrEqual(mockRows - 2);
  });
});
