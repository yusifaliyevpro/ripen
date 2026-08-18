import { Box, Text, useApp, useInput } from "ink";
import { useState, useEffect } from "react";
import { buildUpdateCommands } from "../build-commands";
import { loadConfig, saveConfig, loadFrequency, incrementFrequency } from "../config";
import { getOutdatedPackages, getAllGlobalOutdated } from "../fetcher";
import { useSelfUpdate, usePackages, useTerminalOutput } from "../hooks";
import { copyToClipboard } from "../lib/utils";
import type { ProjectInfo, RipenConfig, Screen } from "../types";
import { ChangelogPanel } from "./changelog-panel";
import { PackageList } from "./package-list";
import { SelfUpdatePrompt } from "./self-update-prompt";
import { Settings } from "./settings";
import { TerminalOutputBox } from "./terminal-output-box";
import { VersionPicker } from "./version-picker";

type Props = {
  project: ProjectInfo;
  global: boolean;
  showAll: boolean;
  version: string;
  installManager: ProjectInfo["manager"];
  onCopied?: (commands: string[]) => void;
  onEmpty?: () => void;
  onCancel?: () => void;
};

export function App({ project, global, showAll, version, installManager, onCopied, onEmpty, onCancel }: Props) {
  const { exit } = useApp();

  // The self-update decision is synchronous (reads a version cached by a prior
  // run), so the app opens straight on the prompt or the list — no wait.
  const selfUpdate = useSelfUpdate(version, installManager);

  const [screen, setScreen] = useState<Screen>(selfUpdate.hasUpdate ? "self-update" : "loading");
  const [config, setConfig] = useState<RipenConfig>(() => loadConfig());
  const [frequency, setFrequency] = useState<Record<string, number>>(() => loadFrequency());
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorTitle, setErrorTitle] = useState("Could not fetch outdated packages");

  const showError = (message: string, title = "Could not fetch outdated packages") => {
    setErrorTitle(title);
    setErrorMsg(message);
    setScreen("error");
  };

  const { packages, setPackages, toggleOne, toggleMany, chooseVersion } = usePackages();
  const terminal = useTerminalOutput();

  // ── Ctrl+C ──────────────────────────────────────────────────────────
  useInput((_input, key) => {
    if (key.ctrl && _input === "c") {
      onCancel?.();
      exit();
    }
  });

  // ── Exit when there's nothing to show ───────────────────────────────
  // "All up to date" is printed to the primary buffer by cli.tsx after exit, so
  // we quit immediately here — no delay to let an alternate-screen frame paint.
  useEffect(() => {
    if (screen !== "empty") return;
    onEmpty?.();
    exit();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const handleSelfUpdate = () => {
    const raw = selfUpdate.buildUpdateCommand();
    const cmd = config.sfwFirewall ? `sfw ${raw}` : raw;
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
    // In global mode several managers run, so the real commands are streamed
    // into the output box via onLine instead of a single fake header command.
    terminal.setTerminalCmd(global ? "" : "Checking npm registry…");

    const fetch = global
      ? getAllGlobalOutdated(project.cwd, terminal.onLine, showAll)
      : getOutdatedPackages(project.manager, project.cwd, false, terminal.onLine, showAll, project.packageJson);

    fetch
      .then((result) => {
        if (!result.ok) {
          showError(result.error);
          return;
        }
        terminal.reset();
        if (result.packages.length === 0) {
          setScreen("empty");
        } else {
          setPackages(result.packages);
          setScreen("list");
        }
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : String(err));
      });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Callbacks ──────────────────────────────────────────────────────
  const handleConfigChange = (newConfig: RipenConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleConfirm = () => {
    const selected = packages.filter((p) => p.selected);
    if (selected.length === 0) return;
    const commands = buildUpdateCommands(project.manager, selected, global, config.sfwFirewall);
    copyToClipboard(commands.join(" && "));
    incrementFrequency(selected.map((p) => p.name));
    setFrequency(loadFrequency());
    onCopied?.(commands);
    exit();
  };

  // ── Render ─────────────────────────────────────────────────────────

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
          <Text color="red">✗ {errorTitle}</Text>
          <Text color="gray">{errorMsg}</Text>
          <Box marginTop={1}>
            <Text color="gray">This usually means a network issue. Check your connection and try again.</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // The "empty" screen renders nothing — the effect above exits immediately and
  // cli.tsx prints the "all up to date" message to the primary buffer.
  if (screen === "empty") return <></>;

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
            pkg={packages[activeIndex]}
            onSelect={(v, publishedAt) => {
              chooseVersion(activeIndex, v, publishedAt);
              setScreen("list");
            }}
            onCancel={() => setScreen("list")}
            onError={(msg) => showError(msg, "Could not fetch versions")}
          />
        </Box>
      )}
      {screen === "changelog" && packages[activeIndex] && (
        <Box padding={1}>
          <ChangelogPanel
            pkg={packages[activeIndex]}
            onClose={() => setScreen("list")}
            onError={(msg) => showError(msg, "Could not fetch changelog")}
          />
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
