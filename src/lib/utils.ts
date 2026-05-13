import { exec } from "child_process";

/** Open a URL in the user's default browser (cross-platform). */
export function openInBrowser(url: string) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd);
}

/** Convert an ISO date string to a human-readable relative age like "21h", "3d", "1mo", "2y". */
export function formatAge(dateStr: string): string {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 0) return "";
  const min = 60_000, hour = 3_600_000, day = 86_400_000;
  if (ms < hour) return `${Math.floor(ms / min)}m`;
  if (ms < day) return `${Math.floor(ms / hour)}h`;
  if (ms < 30 * day) return `${Math.floor(ms / day)}d`;
  if (ms < 365 * day) return `${Math.floor(ms / (30 * day))}mo`;
  return `${Math.floor(ms / (365 * day))}y`;
}
