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
    <div className="mb-6 overflow-hidden rounded-xl border border-border">
      {/* Tabs */}
      <div className="flex border-b border-border bg-surface/50">
        {managers.map((pm) => (
          <button
            key={pm}
            onClick={() => setActive(pm)}
            className={`relative cursor-pointer px-4 py-2 font-mono text-sm font-medium transition-colors ${
              active === pm ? "text-orange" : "text-text-dim hover:text-text-muted"
            }`}
          >
            {pm}
            {active === pm && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-orange" />}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface/30 px-4 py-2">
        <span className="flex items-center gap-1.5 font-mono text-xs text-text-dim">
          <span className="text-text-muted">❯_</span> Terminal
        </span>
        <CopyButton text={current} />
      </div>

      {/* Code content */}
      <div className="overflow-x-auto bg-surface px-4 py-4">
        <pre className="font-mono text-sm leading-relaxed">
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
