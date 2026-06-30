"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
      style={{
        background: copied ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.1)",
        color: copied ? "#34d399" : "#d4d4d8",
      }}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        "Copy to clipboard"
      )}
    </button>
  );
}
