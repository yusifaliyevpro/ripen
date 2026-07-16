import { Box, Text, useInput } from "ink";
import { useState } from "react";

type Props = {
  currentVersion: string;
  latestVersion: string;
  onUpdate: () => void;
  onSkip: () => void;
};

export function SelfUpdatePrompt({ currentVersion, latestVersion, onUpdate, onSkip }: Props) {
  const [selected, setSelected] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) setSelected(0);
    if (key.downArrow) setSelected(1);
    if (key.return) {
      if (selected === 0) onUpdate();
      else onSkip();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="greenBright" bold>
        {" "}
        ripen
      </Text>
      <Box marginTop={1}>
        <Text>
          A new version is available!{"  "}
          <Text color="gray">{currentVersion}</Text>
          <Text color="gray"> → </Text>
          <Text color="greenBright">{latestVersion}</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text>
          {selected === 0 ? <Text color="greenBright">{"❯ "}</Text> : <Text>{"  "}</Text>}
          <Text color={selected === 0 ? "white" : "gray"}>Update (copies command to clipboard)</Text>
        </Text>
        <Text>
          {selected === 1 ? <Text color="greenBright">{"❯ "}</Text> : <Text>{"  "}</Text>}
          <Text color={selected === 1 ? "white" : "gray"}>Skip</Text>
        </Text>
      </Box>
    </Box>
  );
}
