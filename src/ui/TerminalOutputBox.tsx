import { Box, Text } from "ink";

type Props = {
  message: string;
  command: string;
  outputLines: string[];
  maxLines: number;
};

export function TerminalOutputBox({ message, command, outputLines, maxLines }: Props) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="greenBright" bold>
        {" "}
        ripen
      </Text>
      <Box marginTop={1}>
        <Text color="gray">{message}</Text>
      </Box>
      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="round"
        borderColor="gray"
        paddingX={1}
        width={64}
        height={maxLines + 3}
        overflow="hidden"
      >
        {command !== "" && (
          <Box>
            <Text color="gray">$ </Text>
            <Text color="gray">{command}</Text>
          </Box>
        )}
        {outputLines.map((line, i) => (
          <Text key={i} color={line.includes("WARN") || line.includes("ERR") ? "yellow" : "gray"} wrap="truncate">
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
