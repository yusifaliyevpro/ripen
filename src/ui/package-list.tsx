import { Box, Text, useInput, useWindowSize } from "ink";
import { useMemo, useState } from "react";
import {
  buildDisplayRows,
  filterCollapsed,
  buildGroups,
  groupCheckbox,
  computeMaxPerGroup,
  type PackageGroup,
  TYPE_COLORS,
} from "../lib/build-rows";
import { formatAge } from "../lib/utils";
import { parseVersion } from "../lib/versions";
import type { OutdatedPackage } from "../types";

type Props = {
  packages: OutdatedPackage[];
  onToggle: (index: number) => void;
  onToggleMany: (indices: number[]) => void;
  onSelectVersion: (index: number) => void;
  onViewChangelog: (index: number) => void;
  onConfirm: () => void;
  onOpenSettings?: () => void;
  groupByScope?: boolean;
  groupScopes: string[];
  groupsOnTop?: boolean;
  frequencySort?: boolean;
  frequency?: Record<string, number>;
  separateDevDeps?: boolean;
  showAll?: boolean;
  isActive?: boolean;
};

export function PackageList({
  packages,
  onToggle,
  onToggleMany,
  onSelectVersion,
  onViewChangelog,
  onConfirm,
  onOpenSettings,
  groupByScope = false,
  groupScopes,
  groupsOnTop = false,
  frequencySort = false,
  frequency = {},
  separateDevDeps = true,
  showAll = false,
  isActive = true,
}: Props) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const allRows = useMemo(
    () => buildDisplayRows(packages, groupByScope, groupScopes, groupsOnTop, frequencySort, frequency, separateDevDeps),
    [packages, groupByScope, groupScopes, groupsOnTop, frequencySort, frequency, separateDevDeps],
  );

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

  // Seed collapsed scopes during render (React's "adjusting state" pattern) — no first-frame effect.
  if (!initialized && allScopeKeys.size > 0) {
    setCollapsedScopes(new Set(allScopeKeys));
    setInitialized(true);
  }

  // Use allScopeKeys on first render to avoid a flash of expanded scopes
  const effectiveCollapsed = !initialized && allScopeKeys.size > 0 ? allScopeKeys : collapsedScopes;

  const visibleRows = useMemo(() => filterCollapsed(allRows, effectiveCollapsed), [allRows, effectiveCollapsed]);

  const groups = useMemo(() => buildGroups(visibleRows), [visibleRows]);

  const { rows: terminalRows } = useWindowSize();
  const maxVisible = useMemo(() => computeMaxPerGroup(terminalRows, groups.length), [terminalRows, groups.length]);

  // Per-group scroll offsets, adjusted during render so the window shifts only when the focused row scrolls out of view.
  const [scrollOffsets, setScrollOffsets] = useState<Record<string, number>>({});

  const offsets: Record<string, number> = { ...scrollOffsets };
  let offsetsChanged = false;
  for (const group of groups) {
    const localIndex = group.items.findIndex((item) => item.visibleIndex === focusedIndex);
    if (localIndex === -1) continue;
    const prev = offsets[group.type] ?? 0;
    let next = prev;
    if (localIndex < prev) next = localIndex;
    else if (localIndex >= prev + maxVisible) next = localIndex - maxVisible + 1;
    if (next !== prev) {
      offsets[group.type] = next;
      offsetsChanged = true;
    }
  }
  if (offsetsChanged) setScrollOffsets(offsets);

  // Clamp focusedIndex during render when visibleRows shrinks (e.g. after collapse).
  if (focusedIndex >= visibleRows.length) {
    setFocusedIndex(Math.max(0, visibleRows.length - 1));
  }

  const toggleCollapse = (scopeKey: string) => {
    // On first interaction, seed from effectiveCollapsed so the toggle is correct
    if (!initialized && allScopeKeys.size > 0) {
      setCollapsedScopes(() => {
        const next = new Set(allScopeKeys);
        if (next.has(scopeKey)) next.delete(scopeKey);
        else next.add(scopeKey);
        return next;
      });
      setInitialized(true);
      return;
    }
    setCollapsedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scopeKey)) next.delete(scopeKey);
      else next.add(scopeKey);
      return next;
    });
  };

  useInput(
    (input, key) => {
      if (key.upArrow) setFocusedIndex(Math.max(0, focusedIndex - 1));
      if (key.downArrow) setFocusedIndex(Math.min(visibleRows.length - 1, focusedIndex + 1));
      if (key.pageUp) setFocusedIndex(Math.max(0, focusedIndex - maxVisible));
      if (key.pageDown) setFocusedIndex(Math.min(visibleRows.length - 1, focusedIndex + maxVisible));

      // Tab: cycle between main group headers only
      if (key.tab) {
        const headerIndices = groups.map((g) => g.headerVisibleIndex);
        const currentGroupIdx = headerIndices.findIndex((h, i) => {
          const nextHeader = headerIndices[i + 1] ?? visibleRows.length;
          return focusedIndex >= h && focusedIndex < nextHeader;
        });
        const nextIdx = (currentGroupIdx + 1) % headerIndices.length;
        setFocusedIndex(headerIndices[nextIdx]);
        return;
      }

      const focused = visibleRows[focusedIndex];
      if (!focused) return;

      // Left/Right: collapse/expand scope sub-groups
      if (focused.kind === "scope-header") {
        const scopeKey = `${focused.groupType}::${focused.scope}`;
        if (key.leftArrow && !effectiveCollapsed.has(scopeKey)) {
          toggleCollapse(scopeKey);
          return;
        }
        if (key.rightArrow && effectiveCollapsed.has(scopeKey)) {
          toggleCollapse(scopeKey);
          return;
        }
      }

      if (input === " ") {
        if (focused.kind === "header") onToggleMany(focused.packageIndices);
        else if (focused.kind === "scope-header") onToggleMany(focused.packageIndices);
        else onToggle(focused.packageIndex);
      }
      if (input === "v" && !key.ctrl && focused.kind === "package") onSelectVersion(focused.packageIndex);
      if (input === "c" && !key.ctrl && focused.kind === "package") onViewChangelog(focused.packageIndex);
      if (input === "s" && !key.ctrl) onOpenSettings?.();
      if (key.return) onConfirm();
    },
    { isActive },
  );

  const selectedCount = packages.filter((p) => p.selected).length;
  const outdatedCount = packages.filter((p) => p.current !== p.latest).length;

  // Fill the terminal to a stable height so header/footer stay pinned as the count changes.
  // `terminalRows - 2` accounts for the App's padding of 2 (matches the picker/changelog budget).
  const minHeight = Math.max(1, terminalRows - 2);

  return (
    <Box flexDirection="column" minHeight={minHeight}>
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">- interactive dependency updater</Text>
        </Text>
        <Box marginTop={1}>
          <Text color="gray">
            <Text color="white">↑↓/PgDn/PgUp</Text> navigate{"  "}
            <Text color="white">space</Text> select{"  "}
            <Text color="white">tab</Text> groups{"  "}
            <Text color="white">←→</Text> collapse{"  "}
            <Text color="white">v</Text> version{"  "}
            <Text color="white">c</Text> changelog{"  "}
            <Text color="white">s</Text> settings{"  "}
            <Text color="white">enter</Text> copy & exit
          </Text>
        </Box>
      </Box>

      {/* Grouped packages */}
      {groups.map((group) => (
        <PackageGroupBox
          key={group.type}
          group={group}
          focusedIndex={focusedIndex}
          collapsedScopes={collapsedScopes}
          scrollOffset={offsets[group.type] ?? 0}
          maxVisible={maxVisible}
        />
      ))}

      {/* Spacer — absorbs the slack so the footer sits at the bottom of the fixed height */}
      <Box flexGrow={1} />

      {/* Footer */}
      <Box flexDirection="column">
        <Box gap={2}>
          <Text>
            <Text color="greenBright" bold>
              {selectedCount}
            </Text>
            <Text color="gray"> selected</Text>
            {"  "}
            {showAll ? (
              <Text color="gray">
                {packages.length} packages{"  "}
                <Text color={outdatedCount > 0 ? "yellow" : "green"}>{outdatedCount} outdated</Text>
              </Text>
            ) : (
              <Text color="gray">{packages.length} outdated</Text>
            )}
          </Text>
          {selectedCount > 0 && <Text color="greenBright"> Press enter to copy command →</Text>}
        </Box>
      </Box>
    </Box>
  );
}

