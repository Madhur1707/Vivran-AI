import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-5" />
            <div className="flex items-center gap-4 mb-5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex -space-x-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-6 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
