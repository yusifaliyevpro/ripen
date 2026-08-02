import type { OutdatedPackage } from "../types";

// ── Helpers ──────────────────────────────────────────────────────────

export function getScope(name: string): string | null {
  const match = name.match(/^(@[^/]+)\//);
  return match?.[1] ?? null;
}

/** Strip leading @ for natural alphabetical sorting (so @vercel/x sorts among 'v', not before 'a') */
export function sortableName(name: string): string {
  return name.startsWith("@") ? name.slice(1) : name;
}

// ── Build display rows ───────────────────────────────────────────────

export function buildDisplayRows(
  packages: OutdatedPackage[],
  groupByScope: boolean = false,
  groupScopes: string[] = [],
  groupsOnTop: boolean = false,
  frequencySort: boolean = false,
  frequency: Record<string, number> = {},
  separateDevDeps: boolean = true,
): DisplayRow[] {
  const grouped = new Map<string, { pkg: OutdatedPackage; index: number }[]>();

  packages.forEach((pkg, i) => {
    // When separateDevDeps is false, merge devDependencies into dependencies
    const type = !separateDevDeps && pkg.type === "devDependencies" ? "dependencies" : pkg.type;
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type)!.push({ pkg, index: i });
  });

  const nameSort = (a: { pkg: OutdatedPackage }, b: { pkg: OutdatedPackage }) =>
    sortableName(a.pkg.name).localeCompare(sortableName(b.pkg.name));

  const freqSort = (a: { pkg: OutdatedPackage }, b: { pkg: OutdatedPackage }) => {
    const fa = frequency[a.pkg.name] ?? 0;
    const fb = frequency[b.pkg.name] ?? 0;
    if (fb !== fa) return fb - fa;
    return sortableName(a.pkg.name).localeCompare(sortableName(b.pkg.name));
  };

  const rows: DisplayRow[] = [];
  for (const type of GROUP_ORDER) {
    const items = grouped.get(type);
    if (!items || items.length === 0) continue;
    const allPkgs = items.map((i) => i.pkg);
    // When deps are merged, show "All Dependencies" instead of "Dependencies"
    const label = !separateDevDeps && type === "dependencies" ? "All Dependencies" : (GROUP_LABELS[type] ?? type);
    rows.push({
      kind: "header",
      groupType: type,
      label,
      packages: allPkgs,
      packageIndices: items.map((i) => i.index),
    });

    if (groupByScope && groupScopes.length > 0) {
      const scopeMap = new Map<string, { pkg: OutdatedPackage; index: number }[]>();
      const ungrouped: { pkg: OutdatedPackage; index: number }[] = [];

      for (const item of items) {
        const scope = getScope(item.pkg.name);
        if (scope && groupScopes.includes(scope)) {
          if (!scopeMap.has(scope)) scopeMap.set(scope, []);
          scopeMap.get(scope)!.push(item);
        } else {
          ungrouped.push(item);
        }
      }

      // Separate real scope groups (2+) from singles
      const scopeGroups: { scope: string; items: { pkg: OutdatedPackage; index: number }[] }[] = [];
      for (const [scope, scopeItems] of scopeMap) {
        if (scopeItems.length >= 2) {
          scopeGroups.push({ scope, items: scopeItems });
        } else {
          ungrouped.push(...scopeItems);
        }
      }

      // Sort scope groups: by max frequency if enabled, otherwise alphabetical
      if (frequencySort) {
        scopeGroups.sort((a, b) => {
          const maxA = Math.max(...a.items.map((i) => frequency[i.pkg.name] ?? 0));
          const maxB = Math.max(...b.items.map((i) => frequency[i.pkg.name] ?? 0));
          if (maxB !== maxA) return maxB - maxA;
          return a.scope.localeCompare(b.scope);
        });
      } else {
        scopeGroups.sort((a, b) => a.scope.localeCompare(b.scope));
      }

      const emitScopeGroups = () => {
        for (const { scope, items: scopeItems } of scopeGroups) {
          if (frequencySort) scopeItems.sort(freqSort);
          const scopeKey = `${type}::${scope}`;
          rows.push({
            kind: "scope-header",
            groupType: type,
            scope,
            packageIndices: scopeItems.map((si) => si.index),
            packages: scopeItems.map((si) => si.pkg),
          });
          for (const si of scopeItems) {
            rows.push({ kind: "package", pkg: si.pkg, packageIndex: si.index, indented: true, scopeKey });
          }
        }
      };

      const emitUngrouped = () => {
        ungrouped.sort(frequencySort ? freqSort : nameSort);
        for (const item of ungrouped) {
          rows.push({ kind: "package", pkg: item.pkg, packageIndex: item.index, indented: false, scopeKey: null });
        }
      };

      if (groupsOnTop) {
        emitScopeGroups();
        emitUngrouped();
      } else if (frequencySort) {
        // Interleave by frequency — groups positioned by their max-frequency member
        type Slot =
          | { kind: "group"; group: (typeof scopeGroups)[number]; freq: number; sortKey: string }
          | { kind: "single"; item: (typeof ungrouped)[number]; freq: number; sortKey: string };
        const slots: Slot[] = [];
        for (const g of scopeGroups) {
          g.items.sort(freqSort);
          slots.push({
            kind: "group",
            group: g,
            freq: Math.max(...g.items.map((i) => frequency[i.pkg.name] ?? 0)),
            sortKey: sortableName(g.scope),
          });
        }
        for (const item of ungrouped) {
          slots.push({
            kind: "single",
            item,
            freq: frequency[item.pkg.name] ?? 0,
            sortKey: sortableName(item.pkg.name),
          });
        }
        slots.sort((a, b) => {
          if (b.freq !== a.freq) return b.freq - a.freq;
          return a.sortKey.localeCompare(b.sortKey);
        });
        for (const slot of slots) {
          if (slot.kind === "group") {
            const scopeKey = `${type}::${slot.group.scope}`;
            rows.push({
              kind: "scope-header",
              groupType: type,
              scope: slot.group.scope,
              packageIndices: slot.group.items.map((si) => si.index),
              packages: slot.group.items.map((si) => si.pkg),
            });
            for (const si of slot.group.items) {
              rows.push({ kind: "package", pkg: si.pkg, packageIndex: si.index, indented: true, scopeKey });
            }
          } else {
            rows.push({
              kind: "package",
              pkg: slot.item.pkg,
              packageIndex: slot.item.index,
              indented: false,
              scopeKey: null,
            });
          }
        }
      } else {
        // Interleave alphabetically by sortable name (strip @ prefix so @vercel sorts among 'v')
        type Slot =
          | { kind: "group"; group: (typeof scopeGroups)[number]; sortKey: string }
          | { kind: "single"; item: (typeof ungrouped)[number]; sortKey: string };
        const slots: Slot[] = [];
        for (const g of scopeGroups) {
          g.items.sort(nameSort);
          slots.push({ kind: "group", group: g, sortKey: sortableName(g.scope) });
        }
        for (const item of ungrouped) {
          slots.push({ kind: "single", item, sortKey: sortableName(item.pkg.name) });
        }
        slots.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        for (const slot of slots) {
          if (slot.kind === "group") {
            const scopeKey = `${type}::${slot.group.scope}`;
            rows.push({
              kind: "scope-header",
              groupType: type,
              scope: slot.group.scope,
              packageIndices: slot.group.items.map((si) => si.index),
              packages: slot.group.items.map((si) => si.pkg),
            });
            for (const si of slot.group.items) {
              rows.push({ kind: "package", pkg: si.pkg, packageIndex: si.index, indented: true, scopeKey });
            }
          } else {
            rows.push({
              kind: "package",
              pkg: slot.item.pkg,
              packageIndex: slot.item.index,
              indented: false,
              scopeKey: null,
            });
          }
        }
      }
    } else {
      const sorted = frequencySort ? items.toSorted(freqSort) : items.toSorted(nameSort);
      for (const item of sorted) {
        rows.push({ kind: "package", pkg: item.pkg, packageIndex: item.index, indented: false, scopeKey: null });
      }
    }
  }
  return rows;
}

