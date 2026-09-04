import { execSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, formatAge } from "../src/lib/utils";

vi.mock("node:child_process", () => ({
  exec: vi.fn<() => void>(),
  execSync: vi.fn<() => Buffer>(),
}));

describe("formatAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const NOW = new Date("2026-08-01T12:00:00.000Z");

  function ago(ms: number): string {
    return new Date(NOW.getTime() - ms).toISOString();
  }

  const MIN = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  it("returns '' for an empty string", () => {
    expect(formatAge("")).toBe("");
  });

  it("returns '' for a future date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(new Date(NOW.getTime() + HOUR).toISOString())).toBe("");
  });

  it("formats sub-hour ages in minutes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(5 * MIN))).toBe("5m");
  });

  it("formats sub-day ages in hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(21 * HOUR))).toBe("21h");
  });

  it("formats sub-month ages in days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(3 * DAY))).toBe("3d");
  });

  it("formats sub-year ages in months", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(60 * DAY))).toBe("2mo");
  });

  it("formats year-plus ages in years", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(2 * 365 * DAY))).toBe("2y");
  });

  it("switches units exactly at each boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(HOUR))).toBe("1h");
    expect(formatAge(ago(DAY))).toBe("1d");
    expect(formatAge(ago(30 * DAY))).toBe("1mo");
    expect(formatAge(ago(365 * DAY))).toBe("1y");
  });

  it("keeps the smaller unit just below a boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(formatAge(ago(HOUR - MIN))).toBe("59m");
    expect(formatAge(ago(DAY - HOUR))).toBe("23h");
  });
});

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value, configurable: true });
}

describe("copyToClipboard", () => {
  const execSyncMock = vi.mocked(execSync);
  const original = process.platform;

  afterEach(() => {
    setPlatform(original);
  });

  it("pipes text to clip on Windows", () => {
    setPlatform("win32");
    copyToClipboard("cmd text");
    expect(execSyncMock).toHaveBeenCalledWith("clip", { input: "cmd text" });
  });

  it("pipes text to pbcopy on macOS", () => {
    setPlatform("darwin");
    copyToClipboard("cmd text");
    expect(execSyncMock).toHaveBeenCalledWith("pbcopy", { input: "cmd text" });
  });

  it("falls back from xclip to xsel on Linux", () => {
    setPlatform("linux");
    execSyncMock.mockImplementationOnce(() => {
      throw new Error("xclip not found");
    });
    copyToClipboard("cmd text");
    expect(execSyncMock).toHaveBeenNthCalledWith(1, "xclip -selection clipboard", { input: "cmd text" });
    expect(execSyncMock).toHaveBeenNthCalledWith(2, "xsel --clipboard --input", { input: "cmd text" });
  });

  it("swallows errors when no clipboard tool is available", () => {
    setPlatform("linux");
    execSyncMock.mockImplementation(() => {
      throw new Error("nope");
    });
    expect(() => copyToClipboard("x")).not.toThrow();
  });
});
