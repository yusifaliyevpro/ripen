import { Text } from "ink";
import { cleanup, render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as RegistryModule from "../../src/registry";
import type { PackageManager } from "../../src/types";

// The hook decides synchronously from the cache and refreshes it in the
// background — mock both boundaries.
const loadCachedLatestVersion = vi.fn<() => string | null>();
const saveCachedLatestVersion = vi.fn<(v: string) => void>();
vi.mock("../../src/config", () => ({
  loadCachedLatestVersion: () => loadCachedLatestVersion(),
  saveCachedLatestVersion: (v: string) => saveCachedLatestVersion(v),
}));

// Keep the real isNewerVersion; only stub the network call.
const fetchLatestVersion = vi.fn<() => Promise<string | null>>();
vi.mock("../../src/registry", async (orig) => {
  const actual = await orig<typeof RegistryModule>();
  return { ...actual, fetchLatestVersion: () => fetchLatestVersion() };
});

const { useSelfUpdate } = await import("../../src/hooks/use-self-update");

function Probe({ current, mgr }: { current: string; mgr: PackageManager }) {
  const s = useSelfUpdate(current, mgr);
  return <Text>{`up=${s.hasUpdate} latest=${s.latestVersion} cmd=${s.buildUpdateCommand()}`}</Text>;
}

const tick = () => new Promise((r) => setTimeout(r, 40));

beforeEach(() => {
  loadCachedLatestVersion.mockReturnValue(null);
  fetchLatestVersion.mockResolvedValue(null);
});

afterEach(() => cleanup());

describe("useSelfUpdate — decision from cache", () => {
  it("reports an update when the cached version is newer than current", () => {
    loadCachedLatestVersion.mockReturnValue("2.0.0");
    const { lastFrame } = render(<Probe current="1.0.0" mgr="pnpm" />);
    expect(lastFrame()).toContain("up=true");
    expect(lastFrame()).toContain("latest=2.0.0");
  });

  it("reports no update when the cache equals the current version", () => {
    loadCachedLatestVersion.mockReturnValue("1.0.0");
    const { lastFrame } = render(<Probe current="1.0.0" mgr="pnpm" />);
    expect(lastFrame()).toContain("up=false");
  });

  it("reports no update when the cache is older than current", () => {
    loadCachedLatestVersion.mockReturnValue("0.9.0");
    const { lastFrame } = render(<Probe current="1.0.0" mgr="pnpm" />);
    expect(lastFrame()).toContain("up=false");
  });

  it("reports no update when there is no cache (first run)", () => {
    loadCachedLatestVersion.mockReturnValue(null);
    const { lastFrame } = render(<Probe current="1.0.0" mgr="pnpm" />);
    expect(lastFrame()).toContain("up=false");
    expect(lastFrame()).toContain("latest=null");
  });
});

describe("useSelfUpdate — buildUpdateCommand", () => {
  it("uses -g for pnpm/npm and the cached version", () => {
    loadCachedLatestVersion.mockReturnValue("2.0.0");
    expect(render(<Probe current="1.0.0" mgr="pnpm" />).lastFrame()).toContain("cmd=pnpm add -g ripencli@2.0.0");
    expect(render(<Probe current="1.0.0" mgr="npm" />).lastFrame()).toContain("cmd=npm add -g ripencli@2.0.0");
  });

  it("uses 'yarn global add' and 'bun add -g'", () => {
    loadCachedLatestVersion.mockReturnValue("2.0.0");
    expect(render(<Probe current="1.0.0" mgr="yarn" />).lastFrame()).toContain("cmd=yarn global add ripencli@2.0.0");
    expect(render(<Probe current="1.0.0" mgr="bun" />).lastFrame()).toContain("cmd=bun add -g ripencli@2.0.0");
  });

  it("falls back to @latest when no version is cached", () => {
    loadCachedLatestVersion.mockReturnValue(null);
    expect(render(<Probe current="1.0.0" mgr="npm" />).lastFrame()).toContain("cmd=npm add -g ripencli@latest");
  });
});

describe("useSelfUpdate — background refresh", () => {
  it("writes the freshly fetched version to the cache", async () => {
    loadCachedLatestVersion.mockReturnValue(null);
    fetchLatestVersion.mockResolvedValue("3.0.0");
    render(<Probe current="1.0.0" mgr="pnpm" />);
    await vi.waitFor(() => expect(saveCachedLatestVersion).toHaveBeenCalledWith("3.0.0"));
  });

  it("does not write the cache when the fetch fails", async () => {
    loadCachedLatestVersion.mockReturnValue(null);
    fetchLatestVersion.mockResolvedValue(null);
    render(<Probe current="1.0.0" mgr="pnpm" />);
    await tick();
    expect(saveCachedLatestVersion).not.toHaveBeenCalled();
  });
});