// ── Row filtering & grouping ─────────────────────────────────────────

export function filterCollapsed(rows: DisplayRow[], collapsed: Set<string>): DisplayRow[] {
  return rows.filter((row) => {
    if (row.kind === "package" && row.scopeKey && collapsed.has(row.scopeKey)) {
      return false;
    }
    return true;
  });
}

export function buildGroups(visibleRows: DisplayRow[]): PackageGroup[] {
  const groups: PackageGroup[] = [];
  let current: PackageGroup | null = null;

  visibleRows.forEach((row, i) => {
    if (row.kind === "header") {
      current = { type: row.groupType, label: row.label, allPackages: row.packages, items: [], headerVisibleIndex: i };
      groups.push(current);
    } else if (current) {
      current.items.push({ row, visibleIndex: i });
    }
  });
  return groups;
}

// ── UI helpers ───────────────────────────────────────────────────────

export function groupCheckbox(packages: OutdatedPackage[]): { symbol: string; color: string } {
  const selectedCount = packages.filter((p) => p.selected).length;
  if (selectedCount === 0) return { symbol: "□", color: "gray" };
  if (selectedCount === packages.length) return { symbol: "■", color: "greenBright" };
  return { symbol: "◧", color: "yellow" };
}

export function computeMaxPerGroup(terminalRows: number, groupCount: number): number {
  if (groupCount <= 0) return 3;
  // The list fills the terminal to `terminalRows - 2` (the App wraps it in <Box padding={1}>,
  // costing 2 lines). Items get whatever is left after the whole-list chrome (CHROME_LINES)
  // and each group's own chrome (GROUP_CHROME). Sizing to fill — rather than under-reserving —
  // both uses the available height and, because we never provision more than fits, keeps two
  // groups from overflowing the viewport and scrolling the header off the top.
  const itemBudget = terminalRows - 2 - CHROME_LINES - groupCount * GROUP_CHROME;
  return Math.max(1, Math.floor(itemBudget / groupCount));
}

