"use client";

import { type ReactNode, useRef } from "react";
import { CopyButton } from "./CopyButton";

export function MdxCodeBlock({ children }: { children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);

  return (
    <div className="relative mb-6">
      <pre
        ref={preRef}
        className="overflow-x-auto rounded-xl border border-border bg-surface p-4 pr-12 font-mono text-sm leading-relaxed [&>code]:rounded-none [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em] [&>code]:text-text-muted"
      >
        {children}
      </pre>
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        <CopyButton getText={() => preRef.current?.textContent ?? ""} />
      </div>
    </div>
  );
}
