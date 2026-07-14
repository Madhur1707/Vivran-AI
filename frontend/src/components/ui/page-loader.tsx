import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function PageLoader({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] w-full flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#d4d4d8" }} />
      <p className="text-[13px] text-muted-foreground">{label}</p>
    </div>
  );
}

export { PageLoader };
