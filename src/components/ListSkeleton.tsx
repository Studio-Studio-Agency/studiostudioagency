import { Skeleton } from "@/components/ui/skeleton";

const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-lg border bg-card p-4 flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-3 w-[30%]" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    ))}
  </div>
);

export default ListSkeleton;
