import { useRef, useEffect, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import type { ChangelogEntry, OutdatedPackage } from "../types";
import { openInBrowser } from "../lib/utils";
import { MarkdownLine } from "./MarkdownLine";
import { fetchChangelog, fetchRepoUrl } from "../registry";

type Props = {
  pkg: OutdatedPackage;
  onClose: () => void;
};

export function ChangelogPanel({ pkg, onClose }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [activeEntry, setActiveEntry] = useState(0);
  const scrollRef = useRef<ScrollViewRef>(null);
  const { stdout } = useStdout();

  const isUpToDate = pkg.current === (pkg.targetVersion ?? pkg.latest);

  useEffect(() => {
    Promise.all([
      fetchChangelog(pkg.name, isUpToDate ? "" : pkg.current, pkg.targetVersion ?? pkg.latest),
      fetchRepoUrl(pkg.name),
    ]).then(([e, repo]) => {
      setEntries(e);
      // Up-to-date: start at latest (last entry). Outdated: start at oldest change (first entry).
      setActiveEntry(isUpToDate ? Math.max(0, e.length - 1) : 0);
      setRepoUrl(repo);
      setLoading(false);
    });
  }, [pkg.name]);

  useEffect(() => {
    const handleResize = () => scrollRef.current?.remeasure();
    stdout?.on("resize", handleResize);
    return () => {
      stdout?.off("resize", handleResize);
    };
  }, [stdout]);

  const releasesPageUrl = repoUrl ? `${repoUrl}/releases` : "";

  const triggerOpen = (url: string) => {
    openInBrowser(url);
    setOpened(true);
    setTimeout(() => setOpened(false), 2000);
  };

  const currentEntry = entries[activeEntry];

  const clampedScrollBy = (delta: number) => {
    const sv = scrollRef.current;
    if (!sv) return;
    const maxOffset = sv.getBottomOffset();
    const current = sv.getScrollOffset();
    const target = Math.max(0, Math.min(maxOffset, current + delta));
    sv.scrollTo(target);
  };

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "c") {
      onClose();
      return;
    }
    // Left/Right: switch between releases
    if (key.leftArrow && entries.length > 1) {
      scrollRef.current?.scrollTo(0);
      setActiveEntry((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.rightArrow && entries.length > 1) {
      scrollRef.current?.scrollTo(0);
      setActiveEntry((prev) => Math.min(entries.length - 1, prev + 1));
      return;
    }
    if (key.upArrow) clampedScrollBy(-1);
    if (key.downArrow) clampedScrollBy(1);
    if (key.pageUp) clampedScrollBy(-(scrollRef.current?.getViewportHeight() ?? 10));
    if (key.pageDown) clampedScrollBy(scrollRef.current?.getViewportHeight() ?? 10);
    if (input === "r" && releasesPageUrl) triggerOpen(releasesPageUrl);
    if (input === "o" && currentEntry?.url) triggerOpen(currentEntry.url);
  });

  const targetVer = pkg.targetVersion ?? pkg.latest;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="magentaBright">
          {" "}
          Changelog — <Text color="whiteBright">{pkg.name}</Text>
        </Text>
        <Text color="gray">
          {"  "}
          <Text color="red">{pkg.current}</Text>
          <Text color="gray"> → </Text>
          <Text color="greenBright">{targetVer}</Text>
        </Text>
        <Text color="gray">────────────────────────────────────────────────────</Text>
      </Box>

      {/* Release navigator */}
      {entries.length > 1 && !loading && (
        <Box marginBottom={1} gap={1}>
          <Text color="gray">
            {"  "}
            {activeEntry > 0 ? <Text color="white">←</Text> : <Text>←</Text>}{" "}
            <Text color="cyanBright" bold>
              {currentEntry?.version ?? ""}
            </Text>{" "}
            <Text>
              ({activeEntry + 1}/{entries.length})
            </Text>{" "}
            {activeEntry < entries.length - 1 ? <Text color="white">→</Text> : <Text>→</Text>}
          </Text>
        </Box>
      )}

      {/* Scrollable body */}
      {loading ? (
        <Text color="gray"> fetching release notes…</Text>
      ) : entries.length === 0 ? (
        <Box flexDirection="column">
          <Text color="gray"> No GitHub release notes found between these versions.</Text>
          {releasesPageUrl ? (
            <Text color="gray">
              {" "}
              Press <Text color="white">r</Text> to open releases page in browser.
            </Text>
          ) : (
            <Text color="gray"> Check the package repository manually.</Text>
          )}
        </Box>
      ) : currentEntry ? (
        <Box height={Math.min(currentEntry.body.split("\n").length, 18)} flexDirection="column">
          <ScrollView ref={scrollRef}>
            <Box flexDirection="column">
              {currentEntry.body.split("\n").map((line, j) => (
                <MarkdownLine key={j} line={line} repoUrl={repoUrl} />
              ))}
            </Box>
          </ScrollView>
        </Box>
      ) : null}

      {/* Footer */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">────────────────────────────────────────────────────</Text>
        <Box gap={3}>
          <Text color="gray">
            <Text color="white">↑↓</Text> scroll
          </Text>
          {entries.length > 1 && (
            <Text color="gray">
              <Text color="white">←→</Text> releases
            </Text>
          )}
          <Text color="gray">
            <Text color="white">PgUp/Dn</Text> fast
          </Text>
          {currentEntry?.url && (
            <Text color="gray">
              <Text color="white">o</Text> open release
            </Text>
          )}
          {releasesPageUrl && (
            <Text color="gray">
              <Text color="white">r</Text> all releases
            </Text>
          )}
          <Text color="gray">
            <Text color="white">esc</Text> close
          </Text>
        </Box>
        {opened && <Text color="greenBright"> ✓ opened in browser</Text>}
      </Box>
    </Box>
  );
}
