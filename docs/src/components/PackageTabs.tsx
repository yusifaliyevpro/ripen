"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

const managers = ["pnpm", "npm", "yarn", "bun"] as const;
type Manager = (typeof managers)[number];

export function PackageTabs({ pnpm, npm, yarn, bun }: { pnpm: string; npm: string; yarn: string; bun: string }) {
  const [active, setActive] = useState<Manager>("pnpm");

  const commands: Record<Manager, string> = { pnpm, npm, yarn, bun };
  const current = commands[active];

  return (
    <div className="mb-6 rounded-xl border border-border overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border bg-surface/50">
        {managers.map((pm) => (
          <button
            key={pm}
            onClick={() => setActive(pm)}
            className={`px-4 py-2 text-sm font-mono font-medium transition-colors relative cursor-pointer ${
              active === pm ? "text-orange" : "text-text-dim hover:text-text-muted"
            }`}
          >
            {pm}
            {active === pm && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange rounded-full" />}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30">
        <span className="text-text-dim text-xs font-mono flex items-center gap-1.5">
          <span className="text-text-muted">❯_</span> Terminal
        </span>
        <CopyButton text={current} />
      </div>

      {/* Code content */}
      <div className="bg-surface px-4 py-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed">
          {current.split("\n").map((line, i) => {
            // Simple syntax highlighting for shell commands
            const parts = line.match(/^(\S+)(.*)/);
            if (!parts) return <div key={i}>{line}</div>;
            const [, cmd, rest] = parts;
            return (
              <div key={i}>
                <span className="text-green">{cmd}</span>
                <span className="text-text-muted">{rest}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
