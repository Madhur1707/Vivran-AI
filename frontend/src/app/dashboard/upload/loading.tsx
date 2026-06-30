import { Skeleton } from "@/components/ui/skeleton";

export default function UploadLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Drop zone */}
        <Skeleton className="rounded-2xl" style={{ minHeight: 320 }} />

        {/* Meeting details */}
        <div
          className="rounded-2xl border border-border bg-card flex flex-col"
          style={{ minHeight: 320 }}
        >
          <div className="p-5 border-b border-border space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="p-5 border-b border-border space-y-3">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
          <div className="p-5 flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}
