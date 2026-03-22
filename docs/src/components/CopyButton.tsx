"use client";

import { useState } from "react";
import { MdCheck, MdContentCopy } from "react-icons/md";

export function CopyButton({
  text,
  getText,
  className = "",
}: {
  text?: string;
  getText?: () => string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const content = getText ? getText() : (text ?? "");
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`cursor-pointer rounded-md border border-border bg-surface p-1.5 text-text-muted shadow-sm transition-colors hover:bg-surface/80 hover:text-orange ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <MdCheck className="h-4 w-4 text-green" /> : <MdContentCopy className="h-4 w-4" />}
    </button>
  );
}
