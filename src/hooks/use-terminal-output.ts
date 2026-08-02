import { useState, useCallback } from "react";

const DEFAULT_MAX_LINES = 3;

export function useTerminalOutput(maxLines = DEFAULT_MAX_LINES) {
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [terminalCmd, setTerminalCmd] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  const onLine = useCallback(
    (line: string) => {
      setOutputLines((prev) => [...prev.slice(-(maxLines - 1)), line]);
    },
    [maxLines],
  );

  const reset = useCallback(() => {
    setOutputLines([]);
    setTerminalCmd("");
    setLoadingMsg("");
  }, []);

  return { outputLines, terminalCmd, loadingMsg, setTerminalCmd, setLoadingMsg, onLine, reset, maxLines };
}
