import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { ProjectInfo } from "../detector";
import type { OutdatedPackage } from "../fetcher";
import type { UpdateResult } from "../executor";
import { getOutdatedPackages } from "../fetcher";
import { updatePackages } from "../executor";
import { loadConfig, saveConfig } from "../config";
import type { RipenConfig } from "../config";
import { PackageList } from "./PackageList";
import { VersionPicker } from "./VersionPicker";
import { ChangelogPanel } from "./ChangelogPanel";
import { UpdateResults } from "./UpdateResults";
import { Settings } from "./Settings";

type Screen =
  | "loading"
  | "list"
  | "version-picker"
  | "changelog"
  | "updating"
  | "results"
  | "empty"
  | "error"
  | "settings";

interface Props {
  project: ProjectInfo;
  global: boolean;
}

export function App({ project, global }: Props) {
  const { exit } = useApp();

  const [screen, setScreen] = useState<Screen>("loading");
  const [config, setConfig] = useState<RipenConfig>(() => loadConfig());
  const [packages, setPackages] = useState<OutdatedPackage[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(
    "Checking for outdated packages…",
  );
  const MAX_TERMINAL_LINES = 3;
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [terminalCmd, setTerminalCmd] = useState(
    `${project.manager} outdated --json`,
  );

  useEffect(() => {
    const onLine = (line: string) => {
      setOutputLines((prev) => [...prev.slice(-(MAX_TERMINAL_LINES - 1)), line]);
    };

    getOutdatedPackages(project.manager, project.cwd, global, onLine).then((result) => {
      if (!result.ok) {
        setErrorMsg(result.error);
        setScreen("error");
        return;
      }
      setOutputLines([]);
      if (result.packages.length === 0) {
        setScreen("empty");
      } else {
        setPackages(result.packages);
        setScreen("list");
      }
    });
  }, []);

  const handleToggle = (index: number) => {
    setPackages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)),
    );
  };

  const handleToggleGroup = (groupType: OutdatedPackage["type"]) => {
    setPackages((prev) => {
      const groupPkgs = prev.filter((p) => p.type === groupType);
      const allSelected = groupPkgs.every((p) => p.selected);
      return prev.map((p) =>
        p.type === groupType ? { ...p, selected: !allSelected } : p,
      );
    });
  };

  const handleToggleMany = (indices: number[]) => {
    setPackages((prev) => {
      const allSelected = indices.every((i) => prev[i]?.selected);
      return prev.map((p, i) =>
        indices.includes(i) ? { ...p, selected: !allSelected } : p,
      );
    });
  };

  const handleConfigChange = (newConfig: RipenConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSelectVersion = (index: number) => {
    setActiveIndex(index);
    setScreen("version-picker");
  };

  const handleViewChangelog = (index: number) => {
    setActiveIndex(index);
    setScreen("changelog");
  };

  const handleVersionChosen = (version: string) => {
    setPackages((prev) =>
      prev.map((p, i) =>
        i === activeIndex
          ? { ...p, targetVersion: version, selected: true }
          : p,
      ),
    );
    setScreen("list");
  };

  const handleConfirm = async () => {
    const selected = packages.filter((p) => p.selected);
    if (selected.length === 0) return;

    setLoadingMsg(
      `Updating ${selected.length} package${selected.length > 1 ? "s" : ""}…`,
    );
    setTerminalCmd("");
    setOutputLines([]);
    setScreen("updating");

    const onLine = (line: string) => {
      setOutputLines((prev) => [...prev.slice(-(MAX_TERMINAL_LINES - 1)), line]);
    };

    const res = await updatePackages(
      project.manager,
      selected,
      project.cwd,
      global,
      onLine,
    );
    setResults(res);
    setScreen("results");
  };

  // Loading screen (initial fetch) — PackageList not yet needed
  if (screen === "loading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="greenBright" bold>
          {" "}ripen
        </Text>
        <Box marginTop={1}>
          <Text color="gray">{loadingMsg}</Text>
        </Box>
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="gray"
          paddingX={1}
          width={64}
          height={MAX_TERMINAL_LINES + 3}
          overflow="hidden"
        >
          {terminalCmd !== "" && (
            <Box>
              <Text color="gray">$ </Text>
              <Text dimColor color="gray">{terminalCmd}</Text>
            </Box>
          )}
          {outputLines.map((line, i) => (
            <Text key={i} color={line.includes("WARN") || line.includes("ERR") ? "yellow" : "gray"} dimColor wrap="truncate">
              {line}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  if (screen === "error") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="greenBright" bold>
          {" "}
          ripen
        </Text>
        <Box marginTop={1} flexDirection="column" gap={1}>
          <Text color="red">✗ Could not fetch outdated packages</Text>
          <Text color="gray" dimColor>
            {errorMsg}
          </Text>
          <Box marginTop={1}>
            <Text color="gray">
              This usually means a network issue. Check your connection and try
              again.
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (screen === "empty") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="greenBright" bold>
          {" "}
          ripen
        </Text>
        <Box marginTop={1}>
          <Text color="gray">
            ✓ All packages are up to date in{" "}
            <Text color="white">{global ? "global" : project.name}</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  // All screens below keep PackageList mounted (hidden) to preserve state.
  const isListActive = screen === "list";

  return (
    <>
      {screen === "updating" && (
        <Box flexDirection="column" padding={1}>
          <Text color="greenBright" bold>
            {" "}ripen
          </Text>
          <Box marginTop={1}>
            <Text color="gray">{loadingMsg}</Text>
          </Box>
          <Box
            flexDirection="column"
            marginTop={1}
            borderStyle="round"
            borderColor="gray"
            paddingX={1}
            width={64}
            height={MAX_TERMINAL_LINES + 3}
            overflow="hidden"
          >
            {terminalCmd !== "" && (
              <Box>
                <Text color="gray">$ </Text>
                <Text dimColor color="gray">{terminalCmd}</Text>
              </Box>
            )}
            {outputLines.map((line, i) => (
              <Text key={i} color={line.includes("WARN") || line.includes("ERR") ? "yellow" : "gray"} dimColor wrap="truncate">
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )}
      {screen === "results" && (
        <Box padding={1}>
          <UpdateResults results={results} onDone={() => { exit(); process.exit(0); }} />
        </Box>
      )}
      {screen === "settings" && (
        <Box padding={1}>
          <Settings
            config={config}
            onConfigChange={handleConfigChange}
            onClose={() => setScreen("list")}
          />
        </Box>
      )}
      {screen === "version-picker" && packages[activeIndex] && (
        <Box padding={1}>
          <VersionPicker
            pkg={packages[activeIndex]!}
            onSelect={handleVersionChosen}
            onCancel={() => setScreen("list")}
          />
        </Box>
      )}
      {screen === "changelog" && packages[activeIndex] && (
        <Box padding={1}>
          <ChangelogPanel
            pkg={packages[activeIndex]!}
            onClose={() => setScreen("list")}
          />
        </Box>
      )}
      <Box padding={1} display={isListActive ? "flex" : "none"}>
        <PackageList
          packages={packages}
          onToggle={handleToggle}
          onToggleGroup={handleToggleGroup}
          onToggleMany={handleToggleMany}
          onSelectVersion={handleSelectVersion}
          onViewChangelog={handleViewChangelog}
          onConfirm={handleConfirm}
          onOpenSettings={() => setScreen("settings")}
          focusedIndex={focusedIndex}
          onFocusChange={setFocusedIndex}
          groupByScope={config.groupByScope}
          isActive={isListActive}
        />
      </Box>
    </>
  );
}
