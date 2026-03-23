import { useState, useEffect } from "react";
import { execa } from "execa";
import type { PackageManager } from "../../types";
import { fetchLatestVersion, isNewerVersion } from "../../registry";

export type SelfUpdateState = {
  latestVersion: string | null;
  selfUpdating: boolean;
  selfUpdateError: string | null;
  /** True once the initial version check finishes */
  checkComplete: boolean;
  /** True when a newer version is available */
  hasUpdate: boolean;
  /** Trigger the self-update install. Returns true on success. */
  performUpdate: () => Promise<boolean>;
};

export function useSelfUpdate(currentVersion: string, installManager: PackageManager): SelfUpdateState {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [selfUpdating, setSelfUpdating] = useState(false);
  const [selfUpdateError, setSelfUpdateError] = useState<string | null>(null);
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

  const performUpdate = async (): Promise<boolean> => {
    setSelfUpdating(true);
    try {
      const updateArgs =
        installManager === "yarn"
          ? ["global", "add", `ripencli@${latestVersion}`]
          : ["add", "--global", `ripencli@${latestVersion}`];
      await execa(installManager, updateArgs);
      setSelfUpdating(false);
      return true;
    } catch (err: any) {
      setSelfUpdateError(err.message ?? "Unknown error");
      setSelfUpdating(false);
      return false;
    }
  };

  return { latestVersion, selfUpdating, selfUpdateError, checkComplete, hasUpdate, performUpdate };
}
