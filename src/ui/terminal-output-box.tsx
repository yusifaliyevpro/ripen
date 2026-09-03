import { Box, Text, useWindowSize } from "ink";

type Props = {
  message: string;
  command: string;
  outputLines: string[];
  maxLines: number;
};

export function TerminalOutputBox({ message, command, outputLines, maxLines }: Props) {
  const { columns, rows } = useWindowSize();
  const boxWidth = Math.min(64, columns - 4);
  // Fill the terminal (padding 2) so the header pins to the top and matches the list's height — no jump when loading finishes.
  const minHeight = Math.max(1, rows);
  return (
    <Box flexDirection="column" padding={1} minHeight={minHeight}>
      <Text color="greenBright" bold>
        {" "}
        ripen <Text color="gray">- interactive dependency updater</Text>
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
        width={boxWidth}
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
