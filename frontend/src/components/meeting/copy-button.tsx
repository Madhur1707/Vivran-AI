"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={handleCopy}
      className="h-auto gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:opacity-80"
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
    </Button>
  );
}
