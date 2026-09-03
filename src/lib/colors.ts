/** ANSI color helper for plain stdout writes outside Ink (post-exit messages); inside the TUI use `<Text color>`. */
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
