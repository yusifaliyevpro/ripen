import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { fetchVersions, type RegistryVersion } from "../registry";
import type { OutdatedPackage } from "../fetcher";

interface Props {
  pkg: OutdatedPackage;
  onSelect: (version: string) => void;
  onCancel: () => void;
}

export function VersionPicker({ pkg, onSelect, onCancel }: Props) {
  const [versions, setVersions] = useState<RegistryVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [scroll, setScroll] = useState(0);
  const PAGE = 12;

  useEffect(() => {
    fetchVersions(pkg.name).then((v) => {
      setVersions(v);
      // pre-select current target
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
      onSelect(versions[cursor].version);
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

      {loading ? (
        <Text color="gray"> fetching versions…</Text>
      ) : versions.length === 0 ? (
        <Text color="red"> Could not fetch versions.</Text>
      ) : (
        <>
          {visible.map((v, i) => {
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
                <Box width={10}>
                  <Text color="gray" dimColor>
                    {v.date}
                  </Text>
                </Box>
                {isLatest && <Text color="greenBright">latest</Text>}
                {isCurrent && <Text color="red">current</Text>}
              </Box>
            );
          })}

          {versions.length > PAGE && (
            <Text color="gray" dimColor>
              {"  "}showing {scroll + 1}–{Math.min(scroll + PAGE, versions.length)} of {versions.length}
            </Text>
          )}
        </>
      )}

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
