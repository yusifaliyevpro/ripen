export function TerminalDemo() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-border shadow-2xl shadow-black/40">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red/80" />
            <div className="h-3 w-3 rounded-full bg-orange/80" />
            <div className="h-3 w-3 rounded-full bg-green/80" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-dim">~/my-project</span>
        </div>

        {/* Terminal content */}
        <div className="overflow-x-auto bg-[#0C0C0D] px-4 py-4 font-mono text-[13px] leading-6">
          {/* App header */}
          <div className="mb-1">
            <span className="font-bold text-green"> ripen</span>{" "}
            <span className="text-text-dim">-- interactive dependency updater</span>
          </div>

          {/* Keyboard shortcuts bar */}
          <div className="mb-3 text-[11px] text-text-dim">
            <span className="text-text">↑↓</span> navigate{"  "}
            <span className="text-text">space</span> select{"  "}
            <span className="text-text">tab</span> groups{"  "}
            <span className="text-text">v</span> version{"  "}
            <span className="text-text">c</span> changelog{"  "}
            <span className="text-text">s</span> settings{"  "}
            <span className="text-text">enter</span> update
          </div>

          {/* Dependencies group */}
          <GroupHeader label="Dependencies" count={6} color="text-cyan-400" focused checkbox="□" />
          <div className="mb-2 rounded-lg border border-cyan-400/30 px-3 py-1">
            <ColumnHeaders />
            <PackageRow cursor name="react" current="18.2.0" target="19.2.4" latest="19.2.4" major />
            <PackageRow name="next" current="15.1.0" target="16.2.1" latest="16.2.1" major />
            <PackageRow selected name="motion" current="12.31.0" target="12.38.0" latest="12.38.0" />
            <div className="py-0.5 text-[11px] text-text-dim">{"  "}↓ 3 more below</div>
          </div>

          {/* Dev Dependencies group */}
          <GroupHeader label="Dev Dependencies" count={4} color="text-fuchsia-400" checkbox="□" />
          <div className="mb-2 rounded-lg border border-gray-700 px-3 py-1">
            <ColumnHeaders />
            <PackageRow name="typescript" current="5.4.5" target="5.8.3" latest="5.8.3" />
            <PackageRow name="@types/node" current="22.18.0" target="25.5.0" latest="25.5.0" major />
            <PackageRow name="eslint" current="9.0.0" target="9.5.0" latest="9.5.0" />
          </div>

          {/* Footer */}
          <div className="mt-1 flex gap-4 text-[11px]">
            <span>
              <span className="font-bold text-green">1</span>
              <span className="text-text-dim"> selected</span>
            </span>
            <span className="text-text-dim">10 outdated</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupHeader({
  label,
  count,
  color,
  focused,
  checkbox,
}: {
  label: string;
  count: number;
  color: string;
  focused?: boolean;
  checkbox: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-green">{focused ? "❯" : " "}</span>
      <span className="text-text-dim">{checkbox}</span>
      <span className={`${color} ${focused ? "font-bold" : ""}`}>{label}</span>
      <span className="text-text-dim">({count})</span>
    </div>
  );
}

function ColumnHeaders() {
  return (
    <div className="flex gap-4 py-0.5 text-[11px] text-text-dim">
      <span className="w-5" />
      <span className="w-32">package</span>
      <span className="w-20">current</span>
      <span className="w-20">target</span>
      <span className="w-20">latest</span>
      <span className="w-16" />
    </div>
  );
}

function PackageRow({
  selected,
  cursor,
  name,
  current,
  target,
  latest,
  major,
}: {
  selected?: boolean;
  cursor?: boolean;
  name: string;
  current: string;
  target: string;
  latest: string;
  major?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 py-0.5 ${cursor ? "-mx-1 rounded bg-white/4 px-1" : ""}`}>
      <span className="w-5 shrink-0 text-center">
        {cursor ? <span className="text-green">❯</span> : <span className="inline-block w-2" />}
      </span>
      <span className={selected ? "text-green" : "text-text-dim"}>{selected ? "◉" : "○"}</span>
      <span className={`w-32 ${cursor ? "font-bold text-text" : "text-text-muted"}`}>{name}</span>
      <span className="w-20 text-red">{current}</span>
      <span className="w-20 text-green">{target}</span>
      <span className="w-20 text-text-dim">{latest}</span>
      <span className="w-16">{major && <span className="text-[11px] text-yellow-400">⚠ major</span>}</span>
    </div>
  );
}
