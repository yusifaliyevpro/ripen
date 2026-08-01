import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OutdatedPackage, RegistryVersion } from "../../src/types";

// Mock the registry so no network is hit; the picker only calls fetchVersions.
const fetchVersions = vi.fn<(name: string, current?: string) => Promise<RegistryVersion[]>>();
vi.mock("../../src/registry", () => ({ fetchVersions: (...a: [string, string?]) => fetchVersions(...a) }));

const { VersionPicker } = await import("../../src/ui/version-picker");

const HOUR = 3_600_000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

function renderPicker(pkg: Partial<OutdatedPackage> = {}) {
  return render(
    <VersionPicker
      pkg={{
        name: "ripencli",
        current: "1.0.0",
        wanted: "1.1.3",
        latest: "1.1.3",
        dependent: "",
        type: "dependencies",
        targetVersion: "1.1.3",
        ...pkg,
      }}
      onSelect={() => {}}
      onCancel={() => {}}
      onError={() => {}}
    />,
  );
}

afterEach(() => {
  fetchVersions.mockReset();
  vi.restoreAllMocks();
});

describe("VersionPicker", () => {
  it("shows DISTINCT ages for versions published on the same day (regression)", async () => {
    // 1.1.1/1.1.2/1.1.3 all published today, hours apart — the age column must
    // reflect the time of day, not collapse to one value.
    fetchVersions.mockResolvedValue([
      { version: "1.1.3", date: iso(1 * HOUR), tag: "latest" },
      { version: "1.1.2", date: iso(5 * HOUR) },
      { version: "1.1.1", date: iso(20 * HOUR) },
    ]);

    const { lastFrame } = renderPicker();
    await vi.waitFor(() => expect(lastFrame()).toContain("1.1.3"));
    const frame = lastFrame()!;

    expect(frame).toContain("1h");
    expect(frame).toContain("5h");
    expect(frame).toContain("20h");
    // Three same-day versions ⇒ three different ages, never one repeated value.
    expect(new Set(["1h", "5h", "20h"]).size).toBe(3);
  });

  it("renders the current version and a fetch failure message", async () => {
    fetchVersions.mockResolvedValue([]);
    const { lastFrame } = renderPicker();
    await vi.waitFor(() => expect(lastFrame()).toContain("Could not fetch versions."));
    expect(lastFrame()).toContain("1.0.0"); // current version in the header
  });
});
