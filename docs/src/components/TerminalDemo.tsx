export function TerminalDemo() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-xl border border-border overflow-hidden shadow-2xl shadow-black/40">
        {/* Title bar */}
        <div className="bg-surface px-4 py-2.5 flex items-center gap-2 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red/80" />
            <div className="w-3 h-3 rounded-full bg-orange/80" />
            <div className="w-3 h-3 rounded-full bg-green/80" />
          </div>
          <span className="text-xs text-text-dim font-mono ml-2">
            ~/my-project
          </span>
        </div>

        {/* Terminal content */}
        <div className="bg-[#0C0C0D] px-4 py-4 font-mono text-[13px] leading-6 overflow-x-auto">
          {/* Header */}
          <div className="text-text-dim mb-1">
            <span className="text-green">$</span>{" "}
            <span className="text-text">ripen</span>
          </div>
          <div className="mb-3">
            <span className="text-orange font-bold">ripen</span>{" "}
            <span className="text-text-dim">v0.2.8</span>{" "}
            <span className="text-text-dim">·</span>{" "}
            <span className="text-text-dim">my-project</span>{" "}
            <span className="text-text-dim">·</span>{" "}
            <span className="text-text-dim">pnpm</span>
          </div>

          {/* Column headers */}
          <div className="flex text-text-dim text-xs mb-1 gap-2">
            <span className="w-6" />
            <span className="w-52">Package</span>
            <span className="w-20 text-right">Current</span>
            <span className="w-8 text-center" />
            <span className="w-20 text-right">Latest</span>
          </div>
          <div className="border-b border-border mb-1" />

          {/* Package rows */}
          <PackageRow
            selected
            name="react"
            current="18.2.0"
            latest="19.2.4"
            color="red"
          />
          <PackageRow
            selected
            name="next"
            current="15.1.0"
            latest="16.2.1"
            color="red"
          />
          <PackageRow
            name="typescript"
            current="5.4.5"
            latest="5.8.3"
            color="orange"
            cursor
          />
          <PackageRow
            name="eslint"
            current="9.0.0"
            latest="9.5.0"
            color="orange"
          />
          <PackageRow
            name="tailwindcss"
            current="4.0.0"
            latest="4.1.3"
            color="green"
          />
          <PackageRow
            name="prettier"
            current="3.4.0"
            latest="3.5.3"
            color="green"
          />

          {/* Footer */}
          <div className="mt-3 text-text-dim text-xs">
            <span className="text-text-muted">2</span> selected{" "}
            <span className="text-text-dim">·</span>{" "}
            <span className="text-text-dim">
              ↑↓ navigate · space select · v version · c changelog · enter update
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageRow({
  selected,
  name,
  current,
  latest,
  color,
  cursor,
}: {
  selected?: boolean;
  name: string;
  current: string;
  latest: string;
  color: "red" | "orange" | "green";
  cursor?: boolean;
}) {
  const colorClass = {
    red: "text-red",
    orange: "text-orange",
    green: "text-green",
  }[color];

  return (
    <div
      className={`flex items-center gap-2 py-0.5 ${
        cursor ? "bg-white/[0.03] -mx-2 px-2 rounded" : ""
      }`}
    >
      <span className="w-6 text-center">
        {cursor ? (
          <span className="text-orange">›</span>
        ) : selected ? (
          <span className="text-orange">◉</span>
        ) : (
          <span className="text-text-dim">○</span>
        )}
      </span>
      <span className={`w-52 ${cursor ? "text-text" : "text-text-muted"}`}>
        {name}
      </span>
      <span className="w-20 text-right text-text-dim">{current}</span>
      <span className={`w-8 text-center ${colorClass}`}>→</span>
      <span className={`w-20 text-right font-medium ${colorClass}`}>
        {latest}
      </span>
    </div>
  );
}
