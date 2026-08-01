import { useState, useEffect } from "react";
import { loadCachedLatestVersion, saveCachedLatestVersion } from "../config";
import { fetchLatestVersion, isNewerVersion } from "../registry";
import type { PackageManager } from "../types";

export type SelfUpdateState = {
  latestVersion: string | null;
  hasUpdate: boolean;
  buildUpdateCommand: () => string;
};

export function useSelfUpdate(currentVersion: string, installManager: PackageManager): SelfUpdateState {
  // Decide synchronously from the version cached by a previous run — no network
  // wait at startup. The very first run has no cache and shows no prompt.
  const [latestVersion] = useState<string | null>(() => loadCachedLatestVersion());
  const hasUpdate = latestVersion !== null && isNewerVersion(currentVersion, latestVersion);

  // Fire-and-forget: refresh the cache on npm for the *next* run. Never blocks
  // or affects this session; failures are swallowed inside fetchLatestVersion.
  useEffect(() => {
    void fetchLatestVersion("ripencli").then((latest) => {
      if (latest) saveCachedLatestVersion(latest);
    });
  }, []);

  const buildUpdateCommand = (): string => {
    const version = latestVersion ?? "latest";
    if (installManager === "yarn") return `yarn global add ripencli@${version}`;
    if (installManager === "bun") return `bun add -g ripencli@${version}`;
    return `${installManager} add -g ripencli@${version}`;
  };

  return { latestVersion, hasUpdate, buildUpdateCommand };
}
