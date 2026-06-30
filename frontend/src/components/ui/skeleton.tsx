import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md animate-pulse", className)}
      style={{ background: "rgba(255,255,255,0.1)" }}
      {...props}
    />
  );
}

export { Skeleton };
