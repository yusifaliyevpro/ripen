import { Text, useInput } from "ink";
import { render } from "ink-testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTerminalOutput } from "../../src/hooks/use-terminal-output";

function Probe({ max }: { max?: number }) {
  const { outputLines, terminalCmd, loadingMsg, onLine, reset, setTerminalCmd, setLoadingMsg } = useTerminalOutput(max);

  useInput((input) => {
    if (input >= "1" && input <= "9") onLine(`l${input}`);
    if (input === "c") {
      setTerminalCmd("$ cmd");
      setLoadingMsg("loading");
    }
    if (input === "r") reset();
  });

  return <Text>{`out=[${outputLines.join(",")}] cmd=${terminalCmd} msg=${loadingMsg}`}</Text>;
}

afterEach(() => vi.restoreAllMocks());

describe("useTerminalOutput", () => {
  it("keeps only the most recent maxLines", async () => {
    const { stdin, lastFrame } = render(<Probe max={3} />);
    for (const key of ["1", "2", "3", "4"]) stdin.write(key);
    await vi.waitFor(() => expect(lastFrame()).toContain("out=[l2,l3,l4]"));
  });

  it("defaults to three retained lines", async () => {
    const { stdin, lastFrame } = render(<Probe />);
    for (const key of ["1", "2", "3", "4", "5"]) stdin.write(key);
    await vi.waitFor(() => expect(lastFrame()).toContain("out=[l3,l4,l5]"));
  });

  it("reset clears output, command, and loading message", async () => {
    const { stdin, lastFrame } = render(<Probe max={3} />);
    stdin.write("1");
    stdin.write("c");
    await vi.waitFor(() => expect(lastFrame()).toContain("cmd=$ cmd"));
    stdin.write("r");
    await vi.waitFor(() => expect(lastFrame()).toContain("out=[] cmd= msg="));
  });
});
