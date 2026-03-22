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
      <div className="flex gap-0 border border-border border-b-0 rounded-t-xl bg-surface/50">
        {managers.map((pm, i) => (
          <button
            key={pm.id}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm font-mono font-medium transition-colors relative cursor-pointer ${
              active === i
                ? "text-orange"
                : "text-text-dim hover:text-text-muted"
            }`}
          >
            {pm.label}
            {active === i && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="bg-surface border border-border border-t-0 rounded-b-xl px-4 py-3 flex items-center gap-3">
        <code className="font-mono text-sm text-text-muted flex-1 overflow-x-auto min-w-[280px] text-left">
          <span className="text-green select-none">$ </span>
          {managers[active].command}
        </code>
        <CopyButton text={managers[active].command} />
      </div>
    </div>
  );
}
