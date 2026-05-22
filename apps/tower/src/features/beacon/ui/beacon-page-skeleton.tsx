import { PageHeaderSkeleton } from "@/shared/ui/page-header-skeleton";
import { Skeleton } from "@/shared/ui/skeleton";
import { SkeletonStatus } from "@/shared/ui/skeleton-status";

function BeaconPageSkeleton() {
  return (
    <SkeletonStatus label="Loading Beacon settings">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <PageHeaderSkeleton descriptionLines={2} />
        <div className="mt-8 space-y-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </main>
    </SkeletonStatus>
  );
}

export { BeaconPageSkeleton };
