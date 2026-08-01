import { Box, Text } from "ink";

type Props = {
  label: string;
  description: string;
  checked: boolean;
  focused: boolean;
  disabled?: boolean;
};

export function SettingsToggle({ label, description, checked, focused, disabled = false }: Props) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        <Text dimColor={disabled} color="greenBright">
          {focused ? ">" : " "}
        </Text>
        <Text dimColor={disabled} color={checked && !disabled ? "greenBright" : "gray"}>
          [{checked ? "x" : " "}]
        </Text>
        <Text dimColor={disabled} bold={focused} color={disabled ? "gray" : focused ? "whiteBright" : "white"}>
          {label}
        </Text>
      </Box>
      <Box marginLeft={6}>
        <Text dimColor={disabled} color="gray">
          {description}
        </Text>
      </Box>
    </Box>
  );
}
