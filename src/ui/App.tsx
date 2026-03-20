import { useState, useEffect } from "react";
import { Box, Text, useApp } from "ink";
import type { ProjectInfo } from "../detector";
import type { OutdatedPackage } from "../fetcher";
import type { UpdateResult } from "../executor";
import { getOutdatedPackages, getAllGlobalOutdated } from "../fetcher";
import { updatePackages } from "../executor";
import { loadConfig, saveConfig } from "../config";
import type { RipenConfig } from "../config";
import { fetchLatestVersion, isNewerVersion } from "../registry";
import { execa } from "execa";
import { PackageList } from "./PackageList";
import { VersionPicker } from "./VersionPicker";
import { ChangelogPanel } from "./ChangelogPanel";
import { UpdateResults } from "./UpdateResults";
import { Settings } from "./Settings";
import { SelfUpdatePrompt } from "./SelfUpdatePrompt";

type Screen =
  | "self-update-check"
  | "self-update"
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
  version: string;
  installManager: ProjectInfo["manager"];
}

export function App({ project, global, version, installManager }: Props) {
  const { exit } = useApp();

  const [screen, setScreen] = useState<Screen>("self-update-check");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [selfUpdateError, setSelfUpdateError] = useState<string | null>(null);
  const [selfUpdating, setSelfUpdating] = useState(false);
  const [config, setConfig] = useState<RipenConfig>(() => loadConfig());
  const [packages, setPackages] = useState<OutdatedPackage[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("Checking for outdated packages…");
  const MAX_TERMINAL_LINES = 3;
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [terminalCmd, setTerminalCmd] = useState(
    global ? "Checking all package managers…" : "Checking npm registry…",
  );

  // Self-update check on mount
  useEffect(() => {
    let cancelled = false;
    fetchLatestVersion("ripencli").then((latest) => {
      if (cancelled) return;
      if (latest && isNewerVersion(version, latest)) {
        setLatestVersion(latest);
        setScreen("self-update");
      } else {
        setScreen("loading");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch outdated packages when entering loading screen
  const [fetchStarted, setFetchStarted] = useState(false);
  useEffect(() => {
    if (screen !== "loading" || fetchStarted) return;
    setFetchStarted(true);

    const onLine = (line: string) => {
      setOutputLines((prev) => [...prev.slice(-(MAX_TERMINAL_LINES - 1)), line]);
    };

    const fetch = global
      ? getAllGlobalOutdated(project.cwd, onLine)
      : getOutdatedPackages(project.manager, project.cwd, false, onLine);
    fetch.then((result) => {
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
  }, [screen]);

  const handleToggle = (index: number) => {
    setPackages((prev) => prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)));
  };

  const handleToggleGroup = (groupType: OutdatedPackage["type"]) => {
    setPackages((prev) => {
      const groupPkgs = prev.filter((p) => p.type === groupType);
      const allSelected = groupPkgs.every((p) => p.selected);
      return prev.map((p) => (p.type === groupType ? { ...p, selected: !allSelected } : p));
    });
  };

  const handleToggleMany = (indices: number[]) => {
    setPackages((prev) => {
      const allSelected = indices.every((i) => prev[i]?.selected);
      return prev.map((p, i) => (indices.includes(i) ? { ...p, selected: !allSelected } : p));
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
      prev.map((p, i) => (i === activeIndex ? { ...p, targetVersion: version, selected: true } : p)),
    );
    setScreen("list");
  };

  const handleSelfUpdate = async () => {
    setSelfUpdating(true);
    try {
      const updateArgs =
        installManager === "yarn"
          ? ["global", "add", `ripencli@${latestVersion}`]
          : ["add", "--global", `ripencli@${latestVersion}`];
      await execa(installManager, updateArgs);
      setSelfUpdating(false);
      setScreen("loading");
    } catch (err: any) {
      setSelfUpdateError(err.message ?? "Unknown error");
      setSelfUpdating(false);
      // Continue to loading after a brief delay so user can see the error
      setTimeout(() => setScreen("loading"), 2000);
    }
  };

  const handleConfirm = async () => {
    const selected = packages.filter((p) => p.selected);
    if (selected.length === 0) return;

    setLoadingMsg(`Updating ${selected.length} package${selected.length > 1 ? "s" : ""}…`);
    setTerminalCmd("");
    setOutputLines([]);
    setScreen("updating");

    const onLine = (line: string) => {
      setOutputLines((prev) => [...prev.slice(-(MAX_TERMINAL_LINES - 1)), line]);
    };

    const res = await updatePackages(project.manager, selected, project.cwd, global, onLine);
    setResults(res);
    setScreen("results");
  };

  // Self-update check screen
  if (screen === "self-update-check") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="greenBright" bold>
          {" "}
          ripen
        </Text>
        <Box marginTop={1}>
          <Text color="gray">Checking for updates…</Text>
        </Box>
      </Box>
    );
  }

  // Self-update prompt screen
  if (screen === "self-update") {
    return (
      <SelfUpdatePrompt
        currentVersion={version}
        latestVersion={latestVersion!}
        updating={selfUpdating}
        error={selfUpdateError}
        onUpdate={handleSelfUpdate}
        onSkip={() => setScreen("loading")}
      />
    );
  }

  // Loading screen (initial fetch) — PackageList not yet needed
  if (screen === "loading") {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="greenBright" bold>
          {" "}
          ripen
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
              <Text dimColor color="gray">
                {terminalCmd}
              </Text>
            </Box>
          )}
          {outputLines.map((line, i) => (
            <Text
              key={i}
              color={line.includes("WARN") || line.includes("ERR") ? "yellow" : "gray"}
              dimColor
              wrap="truncate"
            >
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
            <Text color="gray">This usually means a network issue. Check your connection and try again.</Text>
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
            ✓ All packages are up to date in <Text color="white">{global ? "global" : project.name}</Text>
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
            {" "}
            ripen
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
                <Text dimColor color="gray">
                  {terminalCmd}
                </Text>
              </Box>
            )}
            {outputLines.map((line, i) => (
              <Text
                key={i}
                color={line.includes("WARN") || line.includes("ERR") ? "yellow" : "gray"}
                dimColor
                wrap="truncate"
              >
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )}
      {screen === "results" && (
        <Box padding={1}>
          <UpdateResults
            results={results}
            onDone={() => {
              exit();
              process.exit(0);
            }}
          />
        </Box>
      )}
      {screen === "settings" && (
        <Box padding={1}>
          <Settings config={config} onConfigChange={handleConfigChange} onClose={() => setScreen("list")} />
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
          <ChangelogPanel pkg={packages[activeIndex]!} onClose={() => setScreen("list")} />
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