// ── Display row types ────────────────────────────────────────────────

export type DisplayRow =
  | {
      kind: "header";
      groupType: OutdatedPackage["type"];
      label: string;
      packages: OutdatedPackage[];
      packageIndices: number[];
    }
  | {
      kind: "scope-header";
      groupType: OutdatedPackage["type"];
      scope: string;
      packageIndices: number[];
      packages: OutdatedPackage[];
    }
  | { kind: "package"; pkg: OutdatedPackage; packageIndex: number; indented: boolean; scopeKey: string | null };

export type GroupItem = {
  row: DisplayRow;
  visibleIndex: number;
};

export type PackageGroup = {
  type: OutdatedPackage["type"];
  label: string;
  allPackages: OutdatedPackage[];
  items: GroupItem[];
  headerVisibleIndex: number;
};

// ── Constants ────────────────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  dependencies: "cyan",
  devDependencies: "magenta",
  global: "yellow",
};

export const GROUP_LABELS: Record<string, string> = {
  dependencies: "Dependencies",
  devDependencies: "Dev Dependencies",
  global: "Global Packages",
};

export const GROUP_ORDER: OutdatedPackage["type"][] = ["dependencies", "devDependencies", "global"];

/**
 * Whole-list chrome: ripen line (1) + marginTop (1) + controls (2, the hints line wraps on
 * narrower terminals) + marginBottom (1) + footer (1). Reserving 2 for the controls is safe on
 * wide terminals where it fits one line — the extra row is absorbed by the list's minHeight.
 */
export const CHROME_LINES = 6;
/** Per-group chrome: group header (1) + top/bottom border (2) + column header (1) + single scroll indicator (1) */
export const GROUP_CHROME = 5;
