import { Skeleton } from "@/components/ui/skeleton";

export default function MeetingLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-64 mb-3" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>

      {/* Tabs row */}
      <div className="flex items-center gap-6 border-b border-border pb-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 mb-2" />
        ))}
      </div>

      {/* Transcript card */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="p-5 space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
