"use client";

import { useRef, type ReactNode } from "react";
import { CopyButton } from "./CopyButton";

export function MdxCodeBlock({ children }: { children: ReactNode }) {
  const preRef = useRef<HTMLPreElement>(null);

  return (
    <div className="relative mb-6">
      <pre
        ref={preRef}
        className="bg-surface border border-border rounded-xl p-4 pr-12 overflow-x-auto text-sm font-mono leading-relaxed [&>code]:bg-transparent [&>code]:border-0 [&>code]:p-0 [&>code]:rounded-none [&>code]:text-text-muted [&>code]:text-[1em]"
      >
        {children}
      </pre>
      <div className="absolute top-1/2 right-3 -translate-y-1/2">
        <CopyButton getText={() => preRef.current?.textContent ?? ""} />
      </div>
    </div>
  );
}
