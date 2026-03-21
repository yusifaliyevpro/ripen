import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RipenConfig } from "../config";
import { DEFAULT_UNGROUP_SCOPES, getEffectiveUngroupScopes } from "../config";

interface Props {
  config: RipenConfig;
  onConfigChange: (config: RipenConfig) => void;
  onClose: () => void;
}

export function Settings({ config, onConfigChange, onClose }: Props) {
  const [inputMode, setInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const effectiveScopes = getEffectiveUngroupScopes(config);

  // Build flat list of focusable rows:
  // Row 0: groupByScope toggle
  // Row 1: ungroupScopes header
  // Row 2+: each effective scope item
  const rows: { type: "toggle" | "list-header" | "list-item"; listItemIndex?: number }[] = [
    { type: "toggle" },
    { type: "list-header" },
    ...effectiveScopes.map((_, i) => ({ type: "list-item" as const, listItemIndex: i })),
  ];

  const [flatCursor, setFlatCursor] = useState(0);
  const currentRow = rows[flatCursor];

  const addScope = (value: string) => {
    const scope = value.startsWith("@") ? value : `@${value}`;
    if (effectiveScopes.includes(scope)) return;

    // If it's a previously removed default, just un-remove it
    if (DEFAULT_UNGROUP_SCOPES.includes(scope)) {
      onConfigChange({
        ...config,
        removedDefaults: config.removedDefaults.filter((s) => s !== scope),
      });
    } else {
      onConfigChange({
        ...config,
        addedScopes: [...config.addedScopes, scope],
      });
    }
  };

  const removeScope = (scope: string) => {
    if (DEFAULT_UNGROUP_SCOPES.includes(scope)) {
      // It's a default — mark as removed
      onConfigChange({
        ...config,
        removedDefaults: [...config.removedDefaults, scope],
      });
    } else {
      // It's user-added — just remove it
      onConfigChange({
        ...config,
        addedScopes: config.addedScopes.filter((s) => s !== scope),
      });
    }
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

    if (input === " " || key.return) {
      if (currentRow?.type === "toggle") {
        onConfigChange({ ...config, groupByScope: !config.groupByScope });
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
    if ((key.backspace || key.delete) && currentRow?.type === "list-item" && currentRow.listItemIndex !== undefined) {
      const scope = effectiveScopes[currentRow.listItemIndex]!;
      removeScope(scope);
      if (flatCursor >= rows.length - 1) {
        setFlatCursor(Math.max(0, flatCursor - 1));
      }
    }

    if (key.escape || input === "s") {
      onClose();
    }
  });

  const toggleFocused = flatCursor === 0;
  const listHeaderFocused = flatCursor === 1;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">-- settings</Text>
        </Text>
      </Box>

      {/* Toggle: groupByScope */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text color="greenBright">{toggleFocused ? ">" : " "}</Text>
          <Text color={config.groupByScope ? "greenBright" : "gray"}>[{config.groupByScope ? "x" : " "}]</Text>
          <Text bold={toggleFocused} color={toggleFocused ? "whiteBright" : "white"}>
            Group packages by scope
          </Text>
        </Box>
        <Box marginLeft={6}>
          <Text color="gray">Sub-group scoped packages (@org/pkg) under their scope prefix</Text>
        </Box>
      </Box>

      {/* List: ungroupScopes */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="column" marginBottom={0}>
          <Box gap={1}>
            <Text color="greenBright">{listHeaderFocused ? ">" : " "}</Text>
            <Text bold={listHeaderFocused} color={listHeaderFocused ? "whiteBright" : "white"}>
              Excluded scopes from grouping
            </Text>
          </Box>
          <Box marginLeft={4}>
            <Text color="gray">Scopes listed here won't be sub-grouped (type to add, delete to remove)</Text>
          </Box>
        </Box>

        {/* Scope items */}
        {effectiveScopes.map((scope, i) => {
          const itemFocused = flatCursor === 2 + i;
          const isDefault = DEFAULT_UNGROUP_SCOPES.includes(scope);
          return (
            <Box key={scope} marginLeft={4} gap={1}>
              <Text color="greenBright">{itemFocused ? ">" : " "}</Text>
              <Text color={itemFocused ? "whiteBright" : "white"}>{scope}</Text>
              {isDefault && <Text color="gray">(default)</Text>}
              {itemFocused && <Text color="gray"> delete to remove</Text>}
            </Box>
          );
        })}

        {/* Input field or hint */}
        {inputMode && currentRow?.type === "list-header" ? (
          <Box marginLeft={4} gap={1}>
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

      <Box marginTop={1}>
        <Text color="gray">
          <Text color="white">arrow keys</Text> navigate{"  "}
          <Text color="white">space</Text> toggle{"  "}
          <Text color="white">a</Text> add{"  "}
          <Text color="white">delete</Text> remove{"  "}
          <Text color="white">esc</Text> back
        </Text>
      </Box>
    </Box>
  );
}
