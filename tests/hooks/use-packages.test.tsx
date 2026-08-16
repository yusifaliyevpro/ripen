import { Text, useInput } from "ink";
import { render } from "ink-testing-library";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePackages } from "../../src/hooks/use-packages";
import type { OutdatedPackage } from "../../src/types";

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

/**
 * Drives usePackages from a headless component: seeds the initial list, renders
 * the selection state as a string of 0/1 (plus each package's targetVersion),
 * and maps single keystrokes to the hook's callbacks so tests can exercise them
 * via stdin — the same pattern the other hook/UI tests use.
 */
function Probe({ initial }: { initial: OutdatedPackage[] }) {
  const { packages, setPackages, toggleOne, toggleMany, chooseVersion } = usePackages();

  useEffect(() => {
    setPackages(initial);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInput((input) => {
    if (input === "o") toggleOne(1); // toggle the middle package
    if (input === "a") toggleMany([0, 1, 2]); // toggle the whole list
    if (input === "p") toggleMany([0, 2]); // toggle a partial subset
    if (input === "t") toggleMany([0]); // toggle just the first
    if (input === "V") chooseVersion(1, "3.0.0", "2020-01-01T00:00:00Z");
  });

  const sel = packages.map((p) => (p.selected ? "1" : "0")).join("");
  const target = packages.map((p) => p.targetVersion ?? "-").join(",");
  return <Text>{`sel=${sel} target=${target}`}</Text>;
}

const three = () => [pkg("a"), pkg("b"), pkg("c")];

afterEach(() => vi.restoreAllMocks());

describe("usePackages — toggleOne", () => {
  it("flips only the targeted package", async () => {
    const { stdin, lastFrame } = render(<Probe initial={three()} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
    stdin.write("o");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=010"));
    stdin.write("o");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
  });
});

describe("usePackages — toggleMany", () => {
  it("selects the whole group when none are selected", async () => {
    const { stdin, lastFrame } = render(<Probe initial={three()} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
    stdin.write("a");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=111"));
  });

  it("deselects the whole group when all are already selected", async () => {
    const { stdin, lastFrame } = render(<Probe initial={three().map((p) => ({ ...p, selected: true }))} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=111"));
    stdin.write("a");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
  });

  it("selects all when only some in the group are selected", async () => {
    const init = three();
    init[1].selected = true; // partial selection
    const { stdin, lastFrame } = render(<Probe initial={init} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=010"));
    stdin.write("a");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=111"));
  });

  it("only touches the packages named by the given indices", async () => {
    const { stdin, lastFrame } = render(<Probe initial={three()} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
    stdin.write("p"); // toggle indices 0 and 2, leave 1 alone
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=101"));
  });

  it("treats a subset that is fully selected as 'deselect the subset'", async () => {
    const init = three();
    init[0].selected = true; // subset [0] is fully selected...
    init[2].selected = true; // ...but the whole list is not
    const { stdin, lastFrame } = render(<Probe initial={init} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=101"));
    stdin.write("t"); // toggle just index 0, which is already selected → deselect it
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=001"));
  });
});

describe("usePackages — chooseVersion", () => {
  it("sets the target version and selects the package", async () => {
    const { stdin, lastFrame } = render(<Probe initial={three()} />);
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=000"));
    stdin.write("V");
    await vi.waitFor(() => expect(lastFrame()).toContain("sel=010"));
    expect(lastFrame()).toContain("target=-,3.0.0,-");
  });
});
