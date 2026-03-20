import { useMemo, useEffect, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import type { OutdatedPackage } from "../fetcher";

interface Props {
  packages: OutdatedPackage[];
  onToggle: (index: number) => void;
  onToggleGroup: (groupType: OutdatedPackage["type"]) => void;
  onToggleMany: (indices: number[]) => void;
  onSelectVersion: (index: number) => void;
  onViewChangelog: (index: number) => void;
  onConfirm: () => void;
  onOpenSettings?: () => void;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  groupByScope: boolean;
  isActive?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  dependencies: "cyan",
  devDependencies: "magenta",
  global: "yellow",
};

const GROUP_LABELS: Record<string, string> = {
  dependencies: "Dependencies",
  devDependencies: "Dev Dependencies",
  global: "Global Packages",
};

const GROUP_ORDER = ["dependencies", "devDependencies", "global"];

// Header (1) + controls (1) + margin (1) + footer (1) + group headers/borders overhead
const CHROME_LINES = 8;
// Column header inside each bordered box + scroll indicator lines
const GROUP_CHROME = 5; // border top + column header + scroll-up + scroll-down + border bottom

type DisplayRow =
  | { kind: "header"; groupType: OutdatedPackage["type"]; label: string; packages: OutdatedPackage[] }
  | {
      kind: "scope-header";
      groupType: OutdatedPackage["type"];
      scope: string;
      packageIndices: number[];
      packages: OutdatedPackage[];
    }
  | { kind: "package"; pkg: OutdatedPackage; packageIndex: number; indented: boolean; scopeKey: string | null };

interface GroupItem {
  row: DisplayRow;
  visibleIndex: number;
}

interface PackageGroup {
  type: OutdatedPackage["type"];
  label: string;
  allPackages: OutdatedPackage[];
  items: GroupItem[];
  headerVisibleIndex: number;
}

function getScope(name: string): string | null {
  const match = name.match(/^(@[^/]+)\//);
  return match?.[1] ?? null;
}

function buildDisplayRows(packages: OutdatedPackage[], groupByScope: boolean): DisplayRow[] {
  const grouped = new Map<string, { pkg: OutdatedPackage; index: number }[]>();

  packages.forEach((pkg, i) => {
    if (!grouped.has(pkg.type)) grouped.set(pkg.type, []);
    grouped.get(pkg.type)!.push({ pkg, index: i });
  });

  const rows: DisplayRow[] = [];
  for (const type of GROUP_ORDER) {
    const items = grouped.get(type);
    if (!items || items.length === 0) continue;
    const allPkgs = items.map((i) => i.pkg);
    rows.push({
      kind: "header",
      groupType: type as OutdatedPackage["type"],
      label: GROUP_LABELS[type] ?? type,
      packages: allPkgs,
    });

    if (groupByScope) {
      // Group by scope prefix
      const scopeMap = new Map<string, { pkg: OutdatedPackage; index: number }[]>();
      const unscoped: { pkg: OutdatedPackage; index: number }[] = [];

      for (const item of items) {
        const scope = getScope(item.pkg.name);
        if (scope) {
          if (!scopeMap.has(scope)) scopeMap.set(scope, []);
          scopeMap.get(scope)!.push(item);
        } else {
          unscoped.push(item);
        }
      }

      // Emit in order: iterate original items, emit scope headers when first seen
      const emittedScopes = new Set<string>();
      for (const item of items) {
        const scope = getScope(item.pkg.name);
        if (scope && scopeMap.get(scope)!.length >= 2) {
          // Scoped with 2+ packages — emit scope header first time
          if (!emittedScopes.has(scope)) {
            emittedScopes.add(scope);
            const scopeItems = scopeMap.get(scope)!;
            const scopeKey = `${type}::${scope}`;
            rows.push({
              kind: "scope-header",
              groupType: type as OutdatedPackage["type"],
              scope,
              packageIndices: scopeItems.map((si) => si.index),
              packages: scopeItems.map((si) => si.pkg),
            });
            for (const si of scopeItems) {
              rows.push({ kind: "package", pkg: si.pkg, packageIndex: si.index, indented: true, scopeKey });
            }
          }
          // Skip — already emitted with the scope group
        } else {
          // Unscoped or single-scoped
          rows.push({ kind: "package", pkg: item.pkg, packageIndex: item.index, indented: false, scopeKey: null });
        }
      }
    } else {
      for (const item of items) {
        rows.push({ kind: "package", pkg: item.pkg, packageIndex: item.index, indented: false, scopeKey: null });
      }
    }
  }
  return rows;
}

function filterCollapsed(rows: DisplayRow[], collapsed: Set<string>): DisplayRow[] {
  return rows.filter((row) => {
    if (row.kind === "package" && row.scopeKey && collapsed.has(row.scopeKey)) {
      return false;
    }
    return true;
  });
}

function buildGroups(visibleRows: DisplayRow[]): PackageGroup[] {
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

function groupCheckbox(packages: OutdatedPackage[]): { symbol: string; color: string } {
  const selectedCount = packages.filter((p) => p.selected).length;
  if (selectedCount === 0) return { symbol: "□", color: "gray" };
  if (selectedCount === packages.length) return { symbol: "■", color: "greenBright" };
  return { symbol: "◧", color: "yellow" };
}

function computeMaxPerGroup(terminalRows: number, groupCount: number): number {
  const available = terminalRows - CHROME_LINES - groupCount * (GROUP_CHROME + 1); // +1 for group header line
  const perGroup = Math.floor(available / groupCount);
  return Math.max(3, perGroup);
}

export function PackageList({
  packages,
  onToggle,
  onToggleGroup,
  onToggleMany,
  onSelectVersion,
  onViewChangelog,
  onConfirm,
  onOpenSettings,
  focusedIndex,
  onFocusChange,
  groupByScope,
  isActive = true,
}: Props) {
  const allRows = useMemo(() => buildDisplayRows(packages, groupByScope), [packages, groupByScope]);

  // Collect all scope keys from allRows
  const allScopeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of allRows) {
      if (row.kind === "scope-header") {
        keys.add(`${row.groupType}::${row.scope}`);
      }
    }
    return keys;
  }, [allRows]);

  // Start with all scopes collapsed
  const [collapsedScopes, setCollapsedScopes] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && allScopeKeys.size > 0) {
      setCollapsedScopes(new Set(allScopeKeys));
      setInitialized(true);
    }
  }, [allScopeKeys, initialized]);

  const visibleRows = useMemo(() => filterCollapsed(allRows, collapsedScopes), [allRows, collapsedScopes]);

  const groups = useMemo(() => buildGroups(visibleRows), [visibleRows]);

  const { stdout } = useStdout();
  const terminalRows = stdout?.rows ?? 24;
  const maxVisible = useMemo(() => computeMaxPerGroup(terminalRows, groups.length), [terminalRows, groups.length]);

  // Per-group scroll offsets
  const [scrollOffsets, setScrollOffsets] = useState<Record<string, number>>({});

  // Auto-scroll to keep focused item visible within its group
  useEffect(() => {
    for (const group of groups) {
      const localIndex = group.items.findIndex((item) => item.visibleIndex === focusedIndex);
      if (localIndex === -1) continue;

      setScrollOffsets((prev) => {
        const offset = prev[group.type] ?? 0;
        let next = offset;
        if (localIndex < offset) next = localIndex;
        else if (localIndex >= offset + maxVisible) next = localIndex - maxVisible + 1;
        if (next === offset) return prev;
        return { ...prev, [group.type]: next };
      });
    }
  }, [focusedIndex, groups, maxVisible]);

  // Clamp focusedIndex when visibleRows shrinks (e.g., after collapse)
  useEffect(() => {
    if (focusedIndex >= visibleRows.length) {
      onFocusChange(Math.max(0, visibleRows.length - 1));
    }
  }, [visibleRows.length, focusedIndex, onFocusChange]);

  const toggleCollapse = (scopeKey: string) => {
    setCollapsedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scopeKey)) next.delete(scopeKey);
      else next.add(scopeKey);
      return next;
    });
  };

  useInput(
    (input, key) => {
      if (key.upArrow) onFocusChange(Math.max(0, focusedIndex - 1));
      if (key.downArrow) onFocusChange(Math.min(visibleRows.length - 1, focusedIndex + 1));

      // Tab: cycle between main group headers only
      if (key.tab) {
        const headerIndices = groups.map((g) => g.headerVisibleIndex);
        const currentGroupIdx = headerIndices.findIndex((h, i) => {
          const nextHeader = headerIndices[i + 1] ?? visibleRows.length;
          return focusedIndex >= h && focusedIndex < nextHeader;
        });
        const nextIdx = (currentGroupIdx + 1) % headerIndices.length;
        onFocusChange(headerIndices[nextIdx]!);
        return;
      }

      const focused = visibleRows[focusedIndex];
      if (!focused) return;

      // Left/Right: collapse/expand scope sub-groups
      if (focused.kind === "scope-header") {
        const scopeKey = `${focused.groupType}::${focused.scope}`;
        if (key.leftArrow && !collapsedScopes.has(scopeKey)) {
          toggleCollapse(scopeKey);
          return;
        }
        if (key.rightArrow && collapsedScopes.has(scopeKey)) {
          toggleCollapse(scopeKey);
          return;
        }
      }

      if (input === " ") {
        if (focused.kind === "header") onToggleGroup(focused.groupType);
        else if (focused.kind === "scope-header") onToggleMany(focused.packageIndices);
        else onToggle(focused.packageIndex);
      }
      if (input === "v" && focused.kind === "package") onSelectVersion(focused.packageIndex);
      if (input === "c" && focused.kind === "package") onViewChangelog(focused.packageIndex);
      if (input === "s") onOpenSettings?.();
      if (key.return) onConfirm();
    },
    { isActive },
  );

  const selectedCount = packages.filter((p) => p.selected).length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">-- interactive dependency updater</Text>
        </Text>
        <Box marginTop={1}>
          <Text color="gray">
            <Text color="white">↑↓</Text> navigate{"  "}
            <Text color="white">space</Text> select{"  "}
            <Text color="white">tab</Text> groups{"  "}
            <Text color="white">←→</Text> collapse{"  "}
            <Text color="white">v</Text> version{"  "}
            <Text color="white">c</Text> changelog{"  "}
            <Text color="white">s</Text> settings{"  "}
            <Text color="white">enter</Text> update
          </Text>
        </Box>
      </Box>

      {/* Grouped packages */}
      {groups.map((group) => {
        const check = groupCheckbox(group.allPackages);
        const headerFocused = focusedIndex === group.headerVisibleIndex;
        const typeColor = TYPE_COLORS[group.type] ?? "white";
        const offset = scrollOffsets[group.type] ?? 0;
        const visibleItems = group.items.slice(offset, offset + maxVisible);
        const totalItems = group.items.length;
        const needsScroll = totalItems > maxVisible;
        const focusedLocalIndex = group.items.findIndex((item) => item.visibleIndex === focusedIndex);

        return (
          <Box key={group.type} flexDirection="column" marginBottom={1}>
            {/* Group header */}
            <Box gap={1}>
              <Text color="greenBright">{headerFocused ? "❯" : " "}</Text>
              <Text color={check.color}>{check.symbol}</Text>
              <Text bold={headerFocused} color={typeColor}>
                {group.label}
              </Text>
              <Text dimColor color="gray">
                ({group.allPackages.length})
              </Text>
              {needsScroll && focusedLocalIndex >= 0 && (
                <Text dimColor color="gray">
                  {focusedLocalIndex + 1}/{totalItems}
                </Text>
              )}
            </Box>

            {/* Items in bordered box */}
            <Box
              flexDirection="column"
              borderStyle="round"
              borderColor={headerFocused ? typeColor : "gray"}
              paddingX={1}
            >
              {/* Column headers */}
              <Box gap={2} marginBottom={0}>
                <Text dimColor color="gray">
                  {"  "}
                </Text>
                <Box width={28}>
                  <Text dimColor color="gray">
                    package
                  </Text>
                </Box>
                <Box width={10}>
                  <Text dimColor color="gray">
                    current
                  </Text>
                </Box>
                <Box width={10}>
                  <Text dimColor color="gray">
                    target
                  </Text>
                </Box>
                <Box width={10}>
                  <Text dimColor color="gray">
                    latest
                  </Text>
                </Box>
              </Box>

              {/* Scroll indicator top */}
              {needsScroll && (
                <Text dimColor color="gray">
                  {offset > 0 ? `  ↑ ${offset} more above` : " "}
                </Text>
              )}

              {/* Visible rows */}
              {visibleItems.map((item) => {
                const { row } = item;
                const isFocused = item.visibleIndex === focusedIndex;

                if (row.kind === "scope-header") {
                  const scopeKey = `${row.groupType}::${row.scope}`;
                  const isCollapsed = collapsedScopes.has(scopeKey);
                  const scopeCheck = groupCheckbox(row.packages);

                  return (
                    <Box key={scopeKey} gap={2}>
                      <Text color="greenBright">{isFocused ? "❯" : " "}</Text>
                      <Text color="gray">{isCollapsed ? "▶" : "▼"}</Text>
                      <Text color={scopeCheck.color}>{scopeCheck.symbol}</Text>
                      <Text bold={isFocused} color={isFocused ? "whiteBright" : "white"}>
                        {row.scope} ({row.packages.length})
                      </Text>
                    </Box>
                  );
                }

                // Package row (header rows are never in group.items, so this is safe)
                if (row.kind !== "package") return null;
                const pkg = row.pkg;
                const isMajorBump = parseInt(pkg.latest) > parseInt(pkg.current);

                return (
                  <Box key={pkg.name} gap={2}>
                    <Text color="greenBright">{isFocused ? "❯" : " "}</Text>
                    {row.indented && <Text> </Text>}
                    <Text color={pkg.selected ? "greenBright" : "gray"}>{pkg.selected ? "◉" : "○"}</Text>
                    <Box width={row.indented ? 24 : 26}>
                      <Text bold={isFocused} color={isFocused ? "whiteBright" : "white"}>
                        {(() => {
                          const maxLen = row.indented ? 24 : 26;
                          return pkg.name.length > maxLen ? pkg.name.slice(0, maxLen - 2) + "\u2026" : pkg.name;
                        })()}
                      </Text>
                    </Box>
                    <Box width={10}>
                      <Text color="red" dimColor>
                        {pkg.current}
                      </Text>
                    </Box>
                    <Box width={10}>
                      <Text color="greenBright">{pkg.targetVersion ?? pkg.latest}</Text>
                    </Box>
                    <Box width={10}>
                      <Text color="gray">{pkg.latest}</Text>
                    </Box>
                    <Box width={9}>{isMajorBump ? <Text color="yellow">⚠ major</Text> : <Text> </Text>}</Box>
                  </Box>
                );
              })}

              {/* Scroll indicator bottom */}
              {needsScroll && (
                <Text dimColor color="gray">
                  {offset + maxVisible < totalItems ? `  ↓ ${totalItems - offset - maxVisible} more below` : " "}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}

      {/* Footer */}
      <Box flexDirection="column">
        <Box gap={2}>
          <Text>
            <Text color="greenBright" bold>
              {selectedCount}
            </Text>
            <Text color="gray"> selected</Text>
            {"  "}
            <Text color="gray">{packages.length} outdated</Text>
          </Text>
          {selectedCount > 0 && <Text color="greenBright"> Press enter to update →</Text>}
        </Box>
      </Box>
    </Box>
  );
}
