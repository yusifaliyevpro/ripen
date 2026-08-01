import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAge } from "../src/lib/utils";

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
});
