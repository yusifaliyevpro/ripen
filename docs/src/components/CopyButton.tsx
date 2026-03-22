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
    const content = getText ? getText() : text ?? "";
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 border border-border rounded-md shadow-sm bg-surface hover:bg-surface/80 text-text-muted hover:text-orange transition-colors cursor-pointer ${className}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <MdCheck className="w-4 h-4 text-green" /> : <MdContentCopy className="w-4 h-4" />}
    </button>
  );
}
