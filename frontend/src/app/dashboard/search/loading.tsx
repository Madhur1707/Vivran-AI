import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center pt-4 flex flex-col items-center">
        <Skeleton className="h-7 w-64 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div>
        <Skeleton className="h-3 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
