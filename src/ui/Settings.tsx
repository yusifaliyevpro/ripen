import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RipenConfig } from "../config";

type Props = {
  config: RipenConfig;
  onConfigChange: (config: RipenConfig) => void;
  onClose: () => void;
};

export function Settings({ config, onConfigChange, onClose }: Props) {
  const [inputMode, setInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const scopes = config.groupScopes;

  // Build flat list of focusable rows:
  // Row 0: frequencySort toggle
  // Row 1: groupScopes header
  // Row 2+: each scope item
  const rows: {
    type: "toggle-frequency" | "toggle-group" | "toggle-groups-top" | "list-header" | "list-item";
    listItemIndex?: number;
  }[] = [
    { type: "toggle-frequency" },
    { type: "toggle-group" },
    { type: "toggle-groups-top" },
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

    if (input === " " || key.return) {
      if (currentRow?.type === "toggle-frequency") {
        onConfigChange({ ...config, frequencySort: !config.frequencySort });
      } else if (currentRow?.type === "toggle-group") {
        onConfigChange({ ...config, groupByScope: !config.groupByScope });
      } else if (currentRow?.type === "toggle-groups-top") {
        onConfigChange({ ...config, groupsOnTop: !config.groupsOnTop });
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
      const scope = scopes[currentRow.listItemIndex]!;
      removeScope(scope);
      if (flatCursor >= rows.length - 1) {
        setFlatCursor(Math.max(0, flatCursor - 1));
      }
    }

    if (key.escape || input === "s") {
      onClose();
    }
  });

  const freqToggleFocused = currentRow?.type === "toggle-frequency";
  const groupToggleFocused = currentRow?.type === "toggle-group";
  const groupsTopFocused = currentRow?.type === "toggle-groups-top";
  const listHeaderFocused = currentRow?.type === "list-header";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">-- settings</Text>
        </Text>
      </Box>

      {/* Toggle: frequencySort */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text color="greenBright">{freqToggleFocused ? ">" : " "}</Text>
          <Text color={config.frequencySort ? "greenBright" : "gray"}>[{config.frequencySort ? "x" : " "}]</Text>
          <Text bold={freqToggleFocused} color={freqToggleFocused ? "whiteBright" : "white"}>
            Sort by update frequency
          </Text>
        </Box>
        <Box marginLeft={6}>
          <Text color="gray">Packages you update often appear at the top</Text>
        </Box>
      </Box>

      {/* Toggle: groupByScope */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text color="greenBright">{groupToggleFocused ? ">" : " "}</Text>
          <Text color={config.groupByScope ? "greenBright" : "gray"}>[{config.groupByScope ? "x" : " "}]</Text>
          <Text bold={groupToggleFocused} color={groupToggleFocused ? "whiteBright" : "white"}>
            Enable scope grouping
          </Text>
        </Box>
        <Box marginLeft={6}>
          <Text color="gray">Group scoped packages listed below under their scope prefix</Text>
        </Box>
      </Box>

      {/* Toggle: groupsOnTop */}
      <Box flexDirection="column" marginBottom={1}>
        <Box gap={1}>
          <Text dimColor={!config.groupByScope} color="greenBright">
            {groupsTopFocused ? ">" : " "}
          </Text>
          <Text
            dimColor={!config.groupByScope}
            color={config.groupsOnTop && config.groupByScope ? "greenBright" : "gray"}
          >
            [{config.groupsOnTop ? "x" : " "}]
          </Text>
          <Text
            dimColor={!config.groupByScope}
            bold={groupsTopFocused}
            color={!config.groupByScope ? "gray" : groupsTopFocused ? "whiteBright" : "white"}
          >
            Show grouped scopes on top
          </Text>
        </Box>
        <Box marginLeft={6}>
          <Text dimColor={!config.groupByScope} color="gray">
            Grouped scope packages appear before ungrouped ones
          </Text>
        </Box>
      </Box>

      {/* List: groupScopes */}
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="column" marginBottom={0}>
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
          const itemFocused = flatCursor === 4 + i;
          return (
            <Box key={scope} marginLeft={4} gap={1}>
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
          <Text color="white">d</Text> remove{"  "}
          <Text color="white">esc</Text> back
        </Text>
      </Box>
    </Box>
  );
}
