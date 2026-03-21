"use client";

import { useState } from "react";
import { VscCheck, VscCopy } from "react-icons/vsc";

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`text-text-muted hover:text-orange transition-colors cursor-pointer ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <VscCheck className="w-4 h-4 text-green" /> : <VscCopy className="w-4 h-4" />}
    </button>
  );
}
