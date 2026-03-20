import { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RipenConfig } from "../config";

interface Props {
  config: RipenConfig;
  onConfigChange: (config: RipenConfig) => void;
  onClose: () => void;
}

const SETTINGS: {
  key: keyof RipenConfig;
  label: string;
  description: string;
}[] = [
  {
    key: "groupByScope",
    label: "Group packages by scope",
    description: "Sub-group scoped packages (@org/pkg) under their scope prefix",
  },
];

export function Settings({ config, onConfigChange, onClose }: Props) {
  const [cursor, setCursor] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow) setCursor((c) => Math.min(SETTINGS.length - 1, c + 1));

    if (input === " " || key.return) {
      const setting = SETTINGS[cursor]!;
      onConfigChange({ ...config, [setting.key]: !config[setting.key] });
    }

    if (key.escape || input === "s") {
      onClose();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="greenBright">
          {" "}
          ripen <Text color="gray">-- settings</Text>
        </Text>
      </Box>

      {SETTINGS.map((setting, i) => {
        const isFocused = cursor === i;
        const isEnabled = config[setting.key];

        return (
          <Box key={setting.key} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              <Text color="greenBright">{isFocused ? "❯" : " "}</Text>
              <Text color={isEnabled ? "greenBright" : "gray"}>[{isEnabled ? "✓" : " "}]</Text>
              <Text bold={isFocused} color={isFocused ? "whiteBright" : "white"}>
                {setting.label}
              </Text>
            </Box>
            <Box marginLeft={6}>
              <Text color="gray">{setting.description}</Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color="gray">
          <Text color="white">↑↓</Text> navigate{"  "}
          <Text color="white">space</Text> toggle{"  "}
          <Text color="white">esc</Text> back
        </Text>
      </Box>
    </Box>
  );
}
