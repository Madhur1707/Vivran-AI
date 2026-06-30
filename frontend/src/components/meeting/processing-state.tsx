import { Loader2 } from "lucide-react";
import { BG } from "@/lib/meeting-utils";

export function ProcessingState({ status }: { status: "queued" | "processing" }) {
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
          : "Transcribing audio and identifying speakers"}
      </p>
    </div>
  );
}

export function FailedState() {
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
        Something went wrong. Please try uploading again.
      </p>
    </div>
  );
}
