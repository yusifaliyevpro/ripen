import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChangelogResult, OutdatedPackage } from "../../src/types";

// Mock the network + browser boundaries so the panel is fully deterministic.
const fetchChangelog = vi.fn<() => Promise<ChangelogResult>>();
const fetchRepoUrl = vi.fn<() => Promise<string>>();
const openInBrowser = vi.fn<(url: string) => void>();

vi.mock("../../src/registry", () => ({
  fetchChangelog: () => fetchChangelog(),
  fetchRepoUrl: () => fetchRepoUrl(),
}));
vi.mock("../../src/lib/utils", () => ({ openInBrowser: (url: string) => openInBrowser(url) }));

const { ChangelogPanel } = await import("../../src/ui/changelog-panel");

const ESC = String.fromCharCode(27);
const RIGHT = `${ESC}[C`;

function renderPanel(pkg: Partial<OutdatedPackage> = {}) {
  const onClose = vi.fn<() => void>();
  const onError = vi.fn<(message: string) => void>();
  const result = render(
    <ChangelogPanel
      pkg={{
        name: "ripencli",
        current: "1.0.0",
        wanted: "1.1.0",
        latest: "1.1.0",
        dependent: "",
        type: "dependencies",
        targetVersion: "1.1.0",
        ...pkg,
      }}
      onClose={onClose}
      onError={onError}
    />,
  );
  return { ...result, onClose, onError };
}

afterEach(() => {
  fetchChangelog.mockReset();
  fetchRepoUrl.mockReset();
  openInBrowser.mockReset();
  vi.restoreAllMocks();
});

describe("ChangelogPanel — views", () => {
  it("shows the loading state while fetching", async () => {
    fetchChangelog.mockReturnValue(new Promise(() => {})); // never resolves
    fetchRepoUrl.mockResolvedValue("");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("fetching release notes"));
  });

  it("renders the header with the current → target version transition", async () => {
    fetchChangelog.mockResolvedValue({ entries: [{ version: "v1.1.0", body: "notes", url: "" }] });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("Changelog"));
    const frame = lastFrame()!;
    expect(frame).toContain("1.0.0");
    expect(frame).toContain("1.1.0");
  });

  it("renders release-note body markdown", async () => {
    fetchChangelog.mockResolvedValue({
      entries: [{ version: "v1.1.0", body: "## Features\n- shiny new thing", url: "" }],
    });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("shiny new thing"));
    expect(lastFrame()).toContain("Features");
  });

  it("shows the empty state with a hint to open the releases page", async () => {
    fetchChangelog.mockResolvedValue({ entries: [] });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("No GitHub release notes found"));
    expect(lastFrame()).toContain("releases page");
  });

  it("shows the rate-limit state", async () => {
    fetchChangelog.mockResolvedValue({ entries: [], rateLimited: true });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("rate limit"));
    expect(lastFrame()).toContain("gh auth login");
  });

  it("shows the release navigator only when there is more than one entry", async () => {
    fetchChangelog.mockResolvedValue({
      entries: [
        { version: "v1.0.5", body: "old", url: "" },
        { version: "v1.1.0", body: "new", url: "" },
      ],
    });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("(1/2)"));
    expect(lastFrame()).toContain("v1.0.5"); // starts on the oldest entry
  });
});

describe("ChangelogPanel — interaction", () => {
  it("switches releases with the right arrow", async () => {
    fetchChangelog.mockResolvedValue({
      entries: [
        { version: "v1.0.5", body: "old", url: "" },
        { version: "v1.1.0", body: "new", url: "" },
      ],
    });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame, stdin } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("(1/2)"));
    stdin.write(RIGHT);
    await vi.waitFor(() => expect(lastFrame()).toContain("(2/2)"));
    expect(lastFrame()).toContain("v1.1.0");
  });

  it("keeps a stable layout height when switching between short and long releases (regression)", async () => {
    // The body box must be sized from the window, not the content. Otherwise a
    // short release collapses the box, shifting the header up and the footer
    // down as you navigate between releases of differing lengths.
    fetchChangelog.mockResolvedValue({
      entries: [
        { version: "v1.0.5", body: "one short line", url: "" },
        { version: "v1.1.0", body: Array.from({ length: 40 }, (_, i) => `- change ${i}`).join("\n"), url: "" },
      ],
    });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame, stdin } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("(1/2)"));

    const shortReleaseHeight = lastFrame()!.split("\n").length;
    stdin.write(RIGHT);
    await vi.waitFor(() => expect(lastFrame()).toContain("(2/2)"));
    const longReleaseHeight = lastFrame()!.split("\n").length;

    // Same total height regardless of how long each release's notes are.
    expect(longReleaseHeight).toBe(shortReleaseHeight);
  });

  it("keeps a stable layout height between the loading and loaded states (regression)", async () => {
    // The "fetching release notes…" placeholder must occupy the same body height
    // as the loaded notes, otherwise the header/footer jump when the fetch lands.
    let resolve!: (r: ChangelogResult) => void;
    fetchChangelog.mockReturnValue(new Promise<ChangelogResult>((r) => (resolve = r)));
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("fetching release notes"));
    const loadingHeight = lastFrame()!.split("\n").length;

    resolve({ entries: [{ version: "v1.1.0", body: "short note", url: "" }] });
    await vi.waitFor(() => expect(lastFrame()).toContain("short note"));
    const loadedHeight = lastFrame()!.split("\n").length;

    expect(loadedHeight).toBe(loadingHeight);
  });

  it("opens the current release in the browser on 'o'", async () => {
    const url = "https://github.com/o/r/releases/tag/v1.1.0";
    fetchChangelog.mockResolvedValue({ entries: [{ version: "v1.1.0", body: "notes", url }] });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame, stdin } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("open release"));
    stdin.write("o");
    await vi.waitFor(() => expect(openInBrowser).toHaveBeenCalledWith(url));
    expect(lastFrame()).toContain("opened in browser");
  });

  it("opens the releases page on 'r'", async () => {
    fetchChangelog.mockResolvedValue({ entries: [] });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame, stdin } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("releases page"));
    stdin.write("r");
    await vi.waitFor(() => expect(openInBrowser).toHaveBeenCalledWith("https://github.com/o/r/releases"));
  });

  it("closes on esc", async () => {
    fetchChangelog.mockResolvedValue({ entries: [{ version: "v1.1.0", body: "notes", url: "" }] });
    fetchRepoUrl.mockResolvedValue("https://github.com/o/r");
    const { lastFrame, stdin, onClose } = renderPanel();
    await vi.waitFor(() => expect(lastFrame()).toContain("Changelog"));
    stdin.write(ESC);
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
