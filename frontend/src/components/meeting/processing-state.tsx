"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BG } from "@/lib/meeting-utils";

export function ProcessingState({
  status,
  stage,
}: {
  status: "queued" | "processing";
  stage?: string | null;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-2xl border"
      style={{
        borderColor: "rgba(255,255,255,0.15)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#d4d4d8" }} />
      </div>
      <h3 className="text-lg font-semibold mb-1" style={BG}>
        {status === "queued"
          ? "Waiting in queue..."
          : "Processing your meeting..."}
      </h3>
      <p className="text-sm text-muted-foreground">
        {status === "queued"
          ? "Your meeting will be processed shortly"
          : stage ?? "Transcribing audio and identifying speakers"}
      </p>
    </div>
  );
}

export function FailedState({
  onRetry,
  errorDetail,
  hasTranscript,
}: {
  onRetry?: () => Promise<void>;
  errorDetail?: string | null;
  hasTranscript?: boolean;
}) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      toast.error("Could not restart processing. Is the backend running?");
      setRetrying(false);
    }
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-2xl border"
      style={{
        borderColor: "rgba(239,68,68,0.2)",
        background:
          "linear-gradient(180deg, rgba(239,68,68,0.04) 0%, transparent 100%)",
      }}
    >
      <h3 className="text-lg font-semibold mb-1" style={{ ...BG, color: "#f87171" }}>
        Processing failed
      </h3>
      <p className="text-sm text-muted-foreground">
        {hasTranscript
          ? "The transcript is safe — retrying will only redo the analysis."
          : "Something went wrong while processing this meeting."}
      </p>
      {errorDetail && (
        <p className="mt-3 max-w-xl px-6 text-center text-xs text-muted-foreground/70 wrap-break-word">
          {errorDetail}
        </p>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={handleRetry}
          disabled={retrying}
        >
          {retrying ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Restarting...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Retry processing
            </>
          )}
        </Button>
      )}
    </div>
  );
}
