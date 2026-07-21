import { Box, Text, useInput, useWindowSize } from "ink";
import { useState, useEffect } from "react";
import { formatAge } from "../lib/utils";
import { fetchVersions } from "../registry";
import type { RegistryVersion, OutdatedPackage } from "../types";

type Props = {
  pkg: OutdatedPackage;
  onSelect: (version: string, publishedAt: string) => void;
  onCancel: () => void;
};

export function VersionPicker({ pkg, onSelect, onCancel }: Props) {
  const [versions, setVersions] = useState<RegistryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);
  const { rows } = useWindowSize();
  // overhead: App padding(2) + title(1) + current(1) + marginTop(1) + sep(1) + marginBottom(1) + count(1) + marginTop(1) + sep(1) + controls(1) = 11
  const PAGE = Math.max(1, rows - 11);

  useEffect(() => {
    fetchVersions(pkg.name, pkg.current).then((v) => {
      setVersions(v);
      const idx = v.findIndex((x) => x.version === (pkg.targetVersion ?? pkg.latest));
      if (idx >= 0) {
        setCursor(idx);
        setScroll(Math.max(0, idx - Math.floor(PAGE / 2)));
      }
      setLoading(false);
    });
  }, [pkg.name]);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      onCancel();
      return;
    }
    if (key.upArrow) {
      const next = Math.max(0, cursor - 1);
      setCursor(next);
      if (next < scroll) setScroll(next);
    }
    if (key.downArrow) {
      const next = Math.min(versions.length - 1, cursor + 1);
      setCursor(next);
      if (next >= scroll + PAGE) setScroll(next - PAGE + 1);
    }
    if (key.return && versions[cursor]) {
      onSelect(versions[cursor].version, versions[cursor].date);
    }
  });

  const visible = versions.slice(scroll, scroll + PAGE);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyanBright">
          {" "}
          Pick version — <Text color="whiteBright">{pkg.name}</Text>
        </Text>
        <Text color="gray">
          {" "}
          current: <Text color="red">{pkg.current}</Text>
        </Text>
        <Box marginTop={1}>
          <Text color="gray">────────────────────────────────</Text>
        </Box>
      </Box>

      {/* Always render exactly PAGE rows so ink never sees a height change */}
      {Array.from({ length: PAGE }, (_, i) => {
        if (loading) {
          return (
            <Text key={`_${i}`} color="gray">
              {i === 0 ? " fetching versions…" : " "}
            </Text>
          );
        }
        if (versions.length === 0) {
          return (
            <Text key={`_${i}`} color={i === 0 ? "red" : "gray"}>
              {i === 0 ? " Could not fetch versions." : " "}
            </Text>
          );
        }
        const v = visible[i];
        if (!v) return <Text key={`_${i}`}> </Text>;

        const realIdx = scroll + i;
        const isFocused = realIdx === cursor;
        const isCurrent = v.version === pkg.current;
        const isLatest = v.tag === "latest";

        return (
          <Box key={v.version} gap={2}>
            <Text color="cyanBright">{isFocused ? "❯" : " "}</Text>
            <Box width={16}>
              <Text bold={isFocused} color={isFocused ? "whiteBright" : isCurrent ? "red" : "white"}>
                {v.version}
              </Text>
            </Box>
            <Box width={6}>
              <Text color={v.date && Date.now() - new Date(v.date).getTime() < 86_400_000 ? "yellow" : "gray"}>
                {formatAge(v.date)}
              </Text>
            </Box>
            {isLatest && <Text color="greenBright">latest</Text>}
            {isCurrent && <Text color="red">current</Text>}
          </Box>
        );
      })}

      {/* Always render count row — empty when not needed to keep height stable */}
      <Text color="gray">
        {!loading && versions.length > PAGE
          ? `  showing ${scroll + 1}–${Math.min(scroll + PAGE, versions.length)} of ${versions.length}`
          : " "}
      </Text>

      <Box marginTop={1}>
        <Text color="gray">────────────────────────────────</Text>
      </Box>
      <Text color="gray">
        <Text color="white">↑↓</Text> navigate{"  "}
        <Text color="white">enter</Text> select{"  "}
        <Text color="white">esc</Text> cancel
      </Text>
    </Box>
  );
}
