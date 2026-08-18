import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectInfo, RipenConfig } from "../../src/types";

const CONFIG: RipenConfig = {
  groupByScope: false,
  groupScopes: [],
  groupsOnTop: false,
  frequencySort: false,
  separateDevDeps: true,
  sfwFirewall: false,
};

// Mock every IO boundary so <App> mounts and stays on the loading screen (the fetch never
// resolves), leaving the global Ctrl+C handler active and the test fully deterministic.
vi.mock("../../src/config", () => ({
  loadConfig: () => CONFIG,
  saveConfig: () => {},
  loadFrequency: () => ({}),
  incrementFrequency: () => {},
  loadCachedLatestVersion: () => null, // no cached version ⇒ no self-update prompt
  saveCachedLatestVersion: () => {},
}));
vi.mock("../../src/fetcher", () => ({
  getOutdatedPackages: () => new Promise(() => {}), // never resolves ⇒ stays on loading
  getAllGlobalOutdated: () => new Promise(() => {}),
}));
vi.mock("../../src/registry", () => ({
  fetchLatestVersion: () => Promise.resolve(null),
  isNewerVersion: () => false,
  prewarmGitHubToken: () => {},
  fetchVersions: () => Promise.resolve([]),
  fetchChangelog: () => Promise.resolve({ entries: [] }),
  fetchRepoUrl: () => Promise.resolve(""),
}));
vi.mock("../../src/build-commands", () => ({ buildUpdateCommands: () => [] }));
vi.mock("../../src/lib/utils", () => ({ copyToClipboard: () => {}, openInBrowser: () => {} }));

const { render } = await import("ink-testing-library");
const { App } = await import("../../src/ui/app");

const CTRL_C = "\x03";
const project: ProjectInfo = { name: "demo", cwd: ".", manager: "npm", packageJson: null };

function renderApp(props: Partial<Parameters<typeof App>[0]> = {}) {
  return render(
    <App project={project} global={false} showAll={false} version="1.0.0" installManager="npm" {...props} />,
  );
}

afterEach(() => vi.restoreAllMocks());

describe("App cancellation", () => {
  it("calls onCancel when the user presses Ctrl+C", async () => {
    const onCancel = vi.fn<() => void>();
    const { stdin, lastFrame } = renderApp({ onCancel });
    await vi.waitFor(() => expect(lastFrame()).toContain("ripen"));
    stdin.write(CTRL_C);
    await vi.waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("does not call onCopied or onEmpty on a Ctrl+C cancel", async () => {
    const onCopied = vi.fn<(cmds: string[]) => void>();
    const onEmpty = vi.fn<() => void>();
    const { stdin, lastFrame } = renderApp({ onCopied, onEmpty });
    await vi.waitFor(() => expect(lastFrame()).toContain("ripen"));
    stdin.write(CTRL_C);
    await new Promise((r) => setTimeout(r, 50));
    expect(onCopied).not.toHaveBeenCalled();
    expect(onEmpty).not.toHaveBeenCalled();
  });
});
