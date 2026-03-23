import { useEffect } from "react";
import type { Screen } from "../../types";

/**
 * Exit the Ink app after a delay when the screen matches one of the target screens.
 */
export function useExitOnScreen(
  screen: Screen,
  targetScreens: Screen[],
  exit: () => void,
  options?: { delay?: number; beforeExit?: () => void },
) {
  const { delay = 300, beforeExit } = options ?? {};

  useEffect(() => {
    if (!targetScreens.includes(screen)) return;
    const timer = setTimeout(() => {
      exit();
      beforeExit?.();
      process.exit(0);
    }, delay);
    return () => clearTimeout(timer);
  }, [screen]);
}
