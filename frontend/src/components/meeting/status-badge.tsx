import { Loader2 } from "lucide-react";
import { MONO, statusConfig } from "@/lib/meeting-utils";

export function StatusBadge({ status }: { status: string }) {
  const st = statusConfig[status] ?? statusConfig.queued;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
      style={{ background: st.bg }}
    >
      {status === "processing" ? (
        <Loader2
          className="h-3 w-3 animate-spin"
          style={{ color: st.color }}
        />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
      )}
      <span
        className="text-[11px] font-medium"
        style={{ color: st.color, ...MONO }}
      >
        {st.label}
      </span>
    </div>
  );
}
