import { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { ProjectInfo, RipenConfig, Screen } from "../types";
import { getOutdatedPackages, getAllGlobalOutdated } from "../fetcher";
import { buildUpdateCommands } from "../executor";
import { loadConfig, saveConfig, loadFrequency, incrementFrequency } from "../config";
import { copyToClipboard } from "../lib/utils";
import { PackageList } from "./package-list";
import { VersionPicker } from "./VersionPicker";
import { ChangelogPanel } from "./ChangelogPanel";
import { Settings } from "./Settings";
import { SelfUpdatePrompt } from "./SelfUpdatePrompt";
import { TerminalOutputBox } from "./TerminalOutputBox";
import { useSelfUpdate, usePackages, useTerminalOutput, useExitOnScreen } from "./hooks";

type Props = {
  project: ProjectInfo;
  global: boolean;
  showAll: boolean;
  version: string;
  installManager: ProjectInfo["manager"];
  onCancelled?: () => void;
  onCopied?: (commands: string[]) => void;
};

export function App({ project, global, showAll, version, installManager, onCancelled, onCopied }: Props) {
  const { exit } = useApp();

  const [screen, setScreen] = useState<Screen>("self-update-check");
  const [config, setConfig] = useState<RipenConfig>(() => loadConfig());
  const [frequency, setFrequency] = useState<Record<string, number>>(() => loadFrequency());
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const selfUpdate = useSelfUpdate(version, installManager);
  const { packages, setPackages, toggleOne, toggleMany, chooseVersion } = usePackages();
  const terminal = useTerminalOutput();

  // ── Ctrl+C ──────────────────────────────────────────────────────────
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") setScreen("cancelled");
  });

  // ── Exit handlers ───────────────────────────────────────────────────
  useExitOnScreen(screen, ["empty"], exit);
  useExitOnScreen(screen, ["cancelled"], exit, {
    delay: 200,
    beforeExit: () => onCancelled?.(),
  });

  // ── Self-update check → screen transition ──────────────────────────
  useEffect(() => {
    if (!selfUpdate.checkComplete) return;
    if (screen !== "self-update-check") return;
    setScreen(selfUpdate.hasUpdate ? "self-update" : "loading");
  }, [selfUpdate.checkComplete]);

  const handleSelfUpdate = () => {
    const cmd = selfUpdate.buildUpdateCommand();
    copyToClipboard(cmd);
    onCopied?.([cmd]);
    exit();
  };

  // ── Fetch outdated packages ────────────────────────────────────────
  const [fetchStarted, setFetchStarted] = useState(false);
  useEffect(() => {
    if (screen !== "loading" || fetchStarted) return;
    setFetchStarted(true);

    terminal.setLoadingMsg("Checking for outdated packages…");
    terminal.setTerminalCmd(global ? "Checking all package managers…" : "Checking npm registry…");

    const fetch = global
      ? getAllGlobalOutdated(project.cwd, terminal.onLine, showAll)
      : getOutdatedPackages(project.manager, project.cwd, false, terminal.onLine, showAll);

    fetch.then((result) => {
      if (!result.ok) {
        setErrorMsg(result.error);
        setScreen("error");
        return;
      }
      terminal.reset();
      if (result.packages.length === 0) {
        setScreen("empty");
      } else {
        setPackages(result.packages);
        setScreen("list");
      }
    });
  }, [screen]);

  // ── Callbacks ──────────────────────────────────────────────────────
  const handleConfigChange = (newConfig: RipenConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleConfirm = () => {
    const selected = packages.filter((p) => p.selected);
    if (selected.length === 0) return;
    const commands = buildUpdateCommands(project.manager, selected, global);
    copyToClipboard(commands.join(" && "));
    incrementFrequency(selected.map((p) => p.name));
    setFrequency(loadFrequency());
    onCopied?.(commands);
    exit();
  };

  // ── Render ─────────────────────────────────────────────────────────

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

  if (screen === "self-update") {
    return (
      <SelfUpdatePrompt
        currentVersion={version}
        latestVersion={selfUpdate.latestVersion!}
        onUpdate={handleSelfUpdate}
        onSkip={() => setScreen("loading")}
      />
    );
  }

  if (screen === "loading") {
    return (
      <TerminalOutputBox
        message={terminal.loadingMsg}
        command={terminal.terminalCmd}
        outputLines={terminal.outputLines}
        maxLines={terminal.maxLines}
      />
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
          <Text color="gray">{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color="gray">This usually means a network issue. Check your connection and try again.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (screen === "cancelled") return <></>;

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
      {screen === "settings" && (
        <Box padding={1}>
          <Settings config={config} onConfigChange={handleConfigChange} onClose={() => setScreen("list")} />
        </Box>
      )}
      {screen === "version-picker" && packages[activeIndex] && (
        <Box padding={1}>
          <VersionPicker
            pkg={packages[activeIndex]!}
            onSelect={(v) => {
              chooseVersion(activeIndex, v);
              setScreen("list");
            }}
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
          onToggle={toggleOne}
          onToggleMany={toggleMany}
          onSelectVersion={(i) => {
            setActiveIndex(i);
            setScreen("version-picker");
          }}
          onViewChangelog={(i) => {
            setActiveIndex(i);
            setScreen("changelog");
          }}
          onConfirm={handleConfirm}
          onOpenSettings={() => setScreen("settings")}
          groupByScope={config.groupByScope}
          groupScopes={config.groupScopes}
          groupsOnTop={config.groupsOnTop}
          frequencySort={config.frequencySort}
          frequency={frequency}
          separateDevDeps={config.separateDevDeps}
          showAll={showAll}
          isActive={isListActive}
        />
      </Box>
    </>
  );
}