// ── Group rendering ──────────────────────────────────────────────────

type PackageGroupBoxProps = {
  group: PackageGroup;
  focusedIndex: number;
  collapsedScopes: Set<string>;
  scrollOffset: number;
  maxVisible: number;
};

function PackageGroupBox({ group, focusedIndex, collapsedScopes, scrollOffset, maxVisible }: PackageGroupBoxProps) {
  const check = groupCheckbox(group.allPackages);
  const headerFocused = focusedIndex === group.headerVisibleIndex;
  const typeColor = TYPE_COLORS[group.type] ?? "white";
  const visibleItems = group.items.slice(scrollOffset, scrollOffset + maxVisible);
  const totalItems = group.items.length;
  const needsScroll = totalItems > maxVisible;
  const focusedLocalIndex = group.items.findIndex((item) => item.visibleIndex === focusedIndex);

  return (
    <Box key={group.type} flexDirection="column">
      {/* Group header */}
      <Box gap={1}>
        <Text color="greenBright">{headerFocused ? "❯" : " "}</Text>
        <Text color={check.color}>{check.symbol}</Text>
        <Text bold={headerFocused} color={typeColor}>
          {group.label}
        </Text>
        <Text color="gray">({group.allPackages.length})</Text>
        {needsScroll && focusedLocalIndex >= 0 && (
          <Text color="gray">
            {focusedLocalIndex + 1}/{totalItems}
          </Text>
        )}
      </Box>

      {/* Items in bordered box */}
      <Box flexDirection="column" borderStyle="round" borderColor={headerFocused ? typeColor : "gray"} paddingX={1}>
        {/* Column headers */}
        <Box gap={2} marginBottom={0}>
          <Text color="gray">{"  "}</Text>
          <Box width={28}>
            <Text color="gray">package</Text>
          </Box>
          <Box width={14}>
            <Text color="gray">current</Text>
          </Box>
          <Box width={14}>
            <Text color="gray">target</Text>
          </Box>
          <Box width={14}>
            <Text color="gray">latest</Text>
          </Box>
          <Box width={5}>
            <Text color="gray">age</Text>
          </Box>
        </Box>

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
          const isUpToDate = pkg.current === pkg.latest;
          const isMajorBump = !isUpToDate && (parseVersion(pkg.latest)[0] ?? 0) > (parseVersion(pkg.current)[0] ?? 0);

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
              <Box width={14}>
                <Text color={isUpToDate ? "green" : "red"}>{pkg.current}</Text>
              </Box>
              <Box width={14}>
                <Text color="greenBright">{pkg.targetVersion ?? pkg.latest}</Text>
              </Box>
              <Box width={14}>
                <Text color="gray">{pkg.latest}</Text>
              </Box>
              <Box width={5}>
                {(() => {
                  // Age reflects the version being installed (target), not always the latest.
                  const agePublishedAt = pkg.targetPublishedAt ?? pkg.latestPublishedAt;
                  return agePublishedAt ? (
                    <Text color={Date.now() - new Date(agePublishedAt).getTime() < 86_400_000 ? "yellow" : "gray"}>
                      {formatAge(agePublishedAt)}
                    </Text>
                  ) : (
                    <Text color="gray"> </Text>
                  );
                })()}
              </Box>
              <Box width={9}>{isMajorBump ? <Text color="yellow">⚠ major</Text> : <Text> </Text>}</Box>
            </Box>
          );
        })}

        {/* Scroll indicator — a single line (always present while scrolling, so the box
            height stays stable) showing how many rows are hidden above and/or below. */}
        {needsScroll && (
          <Text color="gray">
            {"  "}
            {scrollOffset > 0 ? `↑ ${scrollOffset} above` : ""}
            {scrollOffset > 0 && scrollOffset + maxVisible < totalItems ? "   " : ""}
            {scrollOffset + maxVisible < totalItems ? `↓ ${totalItems - scrollOffset - maxVisible} below` : ""}
          </Text>
        )}
      </Box>
    </Box>
  );
}
