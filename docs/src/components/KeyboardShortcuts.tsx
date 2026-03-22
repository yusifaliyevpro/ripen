const shortcuts = [
  { keys: ["↑", "↓"], action: "Navigate" },
  { keys: ["Space"], action: "Select" },
  { keys: ["V"], action: "Version" },
  { keys: ["C"], action: "Changelog" },
  { keys: ["Enter"], action: "Update" },
  { keys: ["S"], action: "Settings" },
  { keys: ["Esc"], action: "Go back" },
  { keys: ["Ctrl", "C"], action: "Exit" },
];

function KeyCap({ label }: { label: string }) {
  const isWide = label.length > 2;
  return (
    <kbd
      className={`inline-flex items-center justify-center ${
        isWide ? "min-w-[2.5rem] px-2.5" : "w-8"
      } h-8 rounded-md border border-border-bright bg-surface font-mono text-xs font-medium text-text-muted shadow-[0_2px_0_0] shadow-border`}
    >
      {label}
    </kbd>
  );
}

export function KeyboardShortcuts() {
  return (
    <section className="border-t border-border py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="mb-4 text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Control everything from the keyboard
        </h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-text-muted">
          No mouse needed. Every action has a keyboard shortcut for a fast, fluid workflow.
        </p>

        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-surface/50 px-3 py-5"
            >
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-xs text-text-dim">+</span>}
                    <KeyCap label={key} />
                  </span>
                ))}
              </div>
              <span className="text-xs text-text-dim">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
