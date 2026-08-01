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
