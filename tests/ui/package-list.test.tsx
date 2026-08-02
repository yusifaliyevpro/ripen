import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutdatedPackage } from "../../src/types";
import { PackageList } from "../../src/ui/package-list";

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

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const noop = () => {};

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

const tick = () => new Promise((r) => setTimeout(r, 40));

afterEach(() => vi.restoreAllMocks());

describe("PackageList rendering", () => {
  it("shows package names, the group label and the outdated count", async () => {
    const { lastFrame } = renderList([pkg("react"), pkg("zod")]);
    await vi.waitFor(() => expect(lastFrame()).toContain("react"));
    const frame = lastFrame()!;
    expect(frame).toContain("zod");
    expect(frame).toContain("Dependencies");
    expect(frame).toContain("2 outdated");
  });

  it("fills a stable height so the header and footer stay put regardless of package count (regression)", async () => {
    // With few packages the list must still occupy the same total height as a
    // full list, otherwise the header/footer float and shift as the count changes.
    const few = renderList([pkg("react"), pkg("zod")]);
    await vi.waitFor(() => expect(few.lastFrame()).toContain("react"));
    const fewHeight = few.lastFrame()!.split("\n").length;

    const many = renderList(Array.from({ length: 12 }, (_, i) => pkg(`pkg-${i}`)));
    await vi.waitFor(() => expect(many.lastFrame()).toContain("pkg-0"));
    const manyHeight = many.lastFrame()!.split("\n").length;

    expect(fewHeight).toBe(manyHeight);
    // Header pinned to the top, footer pinned to the bottom.
    expect(few.lastFrame()!.split("\n")[0]).toContain("ripen");
    expect(few.lastFrame()!.split("\n").at(-1)).toContain("selected");
  });

  it("flags a major version bump but not a minor one", async () => {
    const { lastFrame } = renderList([
      pkg("react", { current: "18.0.0", latest: "19.0.0" }),
      pkg("zod", { current: "3.20.0", latest: "3.22.0" }),
    ]);
    await vi.waitFor(() => expect(lastFrame()).toContain("react"));
    const frame = lastFrame()!;
    // Exactly one "⚠ major" marker — for react (18→19), not zod (3.20→3.22).
    expect(frame.match(/major/g)?.length).toBe(1);
  });
});

describe("PackageList interaction", () => {
  it("toggles the focused package on space", async () => {
    const onToggle = vi.fn<(index: number) => void>();
    const { stdin } = renderList([pkg("react"), pkg("zod")], { onToggle });
    await tick();
    // Row 0 is the group header; move down to the first package (index 0) then select.
    stdin.write(DOWN);
    await tick();
    stdin.write(" ");
    await vi.waitFor(() => expect(onToggle).toHaveBeenCalledWith(0));
  });

  it("selects the whole group on space over the header", async () => {
    const onToggleMany = vi.fn<(indices: number[]) => void>();
    const { stdin } = renderList([pkg("react"), pkg("zod")], { onToggleMany });
    await tick();
    // Focus starts on the header row.
    stdin.write(" ");
    await vi.waitFor(() => expect(onToggleMany).toHaveBeenCalledWith([0, 1]));
  });

  it("opens the version picker for the focused package on 'v'", async () => {
    const onSelectVersion = vi.fn<(index: number) => void>();
    const { stdin } = renderList([pkg("react")], { onSelectVersion });
    await tick();
    stdin.write(DOWN);
    await tick();
    stdin.write("v");
    await vi.waitFor(() => expect(onSelectVersion).toHaveBeenCalledWith(0));
  });

  it("ignores input when isActive is false", async () => {
    const onToggleMany = vi.fn<(indices: number[]) => void>();
    const { stdin } = renderList([pkg("react")], { onToggleMany, isActive: false });
    await tick();
    stdin.write(" ");
    await tick();
    expect(onToggleMany).not.toHaveBeenCalled();
  });
});
