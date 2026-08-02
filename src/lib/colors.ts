/**
 * Tiny ANSI color helper for the plain stdout writes that happen outside Ink
 * (the post-exit messages in cli.tsx). ripen only runs in an interactive
 * terminal, so colors are always applied.
 *
 * Inside the Ink TUI, use `<Text color="…">` instead — Ink handles those.
 */
function wrap(open: number, close: number) {
  return (text: string): string => `\x1b[${open}m${text}\x1b[${close}m`;
}

export const colors = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
};
