import { useEffect } from "react";
import { Box, Text } from "ink";
import type { UpdateResult } from "../executor";

interface Props {
  results: UpdateResult[];
  onDone: () => void;
}

export function UpdateResults({ results, onDone }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1000);
    return () => clearTimeout(timer);
  }, []);

  const success = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="greenBright">
          {" "}
          Update complete
        </Text>
      </Box>

      {success.map((r) => (
        <Box key={r.name} gap={2}>
          <Text color="greenBright">✓</Text>
          <Text color="white">{r.name}</Text>
          <Text color="gray">{r.fromVersion}</Text>
          <Text color="gray">→</Text>
          <Text color="greenBright">{r.version}</Text>
        </Box>
      ))}

      {failed.map((r) => (
        <Box key={r.name} flexDirection="column">
          <Box gap={2}>
            <Text color="red">✗</Text>
            <Text color="white">{r.name}</Text>
            <Text color="gray">{r.fromVersion}</Text>
            <Text color="gray">→</Text>
            <Text color="red">{r.version}</Text>
          </Box>
          {r.error && <Text color="red"> {r.error.slice(0, 80)}</Text>}
        </Box>
      ))}
    </Box>
  );
}
