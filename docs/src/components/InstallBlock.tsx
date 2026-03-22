"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

const managers = [
  { id: "npm", label: "npm", command: "npm install -g ripencli" },
  { id: "pnpm", label: "pnpm", command: "pnpm add -g ripencli" },
  { id: "yarn", label: "yarn", command: "yarn global add ripencli" },
  { id: "bun", label: "bun", command: "bun add -g ripencli" },
] as const;

export function InstallBlock() {
  const [active, setActive] = useState(0);

  return (
    <div className="w-full max-w-xl">
      {/* Tabs */}
      <div className="flex gap-0 rounded-t-xl border border-b-0 border-border bg-surface/50">
        {managers.map((pm, i) => (
          <button
            key={pm.id}
            onClick={() => setActive(i)}
            className={`relative cursor-pointer px-4 py-2 font-mono text-sm font-medium transition-colors ${
              active === i ? "text-orange" : "text-text-dim hover:text-text-muted"
            }`}
          >
            {pm.label}
            {active === i && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-orange" />}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="flex items-center gap-3 rounded-b-xl border border-t-0 border-border bg-surface px-4 py-3">
        <code className="min-w-[280px] flex-1 overflow-x-auto text-left font-mono text-sm text-text-muted">
          <span className="text-green select-none">$ </span>
          {managers[active].command}
        </code>
        <CopyButton text={managers[active].command} />
      </div>
    </div>
  );
}
