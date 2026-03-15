"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
      title={label}
    >
      {copied ? (
        <>
          <Check className="size-3 text-green-600" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
