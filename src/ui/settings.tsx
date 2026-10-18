import { Box, Text, useBoxMetrics, useInput, useWindowSize, type DOMElement } from "ink";
import { useRef, useState } from "react";
import { GLOBAL_MANAGERS } from "../fetcher";
import type { RipenConfig } from "../types";
import { SettingsToggle } from "./settings-toggle";

type Props = {
  config: RipenConfig;
  onConfigChange: (config: RipenConfig) => void;
  onClose: () => void;
};

export function Settings({ config, onConfigChange, onClose }: Props) {
  const [inputMode, setInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [managerCursor, setManagerCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const scopes = config.groupScopes;

  // Flat list of focusable rows: the toggles, the global managers row, the list-header, then one row per scope.
  const rows: {
    type:
      | "toggle-frequency"
      | "toggle-group"
      | "toggle-groups-top"
      | "toggle-separate-dev"
      | "toggle-sfw"
      | "global-managers"
      | "list-header"
      | "list-item";
    listItemIndex?: number;
  }[] = [
    { type: "toggle-frequency" },
    { type: "toggle-separate-dev" },
    { type: "toggle-group" },
    { type: "toggle-groups-top" },
    { type: "toggle-sfw" },
    { type: "global-managers" },
    { type: "list-header" },
    ...scopes.map((_, i) => ({ type: "list-item" as const, listItemIndex: i })),
  ];

  const [flatCursor, setFlatCursor] = useState(0);
  const currentRow = rows[flatCursor];

  const addScope = (value: string) => {
    const scope = value.startsWith("@") ? value : `@${value}`;
    if (scopes.includes(scope)) return;
    onConfigChange({
      ...config,
      groupScopes: [...scopes, scope],
    });
  };

  const excluded = config.excludedGlobalManagers;
  const toggleManager = (manager: (typeof GLOBAL_MANAGERS)[number]) => {
    if (excluded.includes(manager)) {
      onConfigChange({ ...config, excludedGlobalManagers: excluded.filter((m) => m !== manager) });
      return;
    }
    // Excluding every manager would make `ripen -g` report "all up to date" without checking anything.
    if (GLOBAL_MANAGERS.every((m) => m === manager || excluded.includes(m))) return;
    onConfigChange({ ...config, excludedGlobalManagers: [...excluded, manager] });
  };

  const removeScope = (scope: string) => {
    onConfigChange({
      ...config,
      groupScopes: scopes.filter((s) => s !== scope),
    });
  };

  useInput((input, key) => {
    if (inputMode) {
      if (key.escape) {
        setInputMode(false);
        setInputValue("");
        return;
      }
      if (key.return) {
        const value = inputValue.trim();
        if (value) addScope(value);
        setInputMode(false);
        setInputValue("");
        return;
      }
      if (key.backspace || key.delete) {
        setInputValue((v) => v.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setInputValue((v) => v + input);
      }
      return;
    }

    if (key.upArrow) setFlatCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setFlatCursor((c) => Math.min(rows.length - 1, c + 1));
    if (currentRow?.type === "global-managers") {
      if (key.leftArrow) setManagerCursor((c) => Math.max(0, c - 1));
      if (key.rightArrow) setManagerCursor((c) => Math.min(GLOBAL_MANAGERS.length - 1, c + 1));
    }

    if (input === " " || key.return) {
      if (currentRow?.type === "toggle-frequency") {
        onConfigChange({ ...config, frequencySort: !config.frequencySort });
      } else if (currentRow?.type === "toggle-group") {
        onConfigChange({ ...config, groupByScope: !config.groupByScope });
      } else if (currentRow?.type === "toggle-separate-dev") {
        onConfigChange({ ...config, separateDevDeps: !config.separateDevDeps });
      } else if (currentRow?.type === "toggle-groups-top") {
        onConfigChange({ ...config, groupsOnTop: !config.groupsOnTop });
      } else if (currentRow?.type === "toggle-sfw") {
        onConfigChange({ ...config, sfwFirewall: !config.sfwFirewall });
      } else if (currentRow?.type === "global-managers") {
        toggleManager(GLOBAL_MANAGERS[managerCursor]);
      } else if (currentRow?.type === "list-header") {
        setInputMode(true);
        setInputValue("");
      }
    }

    // 'a' to add new scope when on the list header
    if (input === "a" && !key.ctrl && currentRow?.type === "list-header") {
      setInputMode(true);
      setInputValue("");
    }

    // Delete/backspace to remove item when on a list item
    if (
      (key.backspace || key.delete || (input === "d" && !key.ctrl)) &&
      currentRow?.type === "list-item" &&
      currentRow.listItemIndex !== undefined
    ) {
      const scope = scopes[currentRow.listItemIndex];
      removeScope(scope);
      if (flatCursor >= rows.length - 1) {
        setFlatCursor(Math.max(0, flatCursor - 1));
      }
    }

    if (key.escape || input === "s") {
      onClose();
    }
  });

  const listHeaderFocused = currentRow?.type === "list-header";
  const managersFocused = currentRow?.type === "global-managers";

  // Fixed height like the other views: header and footer stay put, the body scrolls to keep the focused row visible.
  const { rows: terminalRows } = useWindowSize();
  const height = Math.max(1, terminalRows - 2);
  // Header (title + margin) and footer (margin + hints) take two lines each.
  const bodyHeight = Math.max(3, height - 4);

  const contentRef = useRef<DOMElement>(null);
  const focusRef = useRef<DOMElement>(null);
  const content = useBoxMetrics(contentRef);
  const focus = useBoxMetrics(focusRef);
  const refIf = (focused: boolean) => (focused ? focusRef : undefined);

  // Derived during render; metrics land a layout pass after the cursor moves.
  let nextScrollTop = scrollTop;
  if (focus.hasMeasured) {
    if (focus.top + focus.height > nextScrollTop + bodyHeight) nextScrollTop = focus.top + focus.height - bodyHeight;
    if (focus.top < nextScrollTop) nextScrollTop = focus.top;
  }
  if (content.hasMeasured) nextScrollTop = Math.min(nextScrollTop, Math.max(0, content.height - bodyHeight));
  nextScrollTop = Math.max(0, nextScrollTop);
  if (nextScrollTop !== scrollTop) setScrollTop(nextScrollTop);

  const toggles = [
    {
      type: "toggle-frequency",
      label: "Sort by update frequency",
      description: "Packages you update often appear at the top",
      checked: config.frequencySort,
    },
    {
      type: "toggle-separate-dev",
      label: "Separate dev dependencies",
      description: "Show dependencies and devDependencies in separate groups",
      checked: config.separateDevDeps,
    },
    {
      type: "toggle-group",
      label: "Enable scope grouping",
      description: "Group scoped packages listed below under their scope prefix",
      checked: config.groupByScope,
    },
    {
      type: "toggle-groups-top",
      label: "Show grouped scopes on top",
      description: "Grouped scope packages appear before ungrouped ones",
      checked: config.groupsOnTop,
      disabled: !config.groupByScope,
    },
    {
      type: "toggle-sfw",
      label: "SFW firewall",
      description: 'Prepend "sfw" before every generated install command',
      checked: config.sfwFirewall,
    },
  ] as const;

  return (
    <Box flexDirection="column" height={height}>
      <Box marginBottom={1} flexDirection="column" flexShrink={0}>
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">-- settings</Text>
        </Text>
      </Box>

      <Box height={bodyHeight} flexDirection="column" overflow="hidden" contentOffsetY={nextScrollTop}>
        {/* Every focusable row is a direct child so its measured top is relative to this box. */}
        <Box ref={contentRef} flexDirection="column" flexShrink={0} paddingBottom={1}>
          {toggles.map((t) => (
            <Box key={t.type} ref={refIf(currentRow?.type === t.type)}>
              <SettingsToggle
                label={t.label}
                description={t.description}
                checked={t.checked}
                focused={currentRow?.type === t.type}
                disabled={"disabled" in t ? t.disabled : false}
              />
            </Box>
          ))}

          {/* Global package managers: one row, ←→ picks a manager */}
          <Box ref={refIf(managersFocused)} flexDirection="column">
            <Box gap={1}>
              <Text color="greenBright">{managersFocused ? ">" : " "}</Text>
              <Text bold={managersFocused} color={managersFocused ? "whiteBright" : "white"}>
                Global scan
              </Text>
              {GLOBAL_MANAGERS.map((manager, i) => {
                const scanned = !excluded.includes(manager);
                const picked = managersFocused && i === managerCursor;
                return (
                  <Text key={manager} inverse={picked} color={scanned ? "greenBright" : "gray"}>
                    [{scanned ? "x" : " "}] {manager}
                  </Text>
                );
              })}
            </Box>
            <Box marginLeft={4}>
              <Text color="gray">
                Package managers checked by ripen -g{managersFocused ? " (←→ pick, space toggle)" : ""}
              </Text>
            </Box>
          </Box>

          {/* List: groupScopes */}
          <Box ref={refIf(listHeaderFocused && !inputMode)} flexDirection="column">
            <Box gap={1}>
              <Text dimColor={!config.groupByScope} color="greenBright">
                {listHeaderFocused ? ">" : " "}
              </Text>
              <Text
                dimColor={!config.groupByScope}
                bold={listHeaderFocused}
                color={!config.groupByScope ? "gray" : listHeaderFocused ? "whiteBright" : "white"}
              >
                Grouped scopes
              </Text>
            </Box>
            <Box marginLeft={4}>
              <Text dimColor={!config.groupByScope} color="gray">
                Scoped packages (@scope/*) listed here will be sub-grouped together
              </Text>
            </Box>
          </Box>

          {/* Scope items */}
          {scopes.map((scope, i) => {
            const itemFocused = currentRow?.type === "list-item" && currentRow.listItemIndex === i;
            return (
              <Box key={scope} ref={refIf(itemFocused)} marginLeft={4} gap={1}>
                <Text dimColor={!config.groupByScope} color="greenBright">
                  {itemFocused ? ">" : " "}
                </Text>
                <Text
                  dimColor={!config.groupByScope}
                  color={!config.groupByScope ? "gray" : itemFocused ? "whiteBright" : "white"}
                >
                  {scope}
                </Text>
                {itemFocused && (
                  <Text dimColor={!config.groupByScope} color="gray">
                    {" "}
                    d to remove
                  </Text>
                )}
              </Box>
            );
          })}

          {/* Input field or hint */}
          {inputMode && currentRow?.type === "list-header" ? (
            <Box ref={focusRef} marginLeft={4} gap={1}>
              <Text color="greenBright">+</Text>
              <Text color="cyan">
                {inputValue || ""}
                <Text color="gray">|</Text>
              </Text>
            </Box>
          ) : listHeaderFocused ? (
            <Box marginLeft={4}>
              <Text color="gray">press enter or a to add</Text>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box marginTop={1} flexShrink={0}>
        <Text color="gray">
          <Text color="white">↑↓</Text> navigate{"  "}
          <Text color="white">space</Text> toggle{"  "}
          <Text color="white">a</Text> add{"  "}
          <Text color="white">d</Text> remove{"  "}
          <Text color="white">esc</Text> back
        </Text>
      </Box>
    </Box>
  );
}
