import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface Props {
  currentVersion: string;
  latestVersion: string;
  updating: boolean;
  error: string | null;
  onUpdate: () => void;
  onSkip: () => void;
}

export function SelfUpdatePrompt({ currentVersion, latestVersion, updating, error, onUpdate, onSkip }: Props) {
  const [selected, setSelected] = useState(0);

  useInput((input, key) => {
    if (updating) return;
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
      <Box marginTop={1} flexDirection="column">
        <Text>
          A new version is available! <Text color="gray">{currentVersion}</Text>
          <Text color="gray"> → </Text>
          <Text color="greenBright">{latestVersion}</Text>
        </Text>
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">✗ Update failed: {error}</Text>
          <Text color="gray"> Continuing…</Text>
        </Box>
      )}
      {updating ? (
        <Box marginTop={1}>
          <Text color="gray">Updating ripen…</Text>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Text>
            {selected === 0 ? <Text color="greenBright">{"❯ "}</Text> : <Text>{"  "}</Text>}
            <Text color={selected === 0 ? "white" : "gray"}>Update and continue</Text>
          </Text>
          <Text>
            {selected === 1 ? <Text color="greenBright">{"❯ "}</Text> : <Text>{"  "}</Text>}
            <Text color={selected === 1 ? "white" : "gray"}>Just continue</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
