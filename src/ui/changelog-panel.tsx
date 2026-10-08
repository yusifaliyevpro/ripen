import { Box, Text, useBoxMetrics, useInput, useWindowSize, type DOMElement } from "ink";
import { useRef, useEffect, useState } from "react";
import { openInBrowser } from "../lib/utils";
import { fetchChangelog, fetchRepoUrl } from "../registry";
import type { ChangelogEntry, OutdatedPackage } from "../types";
import { MarkdownLine } from "./markdown-line";

type Props = {
  pkg: OutdatedPackage;
  onClose: () => void;
  onError: (message: string) => void;
};

export function ChangelogPanel({ pkg, onClose, onError }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [rateLimited, setRateLimited] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState(false);
  const [activeEntry, setActiveEntry] = useState(0);
  const [requestedScrollTop, setRequestedScrollTop] = useState(0);
  const contentRef = useRef<DOMElement>(null);
  const { height: contentHeight, hasMeasured } = useBoxMetrics(contentRef);
  const { rows } = useWindowSize();

  const isUpToDate = pkg.current === pkg.latest;

  useEffect(() => {
    Promise.all([fetchChangelog(pkg.name, isUpToDate ? "" : pkg.current, pkg.latest), fetchRepoUrl(pkg.name)])
      .then(([result, repo]) => {
        setEntries(result.entries);
        setRateLimited(result.rateLimited ?? false);
        // Up-to-date: start at latest (last entry). Outdated: start at oldest change (first entry).
        setActiveEntry(isUpToDate ? Math.max(0, result.entries.length - 1) : 0);
        setRepoUrl(repo);
        setLoading(false);
      })
      .catch((err: unknown) => {
        onError(err instanceof Error ? err.message : String(err));
      });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.name]);

  const releasesPageUrl = repoUrl ? `${repoUrl}/releases` : "";

  const triggerOpen = (url: string) => {
    openInBrowser(url);
    setOpened(true);
    setTimeout(() => setOpened(false), 2000);
  };

  const currentEntry = entries[activeEntry];

  const targetVer = pkg.latest;

  // Reserve rows for the chrome so the body fits: header 5 + navigator 2 (when >1 entry) + footer 3 + 1 safety.
  const navigatorHeight = entries.length > 1 ? 2 : 0;
  const chromeHeight = 5 + navigatorHeight + 3 + 1;
  // Size the body from the window, not the content, so the chrome stays put across releases of differing length.
  const bodyHeight = Math.max(3, rows - chromeHeight);

  // Clamp on every render: the max shrinks when the notes get shorter or the terminal taller.
  const maxScrollTop = Math.max(0, contentHeight - bodyHeight);
  const scrollTop = Math.min(requestedScrollTop, maxScrollTop);
  const scrollBy = (delta: number) =>
    setRequestedScrollTop((prev) => {
      const next = Math.max(0, Math.min(prev, maxScrollTop) + delta);
      // Metrics land an effect after the notes first render; don't drop keys pressed before that.
      return hasMeasured ? Math.min(maxScrollTop, next) : next;
    });

  useInput((input, key) => {
    if (key.escape || input === "q" || input === "c") {
      onClose();
      return;
    }
    // Left/Right: switch between releases
    if (key.leftArrow && entries.length > 1) {
      setRequestedScrollTop(0);
      setActiveEntry((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.rightArrow && entries.length > 1) {
      setRequestedScrollTop(0);
      setActiveEntry((prev) => Math.min(entries.length - 1, prev + 1));
      return;
    }
    if (key.upArrow) scrollBy(-1);
    if (key.downArrow) scrollBy(1);
    if (key.pageUp) scrollBy(-bodyHeight);
    if (key.pageDown) scrollBy(bodyHeight);
    if (input === "r" && releasesPageUrl) triggerOpen(releasesPageUrl);
    if (input === "o" && currentEntry?.url) triggerOpen(currentEntry.url);
  });

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box flexDirection="column" marginTop={1} marginBottom={1}>
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

      {/* Scrollable body — fixed height in every state (loading, error, notes) so
          the surrounding header/navigator/footer never shift as the panel loads. */}
      <Box height={bodyHeight} flexDirection="column" overflow="hidden" contentOffsetY={scrollTop}>
        {loading ? (
          <Text color="gray"> fetching release notes…</Text>
        ) : rateLimited ? (
          <Box flexDirection="column">
            <Text color="yellow"> GitHub rate limit reached (60 requests/hour for unauthenticated use).</Text>
            <Text color="gray"> Install the GitHub CLI and log in to raise the limit to 5,000/hour:</Text>
            <Text color="gray">
              {"   "}
              <Text color="white">gh auth login</Text> — https://cli.github.com
            </Text>
            {releasesPageUrl && (
              <Text color="gray">
                {" "}
                Or press <Text color="white">r</Text> to open the releases page in browser.
              </Text>
            )}
          </Box>
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
          // flexShrink={0} keeps the notes at their natural height so they can overflow the viewport.
          <Box ref={contentRef} flexDirection="column" flexShrink={0}>
            {currentEntry.body.split("\n").map((line, j) => (
              <MarkdownLine key={j} line={line} repoUrl={repoUrl} />
            ))}
          </Box>
        ) : null}
      </Box>

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
