import { describe, expect, it } from "vitest";
import {
  buildDisplayRows,
  buildGroups,
  computeMaxPerGroup,
  filterCollapsed,
  getScope,
  groupCheckbox,
  sortableName,
} from "../src/lib/build-rows";
import type { OutdatedPackage } from "../src/types";

function pkg(name: string, type: OutdatedPackage["type"] = "dependencies", selected = false): OutdatedPackage {
  return { name, current: "1.0.0", wanted: "2.0.0", latest: "2.0.0", dependent: "", type, selected };
}

describe("getScope", () => {
  it("extracts the scope from a scoped name", () => {
    expect(getScope("@heroui/react")).toBe("@heroui");
  });

  it("returns null for an unscoped name", () => {
    expect(getScope("react")).toBeNull();
  });
});

describe("sortableName", () => {
  it("strips a leading @ so scoped names sort by the scope letter", () => {
    expect(sortableName("@vercel/og")).toBe("vercel/og");
    expect(sortableName("react")).toBe("react");
  });
});

describe("buildDisplayRows", () => {
  it("emits a header per type followed by its packages, alphabetically", () => {
    const rows = buildDisplayRows([pkg("zod"), pkg("axios"), pkg("vitest", "devDependencies")]);
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toEqual(["header", "package", "package", "header", "package"]);

    const depHeader = rows[0];
    expect(depHeader.kind === "header" && depHeader.label).toBe("Dependencies");
    // axios before zod
    expect(rows[1].kind === "package" && rows[1].pkg.name).toBe("axios");
    expect(rows[2].kind === "package" && rows[2].pkg.name).toBe("zod");

    const devHeader = rows[3];
    expect(devHeader.kind === "header" && devHeader.label).toBe("Dev Dependencies");
  });

  it("orders sections dependencies → devDependencies → global", () => {
    const rows = buildDisplayRows([pkg("g", "global"), pkg("d", "devDependencies"), pkg("a", "dependencies")]);
    const headers = rows.filter((r) => r.kind === "header").map((r) => (r.kind === "header" ? r.label : ""));
    expect(headers).toEqual(["Dependencies", "Dev Dependencies", "Global Packages"]);
  });

  it("merges devDependencies into 'All Dependencies' when separateDevDeps is false", () => {
    const rows = buildDisplayRows([pkg("react"), pkg("vitest", "devDependencies")], false, [], false, false, {}, false);
    const headers = rows.filter((r) => r.kind === "header");
    expect(headers).toHaveLength(1);
    expect(headers[0].kind === "header" && headers[0].label).toBe("All Dependencies");
  });

  it("groups a scope with 2+ members under a scope-header", () => {
    const rows = buildDisplayRows([pkg("@heroui/react"), pkg("@heroui/theme"), pkg("axios")], true, ["@heroui"]);
    const scopeHeaders = rows.filter((r) => r.kind === "scope-header");
    expect(scopeHeaders).toHaveLength(1);
    expect(scopeHeaders[0].kind === "scope-header" && scopeHeaders[0].scope).toBe("@heroui");
    // scoped packages are indented under the scope-header
    const heroPkgs = rows.filter((r) => r.kind === "package" && r.pkg.name.startsWith("@heroui"));
    expect(heroPkgs.every((r) => r.kind === "package" && r.indented)).toBe(true);
  });

  it("does not group a scope with a single member", () => {
    const rows = buildDisplayRows([pkg("@heroui/react"), pkg("axios")], true, ["@heroui"]);
    expect(rows.some((r) => r.kind === "scope-header")).toBe(false);
  });

  it("sorts by frequency (desc) when frequencySort is on", () => {
    const rows = buildDisplayRows([pkg("rare"), pkg("common")], false, [], false, true, { common: 10, rare: 1 });
    const pkgRows = rows.filter((r) => r.kind === "package");
    expect(pkgRows[0].kind === "package" && pkgRows[0].pkg.name).toBe("common");
    expect(pkgRows[1].kind === "package" && pkgRows[1].pkg.name).toBe("rare");
  });

  it("carries the original package index on each row", () => {
    const rows = buildDisplayRows([pkg("zod"), pkg("axios")]);
    const byName = new Map(rows.filter((r) => r.kind === "package").map((r) => [r.pkg.name, r.packageIndex]));
    expect(byName.get("zod")).toBe(0);
    expect(byName.get("axios")).toBe(1);
  });
});

describe("filterCollapsed", () => {
  it("hides package rows whose scopeKey is collapsed", () => {
    const rows = buildDisplayRows([pkg("@heroui/react"), pkg("@heroui/theme"), pkg("axios")], true, ["@heroui"]);
    const visible = filterCollapsed(rows, new Set(["dependencies::@heroui"]));
    expect(visible.some((r) => r.kind === "package" && r.pkg.name.startsWith("@heroui"))).toBe(false);
    // the scope-header itself and unscoped axios remain
    expect(visible.some((r) => r.kind === "scope-header")).toBe(true);
    expect(visible.some((r) => r.kind === "package" && r.pkg.name === "axios")).toBe(true);
  });
});

describe("buildGroups", () => {
  it("collects rows under their preceding header", () => {
    const rows = buildDisplayRows([pkg("react"), pkg("vitest", "devDependencies")]);
    const groups = buildGroups(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].type).toBe("dependencies");
    expect(groups[0].items).toHaveLength(1);
    expect(groups[1].type).toBe("devDependencies");
  });
});

describe("groupCheckbox", () => {
  it("is empty when nothing is selected", () => {
    expect(groupCheckbox([pkg("a"), pkg("b")])).toEqual({ symbol: "□", color: "gray" });
  });

  it("is full when all are selected", () => {
    expect(groupCheckbox([pkg("a", "dependencies", true), pkg("b", "dependencies", true)])).toEqual({
      symbol: "■",
      color: "greenBright",
    });
  });

  it("is partial when some are selected", () => {
    expect(groupCheckbox([pkg("a", "dependencies", true), pkg("b")])).toEqual({ symbol: "◧", color: "yellow" });
  });
});

describe("computeMaxPerGroup", () => {
  it("never returns fewer than 3 rows per group", () => {
    expect(computeMaxPerGroup(10, 3)).toBe(3);
  });

  it("grows with available terminal height", () => {
    const small = computeMaxPerGroup(40, 1);
    const large = computeMaxPerGroup(80, 1);
    expect(large).toBeGreaterThan(small);
  });
});
