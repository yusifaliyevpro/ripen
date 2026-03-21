const shortcuts = [
  { keys: ["↑", "↓"], action: "Navigate packages" },
  { keys: ["Space"], action: "Toggle selection" },
  { keys: ["V"], action: "Pick specific version" },
  { keys: ["C"], action: "View changelog" },
  { keys: ["Enter"], action: "Update selected" },
  { keys: ["S"], action: "Open settings" },
  { keys: ["Esc"], action: "Go back" },
  { keys: ["Ctrl", "C"], action: "Exit" },
];

function KeyCap({ label }: { label: string }) {
  const isWide = label.length > 2;
  return (
    <kbd
      className={`inline-flex items-center justify-center ${
        isWide ? "px-2.5 min-w-[2.5rem]" : "w-8"
      } h-8 rounded-md border border-border-bright bg-surface text-xs font-mono font-medium text-text-muted shadow-[0_2px_0_0] shadow-border`}
    >
      {label}
    </kbd>
  );
}

export function KeyboardShortcuts() {
  return (
    <section className="py-24 sm:py-32 border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-4">
          Control everything from the keyboard
        </h2>
        <p className="text-text-muted text-center max-w-lg mx-auto mb-16">
          No mouse needed. Every action has a keyboard shortcut for a fast, fluid workflow.
        </p>

        <div className="max-w-lg mx-auto grid grid-cols-1 gap-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between gap-4 py-2 px-1"
            >
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-text-dim text-xs">+</span>
                    )}
                    <KeyCap label={key} />
                  </span>
                ))}
              </div>
              <span className="text-sm text-text-muted">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
