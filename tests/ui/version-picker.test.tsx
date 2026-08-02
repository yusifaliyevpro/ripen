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

  it("keeps long version strings on a single line so the header stays in view (regression)", async () => {
    // Versions longer than the fixed 16-char version column must NOT wrap to a
    // second line. The picker renders exactly PAGE rows on the assumption that
    // each row is one line tall; if long versions (e.g. canary builds like
    // "19.3.0-canary-d5736f09-20260507") wrap, the total height grows past the
    // terminal and pushes the "Pick version — …" header off-screen.
    const shortVersions: RegistryVersion[] = Array.from({ length: 10 }, (_, i) => ({
      version: `19.2.${10 - i}`,
      date: iso((i + 1) * HOUR),
      ...(i === 0 ? { tag: "latest" as const } : {}),
    }));
    fetchVersions.mockResolvedValueOnce(shortVersions);
    const short = renderPicker({ current: "19.2.7", targetVersion: "19.2.6" });
    await vi.waitFor(() => expect(short.lastFrame()).toContain("19.2.1"));
    const shortLineCount = short.lastFrame()!.split("\n").length;

    // Same list, but the two newest versions are far wider than the 16-char column.
    const longVersions: RegistryVersion[] = shortVersions.map((v, i) =>
      i < 2 ? { ...v, version: `19.3.0-canary-d5736f09-2026050${i}` } : v,
    );
    fetchVersions.mockResolvedValueOnce(longVersions);
    const long = renderPicker({ current: "19.2.7", targetVersion: "19.2.6" });
    await vi.waitFor(() => expect(long.lastFrame()).toContain("19.2.1"));
    const longFrame = long.lastFrame()!;

    // The header must still be present…
    expect(longFrame).toContain("Pick version");
    // …and the long versions must not have added extra lines to the view.
    expect(longFrame.split("\n").length).toBe(shortLineCount);
  });

  it("renders the current version and a fetch failure message", async () => {
    fetchVersions.mockResolvedValue([]);
    const { lastFrame } = renderPicker();
    await vi.waitFor(() => expect(lastFrame()).toContain("Could not fetch versions."));
    expect(lastFrame()).toContain("1.0.0"); // current version in the header
  });
});
