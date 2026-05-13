import { useState, useEffect } from "react";
import type { PackageManager } from "../../types";
import { fetchLatestVersion, isNewerVersion } from "../../registry";

export type SelfUpdateState = {
  latestVersion: string | null;
  checkComplete: boolean;
  hasUpdate: boolean;
  buildUpdateCommand: () => string;
};

export function useSelfUpdate(currentVersion: string, installManager: PackageManager): SelfUpdateState {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [checkComplete, setCheckComplete] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLatestVersion("ripencli").then((latest) => {
      if (cancelled) return;
      if (latest && isNewerVersion(currentVersion, latest)) {
        setLatestVersion(latest);
        setHasUpdate(true);
      }
      setCheckComplete(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildUpdateCommand = (): string => {
    const version = latestVersion ?? "latest";
    if (installManager === "yarn") return `yarn global add ripencli@${version}`;
    if (installManager === "bun") return `bun add -g ripencli@${version}`;
    return `${installManager} add -g ripencli@${version}`;
  };

  return { latestVersion, checkComplete, hasUpdate, buildUpdateCommand };
}
