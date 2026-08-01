import { describe, expect, it } from "vitest";
import { extractJson, parseNpmOutdated, parsePnpmOutdated, parseYarnOutdated } from "../src/fetcher";

describe("extractJson", () => {
  it("returns the JSON object when it is the whole string", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });

  it("extracts the first top-level object past leading noise (e.g. pnpm WARN)", () => {
    const raw = 'WARN deprecated foo\n{"pkg":{"latest":"2.0.0"}}';
    expect(extractJson(raw)).toBe('{"pkg":{"latest":"2.0.0"}}');
  });

  it("handles nested braces correctly", () => {
    expect(extractJson('noise {"a":{"b":2}} trailing')).toBe('{"a":{"b":2}}');
  });

  it("returns null when there is no object", () => {
    expect(extractJson("no json here")).toBeNull();
  });
});

describe("parsePnpmOutdated", () => {
  it("maps registry entries to OutdatedPackage rows", () => {
    const rows = parsePnpmOutdated({
      typescript: { current: "5.0.0", wanted: "5.2.0", latest: "5.3.0" },
    });
    expect(rows).toEqual([
      {
        name: "typescript",
        current: "5.0.0",
        wanted: "5.2.0",
        latest: "5.3.0",
        dependent: "",
        type: "global",
        selected: false,
        targetVersion: "5.3.0",
      },
    ]);
  });

  it("falls back to latest when wanted is missing and 'N/A' when current is missing", () => {
    const [row] = parsePnpmOutdated({ pkg: { latest: "1.0.0" } });
    expect(row.wanted).toBe("1.0.0");
    expect(row.current).toBe("N/A");
  });

  it("returns [] for a non-object payload", () => {
    // pnpm emits `null` / an array when nothing is outdated. JSON.parse yields
    // `any` here, matching how fetcher.ts feeds this parser in production.
    expect(parsePnpmOutdated(JSON.parse("null"))).toEqual([]);
    expect(parsePnpmOutdated(JSON.parse("[]"))).toEqual([]);
  });
});

describe("parseNpmOutdated", () => {
  it("carries the dependent field through", () => {
    const [row] = parseNpmOutdated({
      react: { current: "18.0.0", wanted: "18.2.0", latest: "19.0.0", dependent: "my-app" },
    });
    expect(row).toMatchObject({ name: "react", dependent: "my-app", targetVersion: "19.0.0" });
  });

  it("defaults dependent to '' when absent", () => {
    const [row] = parseNpmOutdated({ react: { latest: "19.0.0" } });
    expect(row.dependent).toBe("");
  });
});

describe("parseYarnOutdated", () => {
  it("reads the table row body from yarn's ndjson output", () => {
    const raw = [
      '{"type":"info","data":"ignore me"}',
      '{"type":"table","data":{"body":[["lodash","4.17.20","4.17.21","4.17.21","dependencies"]]}}',
    ].join("\n");
    const rows = parseYarnOutdated(raw);
    expect(rows).toEqual([
      {
        name: "lodash",
        current: "4.17.20",
        wanted: "4.17.21",
        latest: "4.17.21",
        dependent: "dependencies",
        type: "global",
        selected: false,
        targetVersion: "4.17.21",
      },
    ]);
  });

  it("returns [] when there is no table line", () => {
    expect(parseYarnOutdated('{"type":"info","data":"nothing"}')).toEqual([]);
  });

  it("skips non-JSON lines without throwing", () => {
    const raw = 'garbage line\n{"type":"table","data":{"body":[["a","1.0.0","2.0.0","2.0.0","deps"]]}}';
    expect(parseYarnOutdated(raw)).toHaveLength(1);
  });
});
